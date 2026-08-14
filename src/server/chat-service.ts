import { GoogleGenAI } from '@google/genai';
import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../lib/supabase/env';
import {
  geminiAnswerSchema,
  type ChatFallbackReason,
  type ChatIntent,
  type ChatRequest,
  type ChatResponse,
  type Citation,
  type ProgramRecommendation,
  type RecommendationProfile,
  type TourPlan
} from '../chat';
import { isSceneId, localizeContent, type ProgramContent, type PublicContentSnapshot } from '../content';
import { getScene, localize, type Locale, type SceneId } from '../tour-data';
import {
  buildTourDestinationCatalog,
  findShortestTourPath,
  findTourDestinationCandidates
} from '../tour-routing';

export interface KnowledgeDocument {
  readonly citation: Citation;
  readonly sceneId?: SceneId;
  readonly text: string;
}

interface ValidatedGeminiAnswer {
  readonly intent: ChatIntent;
  readonly answered: boolean;
  readonly answer: string;
  readonly citations: readonly Citation[];
  readonly relatedSceneIds: readonly SceneId[];
  readonly destinationSceneId?: SceneId;
  readonly programRecommendations: readonly ProgramRecommendation[];
}

const MAX_CONTEXT_CHARACTERS = 80_000;
const GEMINI_TIMEOUT_MS = 25_000;
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

function sourceUrl(source: { readonly url?: string }): string | undefined {
  return source.url;
}

function localizedTags(tags: ProgramContent['interestTags'] | ProgramContent['careerTags']): string {
  if (!tags) return '-';
  return `TH: ${tags.th.join(', ')} / EN: ${tags.en.join(', ')}`;
}

export function buildKnowledgeDocuments(content: PublicContentSnapshot): KnowledgeDocument[] {
  const facultyById = new Map(content.faculties.map((faculty) => [faculty.id, faculty]));
  const facultyManagedHotspots = new Set(content.faculties.flatMap((faculty) => (
    faculty.hotspotId ? [faculty.hotspotId] : []
  )));
  return [
    ...content.faculties.map((item): KnowledgeDocument => ({
      citation: { id: item.id, kind: 'faculty', title: item.name, url: sourceUrl(item.source) },
      sceneId: item.sceneId,
      text: `FACULTY ${item.slug}\nTH: ${item.name.th}\n${item.summary.th}\n${item.description.th}\nEN: ${item.name.en}\n${item.summary.en}\n${item.description.en}`
    })),
    ...content.programs.map((item): KnowledgeDocument => {
      const faculty = facultyById.get(item.facultyId);
      return {
        citation: { id: item.id, kind: 'program', title: item.name, url: sourceUrl(item.source) },
        sceneId: faculty?.sceneId,
        text: `PROGRAM ${item.slug}\nFACULTY: ${faculty?.name.th ?? '-'} / ${faculty?.name.en ?? '-'}\nDEPARTMENT: ${item.department?.th ?? '-'} / ${item.department?.en ?? '-'}\nINTEREST TAGS: ${localizedTags(item.interestTags)}\nCAREER TAGS: ${localizedTags(item.careerTags)}\nTH: ${item.name.th} (${item.level.th})\n${item.summary.th}\n${item.description.th}\nการรับสมัคร: ${item.admission.th}\nEN: ${item.name.en} (${item.level.en})\n${item.summary.en}\n${item.description.en}\nAdmission: ${item.admission.en}`
      };
    }),
    ...content.activities.map((item): KnowledgeDocument => ({
      citation: { id: item.id, kind: 'activity', title: item.title, url: sourceUrl(item.source) },
      sceneId: item.sceneId,
      text: `ACTIVITY ${item.slug}\nTH: ${item.title.th}\n${item.summary.th}\n${item.description.th}\nEN: ${item.title.en}\n${item.summary.en}\n${item.description.en}\nDATE: ${item.startDate ?? '-'} to ${item.endDate ?? '-'}`
    })),
    ...content.hotspots.filter((item) => !facultyManagedHotspots.has(item.hotspotId)).map((item): KnowledgeDocument => ({
      citation: { id: item.id, kind: 'hotspot', title: item.title, url: sourceUrl(item.reference) },
      sceneId: item.sceneId,
      text: `PLACE ${item.hotspotId} at scene ${item.sceneId}\nTH: ${item.title.th}\n${item.description.th}\nEN: ${item.title.en}\n${item.description.en}`
    }))
  ];
}

function tokens(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((token) => token.length > 1) ?? [];
}

function compactLookup(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function includesCode(question: string, code: string): boolean {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(question);
}

function facultyLookupTerms(name: string, slug: string): string[] {
  const withoutPrefix = name.replace(/^คณะ/u, '').trim();
  const firstThaiPart = withoutPrefix.split('และ')[0]?.trim();
  const withoutEnglishPrefix = name.replace(/^faculty\s+of\s+/i, '').trim();
  const firstEnglishPart = withoutEnglishPrefix.split(/\s+and\s+/i)[0]?.trim();
  return [name, withoutPrefix, firstThaiPart ? `คณะ${firstThaiPart}` : '', withoutEnglishPrefix, firstEnglishPart ?? '', slug]
    .map(compactLookup)
    .filter((term) => term.length >= 6);
}

function mentionedProgramIds(question: string, content: PublicContentSnapshot): string[] {
  const compactQuestion = compactLookup(question);
  return content.programs.flatMap((program) => {
    const code = program.name.en.match(/\(([^)]+)\)\s*$/)?.[1];
    const named = [program.name.th, program.name.en, program.slug]
      .map(compactLookup)
      .some((name) => name.length >= 6 && compactQuestion.includes(name));
    return named || (code && includesCode(question, code)) ? [program.id] : [];
  });
}

export function findRelatedProgramIds(
  request: ChatRequest,
  content: PublicContentSnapshot,
  citations: readonly Citation[] = []
): string[] {
  const validProgramIds = new Set(content.programs.map((program) => program.id));
  const specificProgramIds = new Set(mentionedProgramIds(request.message, content));
  if (specificProgramIds.size > 0) {
    return content.programs.flatMap((program) => specificProgramIds.has(program.id) ? [program.id] : []);
  }

  const compactQuestion = compactLookup(request.message);
  const facultyIds = new Set(citations.flatMap((citation) => (
    citation.kind === 'faculty' && content.faculties.some((faculty) => faculty.id === citation.id)
      ? [citation.id]
      : []
  )));
  for (const faculty of content.faculties) {
    const terms = [
      ...facultyLookupTerms(faculty.name.th, faculty.slug),
      ...facultyLookupTerms(faculty.name.en, faculty.slug)
    ];
    if (terms.some((term) => compactQuestion.includes(term))) facultyIds.add(faculty.id);
  }

  const hasAcademicIntent = /(คณะ|หลักสูตร|สาขา|เปิดสอน|เรียน|faculty|program|course|degree|study)/iu.test(request.message);
  if (facultyIds.size === 0 && hasAcademicIntent) {
    for (const faculty of content.faculties) {
      if (faculty.sceneId === request.sceneId) facultyIds.add(faculty.id);
    }
  }

  if (facultyIds.size === 0 && /(หลักสูตร|เปิดสอน|program|course|degree)/iu.test(request.message)) {
    return content.programs.map((program) => program.id);
  }
  if (facultyIds.size > 0) {
    return content.programs.flatMap((program) => facultyIds.has(program.facultyId) ? [program.id] : []);
  }

  const citedProgramIds = new Set(citations.flatMap((citation) => (
    citation.kind === 'program' && validProgramIds.has(citation.id) ? [citation.id] : []
  )));
  return content.programs.flatMap((program) => citedProgramIds.has(program.id) ? [program.id] : []);
}

function selectKnowledge(
  documents: readonly KnowledgeDocument[],
  question: string,
  sceneId: SceneId,
  includeAllPrograms = false
): KnowledgeDocument[] {
  const queryTokens = new Set(tokens(question));
  const ranked = documents.map((document, index) => ({
    document,
    index,
    score: (document.sceneId === sceneId ? 100 : 0)
      + tokens(document.text).reduce((score, token) => score + (queryTokens.has(token) ? 3 : 0), 0)
      + (includeAllPrograms && document.citation.kind === 'program' ? 1_000 : 0)
  })).sort((a, b) => b.score - a.score || a.index - b.index);

  const selected: KnowledgeDocument[] = [];
  let length = 0;
  for (const { document } of ranked) {
    if (selected.length >= (includeAllPrograms ? 60 : 24) || length + document.text.length > MAX_CONTEXT_CHARACTERS) continue;
    selected.push(document);
    length += document.text.length;
  }
  return selected;
}

function isRecommendationIntent(message: string): boolean {
  return /(แนะนำ.*(หลักสูตร|สาขา)|ควรเรียน|เหมาะกับ.*สาขา|สนใจ.*เรียน|recommend.*(program|course)|what should i study)/iu.test(message);
}

function isTourIntent(message: string): boolean {
  return /(พา.*ไป|นำทาง|เส้นทางไป|อยากไป|ไปยัง|ไปที่|guide me|take me|navigate|route to|how.*get to)/iu.test(message);
}

function profileLookupText(profile: RecommendationProfile): string {
  const qualification = {
    m3: 'ม.3 lower secondary school',
    'm6-pvoc': 'ม.6 ปวช upper secondary vocational certificate',
    'high-vocational': 'ปวส higher vocational diploma',
    bachelor: 'ปริญญาตรี bachelor degree',
    other: 'วุฒิอื่น other qualification'
  }[profile.currentQualification];
  const level = {
    vocational: 'อาชีวศึกษา vocational',
    bachelor: 'ปริญญาตรี bachelor',
    transfer: 'เทียบโอน transfer',
    master: 'ปริญญาโท master',
    unsure: 'ยังไม่แน่ใจ unsure'
  }[profile.desiredLevel];
  return `${profile.interests} ${qualification} ${level}`;
}

function localizedFallbackReason(reason: ChatFallbackReason, locale: Locale): string {
  const messages: Record<ChatFallbackReason, { th: string; en: string }> = {
    'not-configured': {
      th: 'ระบบ AI ยังตั้งค่าไม่ครบ แต่คุณยังใช้ข้อมูลและเครื่องมือนำทางด้านล่างได้',
      en: 'The AI service is not fully configured, but the information and navigation tools below are still available.'
    },
    'invalid-key': {
      th: 'Gemini API key ถูกปฏิเสธ กรุณาให้ผู้ดูแลตรวจสอบสถานะ AI ส่วนข้อมูลและการนำทางด้านล่างยังใช้งานได้',
      en: 'The Gemini API key was rejected. An administrator should check AI status; the information and navigation tools below remain available.'
    },
    'quota-exceeded': {
      th: 'โควตา AI วันนี้เต็มแล้ว แต่ข้อมูลและการนำทางที่ตรวจสอบจากระบบยังใช้งานได้',
      en: 'Today’s AI quota has been reached, but verified information and navigation remain available.'
    },
    'model-unavailable': {
      th: 'ไม่สามารถเชื่อมต่อบริการ AI ได้ชั่วคราว แต่ข้อมูลและการนำทางด้านล่างยังใช้งานได้',
      en: 'The AI service is temporarily unavailable, but the information and navigation tools below remain available.'
    },
    timeout: {
      th: 'AI ใช้เวลาตอบนานเกินไป กรุณาลองใหม่ โดยข้อมูลและการนำทางด้านล่างยังใช้งานได้',
      en: 'The AI response timed out. Please try again; the information and navigation tools below remain available.'
    },
    'invalid-response': {
      th: 'AI ส่งคำตอบที่ตรวจสอบไม่ได้ ระบบจึงแสดงเฉพาะข้อมูลที่ยืนยันได้',
      en: 'The AI returned an unverifiable response, so only validated information is shown.'
    },
    'no-content': {
      th: 'ยังไม่มีข้อมูลที่เผยแพร่เพียงพอสำหรับคำถามนี้',
      en: 'There is not enough published information to answer this question.'
    }
  };
  return messages[reason][locale];
}

function recommendationReason(program: ProgramContent, profile: RecommendationProfile, locale: Locale): string {
  const tag = program.interestTags?.[locale][0] ?? program.careerTags?.[locale][0];
  if (locale === 'th') {
    return tag
      ? `เนื้อหาหลักสูตรเกี่ยวข้องกับ “${tag}” ซึ่งสอดคล้องกับความสนใจ “${profile.interests}”`
      : `ชื่อ สรุป และรายละเอียดหลักสูตรมีเนื้อหาที่สอดคล้องกับความสนใจ “${profile.interests}” และระดับการศึกษาที่ระบุ`;
  }
  return tag
    ? `The program covers “${tag}”, which aligns with the interest in “${profile.interests}”.`
    : `The program name, summary, and details align with “${profile.interests}” and the selected study level.`;
}

function programLevelScore(program: ProgramContent, profile: RecommendationProfile): number {
  const level = `${program.level.th} ${program.level.en} ${program.name.th} ${program.name.en}`.toLocaleLowerCase();
  const admission = `${program.admission.th} ${program.admission.en}`.toLocaleLowerCase();
  const signals = {
    vocational: /(ประกาศนียบัตร|ปวช|อาชีว|vocational|school.?factory|โรงเรียน.?โรงงาน)/u.test(level),
    transfer: /(เทียบโอน|ต่อเนื่อง|transfer|continuing)/u.test(level),
    master: /(ปริญญาโท|มหาบัณฑิต|master)/u.test(level),
    bachelor: /(ปริญญาตรี|บัณฑิต|bachelor)/u.test(level)
  };
  let score = 0;
  if (profile.desiredLevel !== 'unsure') {
    score += signals[profile.desiredLevel] ? 240 : -80;
    if (profile.desiredLevel === 'bachelor' && signals.transfer) score -= 100;
  }
  const qualificationMatch = {
    m3: signals.vocational || /(ม\.\s*3|lower secondary)/u.test(admission),
    'm6-pvoc': signals.bachelor && !signals.transfer && /(ม\.\s*6|ปวช|upper secondary|vocational certificate)/u.test(admission),
    'high-vocational': signals.transfer || /(ปวส|higher vocational)/u.test(admission),
    bachelor: signals.master || /(ปริญญาตรี|bachelor)/u.test(admission),
    other: true
  }[profile.currentQualification];
  return score + (qualificationMatch ? 120 : 0);
}

export function rankProgramsForProfile(
  profile: RecommendationProfile,
  content: PublicContentSnapshot,
  locale: Locale,
  limit = 3
): ProgramRecommendation[] {
  const queryTokens = new Set(tokens(profileLookupText(profile)));
  const scored = content.programs.map((program, index) => {
    const weighted = [
      { value: [...(program.interestTags?.th ?? []), ...(program.interestTags?.en ?? [])].join(' '), weight: 14 },
      { value: [...(program.careerTags?.th ?? []), ...(program.careerTags?.en ?? [])].join(' '), weight: 12 },
      { value: `${program.name.th} ${program.name.en} ${program.department?.th ?? ''} ${program.department?.en ?? ''}`, weight: 7 },
      { value: `${program.summary.th} ${program.summary.en} ${program.description.th} ${program.description.en}`, weight: 3 },
      { value: `${program.level.th} ${program.level.en} ${program.admission.th} ${program.admission.en}`, weight: 5 }
    ];
    const score = programLevelScore(program, profile) + weighted.reduce((total, entry) => total + (
      tokens(entry.value).reduce((sum, token) => sum + (queryTokens.has(token) ? entry.weight : 0), 0)
    ), 0);
    return { program, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, Math.max(1, limit)).map(({ program }) => ({
    programId: program.id,
    reason: recommendationReason(program, profile, locale)
  }));
}

function citationsForPrograms(recommendations: readonly ProgramRecommendation[], content: PublicContentSnapshot): Citation[] {
  const ids = new Set(recommendations.map((item) => item.programId));
  return content.programs.flatMap((program) => ids.has(program.id) ? [{
    id: program.id,
    kind: 'program' as const,
    title: program.name,
    url: sourceUrl(program.source)
  }] : []);
}

function citationsForScene(sceneId: SceneId, content: PublicContentSnapshot): Citation[] {
  const faculty = content.faculties.find((item) => item.sceneId === sceneId);
  if (faculty) return [{ id: faculty.id, kind: 'faculty', title: faculty.name, url: sourceUrl(faculty.source) }];
  const hotspot = content.hotspots.find((item) => item.sceneId === sceneId);
  if (hotspot) return [{ id: hotspot.id, kind: 'hotspot', title: hotspot.title, url: sourceUrl(hotspot.reference) }];
  const activity = content.activities.find((item) => item.sceneId === sceneId);
  return activity ? [{ id: activity.id, kind: 'activity', title: activity.title, url: sourceUrl(activity.source) }] : [];
}

function createTourPlan(from: SceneId, destinationSceneId: SceneId): TourPlan | undefined {
  const sceneIds = findShortestTourPath(from, destinationSceneId);
  return sceneIds ? { destinationSceneId, sceneIds } : undefined;
}

function inferFallbackIntent(request: ChatRequest): ChatIntent {
  if (request.recommendationProfile || isRecommendationIntent(request.message)) return 'program-recommendation';
  if (isTourIntent(request.message)) return 'tour';
  return 'answer';
}

export function createFallbackChatResponse(
  request: ChatRequest,
  content: PublicContentSnapshot,
  fallbackReason: ChatFallbackReason = 'not-configured'
): ChatResponse {
  const intent = inferFallbackIntent(request);
  if (intent === 'program-recommendation' && !request.recommendationProfile) {
    return {
      intent,
      answered: false,
      answer: request.locale === 'th'
        ? 'กรอกความสนใจ วุฒิปัจจุบัน และระดับที่ต้องการเรียน เพื่อให้ระบบค้นหาหลักสูตรที่เหมาะสมจากข้อมูล Admin'
        : 'Tell us your interests, current qualification, and desired study level so the system can match published programs.',
      citations: [],
      relatedSceneIds: [],
      relatedProgramIds: [],
      programRecommendations: [],
      needsRecommendationProfile: true,
      fallback: false
    };
  }

  if (intent === 'program-recommendation' && request.recommendationProfile) {
    const recommendations = rankProgramsForProfile(request.recommendationProfile, content, request.locale, 3);
    return {
      intent,
      answered: recommendations.length > 0,
      answer: recommendations.length > 0
        ? localizedFallbackReason(fallbackReason, request.locale)
        : localizedFallbackReason('no-content', request.locale),
      citations: citationsForPrograms(recommendations, content),
      relatedSceneIds: [],
      relatedProgramIds: recommendations.map((item) => item.programId),
      programRecommendations: recommendations,
      needsRecommendationProfile: false,
      fallback: true,
      fallbackReason: recommendations.length > 0 ? fallbackReason : 'no-content'
    };
  }

  if (intent === 'tour') {
    const candidates = findTourDestinationCandidates(request.message, content, request.locale);
    const destination = candidates[0];
    const isClearMatch = Boolean(destination && (
      destination.score >= 300 || destination.score >= (candidates[1]?.score ?? 0) + 20
    ));
    const tourPlan = destination && isClearMatch ? createTourPlan(request.sceneId, destination.sceneId) : undefined;
    return {
      intent,
      answered: Boolean(tourPlan),
      answer: tourPlan
        ? (request.locale === 'th'
          ? `พบเส้นทางไป ${destination?.label ?? ''} แล้ว กดเริ่มพาทัวร์เพื่อเดินทางทีละฉาก`
          : `A route to ${destination?.label ?? ''} is ready. Start the guided tour to move scene by scene.`)
        : localizedFallbackReason(fallbackReason, request.locale),
      citations: tourPlan ? citationsForScene(tourPlan.destinationSceneId, content) : [],
      relatedSceneIds: tourPlan ? [] : candidates.map((candidate) => candidate.sceneId),
      relatedProgramIds: [],
      tourPlan,
      programRecommendations: [],
      needsRecommendationProfile: false,
      fallback: true,
      fallbackReason
    };
  }

  const documents = selectKnowledge(buildKnowledgeDocuments(content), request.message, request.sceneId).slice(0, 4);
  const citations = documents.map((document) => document.citation);
  return {
    intent,
    answered: false,
    answer: documents.length ? localizedFallbackReason(fallbackReason, request.locale) : localizedFallbackReason('no-content', request.locale),
    citations,
    relatedSceneIds: [...new Set(documents.flatMap((document) => document.sceneId ? [document.sceneId] : []))],
    relatedProgramIds: findRelatedProgramIds(request, content, citations),
    programRecommendations: [],
    needsRecommendationProfile: false,
    fallback: true,
    fallbackReason: documents.length ? fallbackReason : 'no-content'
  };
}

export function validateGroundedAnswer(
  value: unknown,
  documents: readonly KnowledgeDocument[]
): ValidatedGeminiAnswer | null {
  const parsed = geminiAnswerSchema.safeParse(value);
  if (!parsed.success) return null;
  const citationById = new Map(documents.map((document) => [document.citation.id, document.citation]));
  const programIds = new Set(documents.flatMap((document) => document.citation.kind === 'program' ? [document.citation.id] : []));
  const citations = parsed.data.citationIds.flatMap((id) => {
    const citation = citationById.get(id);
    return citation ? [citation] : [];
  });
  const relatedSceneIds = parsed.data.relatedSceneIds.filter((sceneId): sceneId is SceneId => (
    isSceneId(sceneId) && documents.some((document) => document.sceneId === sceneId)
  ));
  const destinationSceneId = isSceneId(parsed.data.destinationSceneId)
    ? parsed.data.destinationSceneId
    : undefined;
  const seenPrograms = new Set<string>();
  const programRecommendations = parsed.data.programRecommendations.flatMap((item) => {
    if (!programIds.has(item.programId) || seenPrograms.has(item.programId)) return [];
    seenPrograms.add(item.programId);
    return [item];
  });
  return {
    intent: parsed.data.intent,
    answered: parsed.data.answered,
    answer: parsed.data.answer,
    citations,
    relatedSceneIds: [...new Set(relatedSceneIds)],
    destinationSceneId,
    programRecommendations
  };
}

interface QuotaResult {
  readonly allowed: boolean;
  readonly reason?: ChatFallbackReason;
}

async function consumeDailyQuota(): Promise<QuotaResult> {
  if (!isSupabaseConfigured()) return { allowed: false, reason: 'not-configured' };
  const configuredLimit = Number.parseInt(process.env.GEMINI_DAILY_LIMIT ?? '200', 10);
  const limit = Number.isFinite(configuredLimit) ? Math.max(1, configuredLimit) : 200;
  const { data, error } = await createAdminSupabaseClient().rpc('consume_ai_quota', { limit_count: limit });
  if (error) return { allowed: false, reason: 'model-unavailable' };
  return data === true ? { allowed: true } : { allowed: false, reason: 'quota-exceeded' };
}

function errorDetail(error: unknown): { readonly status?: number; readonly code?: string; readonly message: string } {
  if (!error || typeof error !== 'object') return { message: String(error) };
  const record = error as Record<string, unknown>;
  return {
    status: typeof record.status === 'number' ? record.status : undefined,
    code: typeof record.code === 'string' || typeof record.code === 'number' ? String(record.code) : undefined,
    message: typeof record.message === 'string' ? record.message : String(error)
  };
}

export function classifyGeminiError(error: unknown): ChatFallbackReason {
  const detail = errorDetail(error);
  const message = detail.message.toLocaleLowerCase();
  if (detail.status === 429 || /quota|rate.?limit|resource_exhausted/u.test(message)) return 'quota-exceeded';
  if (detail.status === 401 || detail.status === 403 || /api.?key|unauthenticated|permission_denied/u.test(message)) return 'invalid-key';
  if (detail.status === 404 || /model.*not found|unknown model/u.test(message)) return 'model-unavailable';
  if (/timeout|timed out|abort/u.test(message) || (error instanceof Error && error.name === 'AbortError')) return 'timeout';
  return 'model-unavailable';
}

function logGeminiFailure(error: unknown, reason: ChatFallbackReason, model: string): void {
  const detail = errorDetail(error);
  console.error('[chat] Gemini request failed', { reason, model, status: detail.status, code: detail.code });
}

function recommendationProfilePrompt(profile?: RecommendationProfile): string {
  if (!profile) return '(none)';
  return `INTERESTS: ${profile.interests}\nCURRENT QUALIFICATION: ${profile.currentQualification}\nDESIRED LEVEL: ${profile.desiredLevel}`;
}

export async function answerGroundedQuestion(
  request: ChatRequest,
  content: PublicContentSnapshot
): Promise<ChatResponse> {
  if (isRecommendationIntent(request.message) && !request.recommendationProfile) {
    return createFallbackChatResponse(request, content);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return createFallbackChatResponse(request, content, 'not-configured');
  }

  const recommendationIntent = Boolean(request.recommendationProfile) || isRecommendationIntent(request.message);
  const documents = selectKnowledge(
    buildKnowledgeDocuments(content),
    request.recommendationProfile ? `${request.message} ${profileLookupText(request.recommendationProfile)}` : request.message,
    request.sceneId,
    recommendationIntent
  );
  if (documents.length === 0) return createFallbackChatResponse(request, content, 'no-content');

  const quota = await consumeDailyQuota();
  if (!quota.allowed) return createFallbackChatResponse(request, content, quota.reason ?? 'quota-exceeded');

  const sceneTitle = localize(getScene(request.sceneId).title, request.locale);
  const context = documents.map((document) => `<document id="${document.citation.id}">\n${document.text}\n</document>`).join('\n\n');
  const history = request.history.map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`).join('\n');
  const languageInstruction = request.locale === 'th' ? 'ตอบเป็นภาษาไทย' : 'Answer in English';
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const prompt = `You are the FITM 360 virtual-tour information assistant.
${languageInstruction}. The visitor is viewing scene "${sceneTitle}" (${request.sceneId}).
Classify the request as answer, tour, or program-recommendation.
Answer ONLY from the supplied documents and scene catalog. Never use outside knowledge and never invent facts.
For a tour request, choose only one destinationSceneId from the scene catalog. Do not invent or calculate the route.
For a program recommendation, use only PROGRAM documents, return at most three program IDs, and explain the match without claiming guaranteed admission. Give INTEREST TAGS and CAREER TAGS more weight than names, descriptions, and admission prose, while respecting the selected qualification and desired level.
For a normal answer, return destinationSceneId as an empty string and programRecommendations as an empty array.
If the supplied content does not contain the answer, set answered=false and clearly state that the information is unavailable.
Return citationIds only from document id attributes. relatedSceneIds may only use scene IDs explicitly present in documents.
Do not request or repeat personal data.

RECOMMENDATION PROFILE:
${recommendationProfilePrompt(request.recommendationProfile)}

RECENT CONVERSATION:
${history || '(none)'}

SCENE CATALOG:
${buildTourDestinationCatalog(content)}

DOCUMENTS:
${context}

QUESTION:
${request.message}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        httpOptions: { timeout: GEMINI_TIMEOUT_MS },
        maxOutputTokens: 1_600,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['intent', 'answered', 'answer', 'citationIds', 'relatedSceneIds', 'destinationSceneId', 'programRecommendations'],
          properties: {
            intent: { type: 'string', enum: ['answer', 'tour', 'program-recommendation'] },
            answered: { type: 'boolean' },
            answer: { type: 'string' },
            citationIds: { type: 'array', items: { type: 'string' }, maxItems: 8 },
            relatedSceneIds: { type: 'array', items: { type: 'string' }, maxItems: 6 },
            destinationSceneId: { type: 'string' },
            programRecommendations: {
              type: 'array',
              maxItems: 3,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['programId', 'reason'],
                properties: {
                  programId: { type: 'string' },
                  reason: { type: 'string' }
                }
              }
            }
          }
        }
      }
    });
    const grounded = validateGroundedAnswer(JSON.parse(response.text ?? '{}'), documents);
    if (!grounded) return createFallbackChatResponse(request, content, 'invalid-response');

    const tourPlan = grounded.intent === 'tour' && grounded.destinationSceneId
      ? createTourPlan(request.sceneId, grounded.destinationSceneId)
      : undefined;
    const deterministicRecommendations = request.recommendationProfile
      ? rankProgramsForProfile(request.recommendationProfile, content, request.locale, 3)
      : [];
    const programRecommendations = grounded.intent === 'program-recommendation' && request.recommendationProfile
      ? [...grounded.programRecommendations, ...deterministicRecommendations]
        .filter((item, index, items) => items.findIndex((candidate) => candidate.programId === item.programId) === index)
        .slice(0, 3)
      : [];
    const recommendationIds = programRecommendations.map((item) => item.programId);
    const relatedProgramIds = recommendationIds.length
      ? recommendationIds
      : findRelatedProgramIds(request, content, grounded.citations);
    const citations = grounded.intent === 'program-recommendation' && programRecommendations.length
      ? citationsForPrograms(programRecommendations, content)
      : grounded.citations;

    return {
      intent: grounded.intent,
      answered: grounded.answered,
      answer: grounded.answer,
      citations,
      relatedSceneIds: grounded.relatedSceneIds,
      relatedProgramIds,
      tourPlan,
      programRecommendations,
      needsRecommendationProfile: grounded.intent === 'program-recommendation' && !request.recommendationProfile,
      fallback: false
    };
  } catch (error) {
    const reason = classifyGeminiError(error);
    logGeminiFailure(error, reason, model);
    return createFallbackChatResponse(request, content, reason);
  }
}

export function citationLabel(citation: Citation, locale: 'th' | 'en'): string {
  return localizeContent(citation.title, locale);
}
