import { GoogleGenAI } from '@google/genai';
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
import { isSceneId, localizeContent, resolveTourScene, type ProgramContent, type PublicContentSnapshot } from '../content';
import { sortActivities } from '../activities';
import { getInfoHotspots, getScene, localize, tourScenes, type Locale, type SceneId } from '../tour-data';
import {
  buildMultiStopTourPath,
  buildTourDestinationCatalog,
  findTourDestinationCandidates,
  findTourDestinationMentions,
  type TourDestinationCandidate
} from '../tour-routing';
import { consumeAiQuota } from './ai-usage';

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
  readonly destinationSceneIds: readonly SceneId[];
  readonly comparisonProgramIds: readonly string[];
  readonly programRecommendations: readonly { readonly programId: string; readonly reason: string }[];
}

const MAX_CONTEXT_CHARACTERS = 30_000;
const GEMINI_TIMEOUT_MS = 20_000;
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const EMPTY_RESPONSE_EXTENSIONS = {
  relatedActivityIds: [] as readonly string[],
  relatedFacultyIds: [] as readonly string[],
  needsTourPreference: false
} as const;

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
        text: `PROGRAM ${item.slug}\nFACULTY: ${faculty?.name.th ?? '-'} / ${faculty?.name.en ?? '-'}\nDEPARTMENT: ${item.department?.th ?? '-'} / ${item.department?.en ?? '-'}\nSTUDY LEVEL: ${item.studyLevel ?? '-'}\nELIGIBLE QUALIFICATIONS: ${item.eligibleQualifications?.join(', ') ?? '-'}\nINTEREST TAGS: ${localizedTags(item.interestTags)}\nCAREER TAGS: ${localizedTags(item.careerTags)}\nTH: ${item.name.th} (${item.level.th})\n${item.summary.th}\n${item.description.th}\nการรับสมัคร: ${item.admission.th}\nEN: ${item.name.en} (${item.level.en})\n${item.summary.en}\n${item.description.en}\nAdmission: ${item.admission.en}`
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

function contextualProgramIds(request: ChatRequest, content: PublicContentSnapshot): string[] {
  const mentioned = mentionedProgramIds(request.message, content);
  if (mentioned.length > 0) return mentioned;
  const validIds = new Set(content.programs.map((program) => program.id));
  const previousIds = request.conversationContext?.lastProgramIds.filter((id) => validIds.has(id)) ?? [];
  const ordinal = ordinalIndex(request.message);
  if (ordinal !== undefined) return previousIds[ordinal] ? [previousIds[ordinal]] : [];
  return isComparisonIntent(request.message) ? previousIds.slice(0, 3) : [];
}

export function findRelatedProgramIds(
  request: ChatRequest,
  content: PublicContentSnapshot,
  citations: readonly Citation[] = []
): string[] {
  const validProgramIds = new Set(content.programs.map((program) => program.id));
  const specificProgramIds = new Set(contextualProgramIds(request, content));
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
  for (const { document, score } of ranked) {
    if (score <= 0) continue;
    if (selected.length >= (includeAllPrograms ? 12 : 10) || length + document.text.length > MAX_CONTEXT_CHARACTERS) continue;
    selected.push(document);
    length += document.text.length;
  }
  return selected;
}

function isRecommendationIntent(message: string): boolean {
  return /(แนะนำ.*(หลักสูตร|สาขา)|ควรเรียน|เหมาะกับ.*สาขา|สนใจ.*เรียน|recommend.*(program|course)|what should i study)/iu.test(message);
}

function isActivityListIntent(message: string): boolean {
  return /(มีกิจกรรมอะไร(?:บ้าง)?|กิจกรรม(?:ที่มี|ทั้งหมด|ช่วงนี้|ภายในมหาวิทยาลัย)|แนะนำกิจกรรม|what activities|list activities|upcoming activities)/iu.test(message);
}

function isFacultyOverviewIntent(message: string): boolean {
  return /(มีคณะอะไร(?:บ้าง)?|คณะ(?:ที่มี|ทั้งหมด|ในมจพ|ในมหาวิทยาลัย|ในวิทยาเขต)|แนะนำคณะ(?:ในมจพ|ในมหาวิทยาลัย|ในวิทยาเขต|หน่อย)?|what faculties|list faculties|faculties.*(?:campus|university))/iu.test(message);
}

function isTourIntent(message: string): boolean {
  return /(พา.*ไป|นำทาง|เส้นทางไป|อยากไป|ไปยัง|ไปที่|guide me|take me|navigate|route to|how.*get to)/iu.test(message);
}

function isGenericTourIntent(message: string): boolean {
  return /^(?:ช่วย)?\s*(?:พาทัวร์|เริ่มทัวร์|ชมรอบมหาวิทยาลัย|ทัวร์)(?:(?:ให้)?หน่อย)?(?:ครับ|ค่ะ)?\s*$|^(?:please\s+)?(?:tour me|give me a tour|start a tour)(?:\s+please)?$/iu.test(message.trim());
}

function isContextReferenceIntent(message: string): boolean {
  return /(ที่นั่น|ตรงนั้น|คณะนั้น|สถานที่นั้น|อันนั้น|จุดนั้น|there|that place|that faculty|the second|the first|the third)/iu.test(message);
}

function isComparisonIntent(message: string): boolean {
  return /(เปรียบเทียบ|เทียบ.*หลักสูตร|ต่างกัน.*อย่างไร|compare|difference between)/iu.test(message);
}

function isCurrentViewIntent(message: string): boolean {
  return /(กำลังมอง|มองเห็นอะไร|ตรงหน้าคือ|ข้างหน้าคือ|what am i looking|what is in front)/iu.test(message);
}

function ordinalIndex(message: string): number | undefined {
  const normalized = compactLookup(message);
  const terms = [
    ['อันแรก', 'รายการแรก', 'หลักสูตรแรก', 'first'],
    ['อันที่สอง', 'รายการที่สอง', 'หลักสูตรที่สอง', 'second'],
    ['อันที่สาม', 'รายการที่สาม', 'หลักสูตรที่สาม', 'third'],
    ['อันที่สี่', 'รายการที่สี่', 'คณะที่สี่', 'fourth']
  ] as const;
  const index = terms.findIndex((group) => group.some((term) => normalized.includes(compactLookup(term))));
  return index >= 0 ? index : undefined;
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
    'rate-limited': {
      th: 'มีผู้ใช้งาน AI พร้อมกันจำนวนมาก กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
      en: 'The AI service is receiving too many requests. Please wait a moment and try again.'
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

interface ProgramCompatibility {
  readonly compatible: boolean;
  readonly score: number;
}

function programLevelCompatibility(program: ProgramContent, profile: RecommendationProfile): ProgramCompatibility {
  const level = `${program.level.th} ${program.level.en} ${program.name.th} ${program.name.en}`.toLocaleLowerCase();
  const admission = `${program.admission.th} ${program.admission.en}`.toLocaleLowerCase();
  const signals = {
    vocational: /(ประกาศนียบัตร|ปวช|อาชีว|vocational|school.?factory|โรงเรียน.?โรงงาน)/u.test(level),
    transfer: /(เทียบโอน|ต่อเนื่อง|transfer|continuing)/u.test(level),
    master: /(ปริญญาโท|มหาบัณฑิต|master)/u.test(level),
    bachelor: /(ปริญญาตรี|บัณฑิต|bachelor)/u.test(level)
  };
  const detectedLevel = program.studyLevel;
  let score = 0;
  if (profile.desiredLevel !== 'unsure') {
    const levelMatches = detectedLevel
      ? detectedLevel === profile.desiredLevel
      : profile.desiredLevel === 'bachelor'
        ? signals.bachelor && !signals.transfer
        : signals[profile.desiredLevel];
    if (!levelMatches) return { compatible: false, score: 0 };
    score += 240;
  }
  const qualificationMatch = program.eligibleQualifications?.length
    ? program.eligibleQualifications.includes(profile.currentQualification)
    : ({
    m3: signals.vocational || /(ม\.\s*3|lower secondary)/u.test(admission),
    'm6-pvoc': signals.bachelor && !signals.transfer && /(ม\.\s*6|ปวช|upper secondary|vocational certificate)/u.test(admission),
    'high-vocational': signals.transfer || /(ปวส|higher vocational)/u.test(admission),
    bachelor: signals.master || /(ปริญญาตรี|bachelor)/u.test(admission),
    other: true
  }[profile.currentQualification]);
  if (!qualificationMatch && profile.currentQualification !== 'other') {
    return { compatible: false, score: 0 };
  }
  return { compatible: true, score: score + (qualificationMatch ? 120 : 0) };
}

const INTEREST_ALIASES: readonly (readonly string[])[] = [
  ['คอมพิวเตอร์', 'เขียนโปรแกรม', 'ซอฟต์แวร์', 'ข้อมูล', 'ไอที', 'computer', 'programming', 'software', 'data', 'it'],
  ['อาหาร', 'โภชนาการ', 'แปรรูป', 'food', 'nutrition', 'processing'],
  ['ธุรกิจ', 'บริหาร', 'การค้า', 'ผู้ประกอบการ', 'business', 'management', 'trade', 'entrepreneur'],
  ['ท่องเที่ยว', 'โรงแรม', 'บริการ', 'tourism', 'hotel', 'hospitality', 'service'],
  ['หุ่นยนต์', 'อัตโนมัติ', 'เครื่องกล', 'ไฟฟ้า', 'robot', 'automation', 'mechanical', 'electrical'],
  ['โลจิสติกส์', 'ขนส่ง', 'ห่วงโซ่อุปทาน', 'logistics', 'transport', 'supply chain'],
  ['ออกแบบ', 'สื่อ', 'มัลติมีเดีย', 'design', 'media', 'multimedia'],
  ['เกษตร', 'นวัตกรรม', 'agriculture', 'innovation']
];

const TOUR_INTEREST_ALIASES: readonly (readonly string[])[] = [
  ...INTEREST_ALIASES,
  ['อาหาร', 'ของกิน', 'โรงอาหาร', 'food', 'meal', 'cafeteria']
];

function expandedInterestTerms(value: string): Set<string> {
  const normalized = compactLookup(value);
  const result = new Set(tokens(value).map(compactLookup));
  if (normalized) result.add(normalized);
  for (const group of INTEREST_ALIASES) {
    if (group.some((term) => normalized.includes(compactLookup(term)))) {
      group.forEach((term) => result.add(compactLookup(term)));
    }
  }
  return result;
}

function fieldInterestScore(queryTerms: ReadonlySet<string>, value: string, weight: number): number {
  const compactValue = compactLookup(value);
  let matches = 0;
  for (const term of queryTerms) {
    if (term.length >= 2 && compactValue.includes(term)) matches += 1;
  }
  return matches * weight;
}

export function rankProgramsForProfile(
  profile: RecommendationProfile,
  content: PublicContentSnapshot,
  locale: Locale,
  limit = 3
): ProgramRecommendation[] {
  const queryTerms = expandedInterestTerms(profile.interests);
  const scored = content.programs.map((program, index) => {
    const compatibility = programLevelCompatibility(program, profile);
    const weighted = [
      { value: [...(program.interestTags?.th ?? []), ...(program.interestTags?.en ?? [])].join(' '), weight: 14 },
      { value: [...(program.careerTags?.th ?? []), ...(program.careerTags?.en ?? [])].join(' '), weight: 12 },
      { value: `${program.name.th} ${program.name.en} ${program.department?.th ?? ''} ${program.department?.en ?? ''}`, weight: 7 },
      { value: `${program.summary.th} ${program.summary.en} ${program.description.th} ${program.description.en}`, weight: 3 },
      { value: `${program.level.th} ${program.level.en} ${program.admission.th} ${program.admission.en}`, weight: 5 }
    ];
    const interestScore = weighted.reduce(
      (total, entry) => total + fieldInterestScore(queryTerms, entry.value, entry.weight),
      0
    );
    return { program, compatibility, interestScore, score: compatibility.score + interestScore, index };
  })
    .filter((entry) => entry.compatibility.compatible && entry.interestScore > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, Math.max(1, limit)).map(({ program }) => ({
    programId: program.id,
    facultyId: program.facultyId,
    reason: recommendationReason(program, profile, locale)
  }));
}

function createTourPlan(from: SceneId, stopSceneIds: readonly SceneId[]): TourPlan | undefined {
  const path = buildMultiStopTourPath(from, stopSceneIds, 5);
  const destinationSceneId = path?.stopSceneIds.at(-1);
  return path && destinationSceneId
    ? { destinationSceneId, stopSceneIds: path.stopSceneIds, sceneIds: path.sceneIds }
    : undefined;
}

function angularDistance(left: number, right: number): number {
  return Math.abs((((left - right) % 360) + 540) % 360 - 180);
}

function createCurrentViewResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse {
  const scene = getScene(request.sceneId);
  const yaw = request.viewYaw;
  const visibleHotspot = yaw === undefined
    ? undefined
    : getInfoHotspots(scene)
      .map((hotspot) => ({ hotspot, distance: angularDistance(hotspot.yaw, yaw) }))
      .filter((item) => item.distance <= 45)
      .sort((a, b) => a.distance - b.distance)[0]?.hotspot;
  const published = visibleHotspot
    ? content.hotspots.find((item) => item.hotspotId === visibleHotspot.id)
      ?? content.faculties.find((item) => item.hotspotId === visibleHotspot.id)
    : undefined;
  const resolvedScene = resolveTourScene(scene, content);
  const answer = published
    ? ('title' in published
      ? `${localizeContent(published.title, request.locale)} — ${localizeContent(published.description, request.locale)}`
      : `${localizeContent(published.name, request.locale)} — ${localizeContent(published.description, request.locale)}`)
    : `${localize(resolvedScene.title, request.locale)} — ${localize(resolvedScene.description, request.locale)}`;
  return {
    intent: 'answer',
    answered: true,
    answer,
    relatedSceneIds: [],
    relatedProgramIds: [],
    comparisonProgramIds: [],
    programRecommendations: [],
    needsRecommendationProfile: false,
    ...EMPTY_RESPONSE_EXTENSIONS,
    fallback: false
  };
}

function formatActivityDate(startDate: string | undefined, endDate: string | undefined, locale: Locale): string {
  if (!startDate && !endDate) return locale === 'th' ? 'ยังไม่ระบุวันที่' : 'Date not specified';
  const format = (value: string): string => new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00.000Z`));
  const start = startDate ?? endDate ?? '';
  const end = endDate ?? startDate ?? '';
  return start === end ? format(start) : `${format(start)} – ${format(end)}`;
}

function createActivityListResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse {
  const activities = sortActivities(content.activities);
  const visible = activities.slice(0, 12);
  const answer = activities.length === 0
    ? (request.locale === 'th'
      ? 'ขณะนี้ยังไม่มีกิจกรรมที่เผยแพร่ในระบบ Admin'
      : 'There are currently no published activities in Admin.')
    : request.locale === 'th'
      ? `ขณะนี้มีกิจกรรมที่เผยแพร่ ${activities.length} รายการ\n${visible.map((activity, index) => (
        `${index + 1}. ${activity.title.th} — ${formatActivityDate(activity.startDate, activity.endDate, request.locale)}\n${activity.summary.th}`
      )).join('\n')}`
      : `There ${activities.length === 1 ? 'is' : 'are'} ${activities.length} published ${activities.length === 1 ? 'activity' : 'activities'}:\n${visible.map((activity, index) => (
        `${index + 1}. ${activity.title.en} — ${formatActivityDate(activity.startDate, activity.endDate, request.locale)}\n${activity.summary.en}`
      )).join('\n')}`;
  return {
    intent: 'activity-list',
    answered: activities.length > 0,
    answer,
    relatedSceneIds: [],
    relatedProgramIds: [],
    relatedActivityIds: visible.map((activity) => activity.id),
    relatedFacultyIds: [],
    comparisonProgramIds: [],
    programRecommendations: [],
    needsRecommendationProfile: false,
    needsTourPreference: false,
    fallback: false
  };
}

function createFacultyOverviewResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse {
  const faculties = content.faculties;
  const answer = faculties.length === 0
    ? (request.locale === 'th'
      ? 'ขณะนี้ยังไม่มีข้อมูลคณะที่เผยแพร่ในระบบ Admin'
      : 'There are currently no published faculties in Admin.')
    : request.locale === 'th'
      ? `มจพ. วิทยาเขตปราจีนบุรี มีคณะที่เผยแพร่ ${faculties.length} แห่ง\n${faculties.map((faculty, index) => {
        const count = content.programs.filter((program) => program.facultyId === faculty.id).length;
        return `${index + 1}. ${faculty.name.th} (${count} หลักสูตร)`;
      }).join('\n')}\n\nหากต้องการให้ช่วยเลือกคณะหรือหลักสูตร กรุณาระบุความสนใจ วุฒิปัจจุบัน และระดับที่ต้องการเรียนด้านล่าง`
      : `KMUTNB Prachinburi Campus has ${faculties.length} published faculties:\n${faculties.map((faculty, index) => {
        const count = content.programs.filter((program) => program.facultyId === faculty.id).length;
        return `${index + 1}. ${faculty.name.en} (${count} ${count === 1 ? 'program' : 'programs'})`;
      }).join('\n')}\n\nTo find a suitable faculty or program, enter your interests, current qualification, and desired study level below.`;
  return {
    intent: 'faculty-overview',
    answered: faculties.length > 0,
    answer,
    relatedSceneIds: [],
    relatedProgramIds: [],
    relatedActivityIds: [],
    relatedFacultyIds: faculties.map((faculty) => faculty.id),
    comparisonProgramIds: [],
    programRecommendations: [],
    needsRecommendationProfile: faculties.length > 0,
    needsTourPreference: false,
    fallback: false
  };
}

function findTourPreferenceCandidates(
  request: ChatRequest,
  content: PublicContentSnapshot
): readonly TourDestinationCandidate[] {
  const meaningfulSceneIds = new Set<SceneId>([
    ...content.faculties.flatMap((faculty) => faculty.sceneId ? [faculty.sceneId] : []),
    ...content.hotspots.map((hotspot) => hotspot.sceneId),
    ...content.activities.flatMap((activity) => activity.sceneId ? [activity.sceneId] : []),
    ...tourScenes.filter((scene) => 'mapLandmark' in scene && scene.mapLandmark === true).map((scene) => scene.id)
  ]);
  const normalizedMessage = compactLookup(request.message);
  const directCandidates = findTourDestinationCandidates(
    request.message,
    content,
    request.locale,
    tourScenes.length
  ).filter((candidate) => meaningfulSceneIds.has(candidate.sceneId));
  const directLeader = directCandidates[0];
  if (directLeader && directLeader.score >= 900 && directLeader.score >= (directCandidates[1]?.score ?? 0) + 200) {
    return [directLeader];
  }
  const manualSceneIds = /(?:กีฬา|ออกกำลังกาย|ฟุตบอล|\bsports?\b|\bexercise\b|\bfootball\b)/iu.test(request.message)
    ? ['multipurposeGym'] as const
    : /(?:หอพัก|ที่พักนักศึกษา|หอชาย|หอหญิง|\bdormitor(?:y|ies)\b|student housing)/iu.test(request.message)
      ? ['maleDormitory', 'femaleDormitory1', 'femaleDormitory2'] as const
      : /(?:ด้านการเรียน|หลักสูตร|คณะ|\bacademic\b|\bstudy\b)/iu.test(request.message)
        ? content.faculties.flatMap((faculty) => faculty.sceneId ? [faculty.sceneId] : [])
        : [];
  if (manualSceneIds.length) {
    return manualSceneIds
      .filter((sceneId, index, items) => items.indexOf(sceneId) === index)
      .map((sceneId) => ({
        sceneId,
        label: localize(resolveTourScene(getScene(sceneId), content).title, request.locale),
        score: 1_000
      }));
  }
  const expandedQueries = [
    request.message,
    ...TOUR_INTEREST_ALIASES.flatMap((group) => group.some((term) => {
      const normalizedTerm = compactLookup(term);
      return normalizedTerm.length >= 3 && normalizedMessage.includes(normalizedTerm);
    }) ? group : [])
  ];
  const candidateByScene = new Map<SceneId, TourDestinationCandidate>();
  for (const query of expandedQueries) {
    const queryCandidates = findTourDestinationCandidates(query, content, request.locale, tourScenes.length)
      .filter((candidate) => meaningfulSceneIds.has(candidate.sceneId));
    const queryLeaderScore = queryCandidates[0]?.score ?? 0;
    for (const candidate of queryCandidates) {
      const normalizedCandidate = {
        ...candidate,
        score: queryLeaderScore ? Math.round((candidate.score / queryLeaderScore) * 1_000) : 0
      };
      const current = candidateByScene.get(candidate.sceneId);
      if (!current || normalizedCandidate.score > current.score) {
        candidateByScene.set(candidate.sceneId, normalizedCandidate);
      }
    }
  }
  const candidates = [...candidateByScene.values()].sort((left, right) => right.score - left.score);
  const leadingScore = candidates[0]?.score ?? 0;
  return candidates
    .filter((candidate) => candidate.score >= Math.max(100, leadingScore - 100))
    .slice(0, 5);
}

function createTourPreferenceResponse(
  request: ChatRequest,
  content: PublicContentSnapshot,
  suppliedCandidates?: readonly TourDestinationCandidate[]
): ChatResponse {
  const candidates = suppliedCandidates ?? (isGenericTourIntent(request.message) && !request.conversationContext?.awaitingTourPreference
    ? []
    : findTourPreferenceCandidates(request, content));
  const candidateNames = candidates.map((candidate) => candidate.label);
  const answer = request.locale === 'th'
    ? candidateNames.length > 1
      ? `พบสถานที่ที่อาจตรงกับความสนใจหลายแห่ง: ${candidateNames.join(', ')} กรุณาพิมพ์ชื่อสถานที่ที่ต้องการไปให้ชัดเจนอีกครั้ง`
      : candidateNames.length === 1
        ? `คุณหมายถึง ${candidateNames[0]} ใช่หรือไม่ กรุณาพิมพ์ชื่อสถานที่นี้อีกครั้งเพื่อยืนยันปลายทาง`
      : 'ต้องการไปที่ไหน หรือสนใจชมเรื่องใด กรุณาพิมพ์ชื่อสถานที่หรือความสนใจ เช่น กีฬา อาหาร หอพัก หรือด้านการเรียน แล้วฉันจะหาเส้นทางที่ตรงกับคุณ'
    : candidateNames.length > 1
      ? `Several places may match your interest: ${candidateNames.join(', ')}. Please type the exact place you want to visit.`
      : candidateNames.length === 1
        ? `Did you mean ${candidateNames[0]}? Please type that place name again to confirm the destination.`
      : 'Where would you like to go, or what are you interested in? Type a place or interest such as sports, food, dormitories, or study, and I will find a suitable route.';
  return {
    intent: 'tour',
    answered: false,
    answer,
    relatedSceneIds: [],
    relatedProgramIds: [],
    relatedActivityIds: [],
    relatedFacultyIds: [],
    comparisonProgramIds: [],
    programRecommendations: [],
    needsRecommendationProfile: false,
    needsTourPreference: true,
    fallback: false
  };
}

function createPreparedTourResponse(
  request: ChatRequest,
  plan: TourPlan,
  destinationLabel?: string
): ChatResponse {
  return {
    intent: 'tour',
    answered: true,
    answer: request.locale === 'th'
      ? `เตรียมเส้นทาง${plan.stopSceneIds.length > 1 ? ` ${plan.stopSceneIds.length} จุด` : ''}ไปยัง ${destinationLabel ?? 'จุดหมายที่เลือก'} แล้ว กดเริ่มพาทัวร์เพื่อเดินทางทีละฉาก`
      : `The ${plan.stopSceneIds.length > 1 ? `${plan.stopSceneIds.length}-stop ` : ''}route to ${destinationLabel ?? 'the selected destination'} is ready. Start the guided tour to move scene by scene.`,
    relatedSceneIds: plan.stopSceneIds,
    relatedProgramIds: [],
    comparisonProgramIds: [],
    tourPlan: plan,
    programRecommendations: [],
    needsRecommendationProfile: false,
    ...EMPTY_RESPONSE_EXTENSIONS,
    fallback: false
  };
}

function inferFallbackIntent(request: ChatRequest): ChatIntent {
  if (isComparisonIntent(request.message)) return 'program-comparison';
  if (request.recommendationProfile || isRecommendationIntent(request.message)) return 'program-recommendation';
  if (isTourIntent(request.message) || isGenericTourIntent(request.message) || request.conversationContext?.awaitingTourPreference) return 'tour';
  return 'answer';
}

function deterministicTourPlan(request: ChatRequest, content: PublicContentSnapshot): TourPlan | undefined {
  const candidates = findTourDestinationCandidates(request.message, content, request.locale, 15);
  const mentions = findTourDestinationMentions(request.message, content, request.locale, 5);
  const strong = candidates.filter((candidate) => candidate.score >= 300);
  const multiStopWording = /(และ|แล้วไป|ต่อด้วย|จาก.+ไป|,|;|\band\b|then|after)/iu.test(request.message);
  let destinations = multiStopWording && mentions.length > 1
    ? mentions
    : multiStopWording && strong.length > 1
      ? strong.slice(0, 5)
    : candidates[0] && (
      candidates[0].score >= 300 || candidates[0].score >= (candidates[1]?.score ?? 0) + 20
    ) ? [candidates[0]] : [];
  if (destinations.length === 0 && request.conversationContext && isContextReferenceIntent(request.message)) {
    const contextualSceneIds = [
      ...request.conversationContext.lastFacultyIds.flatMap((facultyId) => {
        const sceneId = content.faculties.find((faculty) => faculty.id === facultyId)?.sceneId;
        return sceneId ? [sceneId] : [];
      }),
      ...request.conversationContext.lastSceneIds
    ].filter((sceneId, index, items) => items.indexOf(sceneId) === index);
    destinations = contextualSceneIds.slice(0, multiStopWording ? 5 : 1).map((sceneId) => ({
      sceneId,
      label: localize(resolveTourScene(getScene(sceneId), content).title, request.locale),
      score: 1_000
    }));
  }
  return destinations.length
    ? createTourPlan(request.sceneId, destinations.map((candidate) => candidate.sceneId))
    : undefined;
}

function deterministicComparisonResponse(
  request: ChatRequest,
  content: PublicContentSnapshot
): ChatResponse | undefined {
  if (!isComparisonIntent(request.message)) return undefined;
  const programIds = contextualProgramIds(request, content).slice(0, 3);
  if (programIds.length < 2) {
    return {
      intent: 'program-comparison',
      answered: false,
      answer: request.locale === 'th'
        ? 'กรุณาระบุหรือเลือกหลักสูตรอย่างน้อย 2 รายการเพื่อเปรียบเทียบ'
        : 'Please name or select at least two programs to compare.',
      relatedSceneIds: [],
      relatedProgramIds: programIds,
      comparisonProgramIds: [],
      programRecommendations: [],
      needsRecommendationProfile: false,
      ...EMPTY_RESPONSE_EXTENSIONS,
      fallback: false
    };
  }
  return {
    intent: 'program-comparison',
    answered: true,
    answer: request.locale === 'th'
      ? `เตรียมตารางเปรียบเทียบ ${programIds.length} หลักสูตรจากข้อมูลที่เผยแพร่แล้ว`
      : `A comparison of ${programIds.length} published programs is ready.`,
    relatedSceneIds: [],
    relatedProgramIds: programIds,
    comparisonProgramIds: programIds,
    programRecommendations: [],
    needsRecommendationProfile: false,
    ...EMPTY_RESPONSE_EXTENSIONS,
    fallback: false
  };
}

export function createFallbackChatResponse(
  request: ChatRequest,
  content: PublicContentSnapshot,
  fallbackReason: ChatFallbackReason = 'not-configured'
): ChatResponse {
  if (isActivityListIntent(request.message)) return createActivityListResponse(request, content);
  if (isFacultyOverviewIntent(request.message)) return createFacultyOverviewResponse(request, content);
  const intent = inferFallbackIntent(request);
  const comparison = deterministicComparisonResponse(request, content);
  if (comparison) return comparison;
  if (intent === 'program-recommendation' && !request.recommendationProfile) {
    return {
      intent,
      answered: false,
      answer: request.locale === 'th'
        ? 'กรอกความสนใจ วุฒิปัจจุบัน และระดับที่ต้องการเรียน เพื่อให้ระบบค้นหาหลักสูตรที่เหมาะสมจากข้อมูล Admin'
        : 'Tell us your interests, current qualification, and desired study level so the system can match published programs.',
      relatedSceneIds: [],
      relatedProgramIds: [],
      comparisonProgramIds: [],
      programRecommendations: [],
      needsRecommendationProfile: true,
      ...EMPTY_RESPONSE_EXTENSIONS,
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
      relatedSceneIds: [],
      relatedProgramIds: recommendations.map((item) => item.programId),
      comparisonProgramIds: [],
      programRecommendations: recommendations,
      needsRecommendationProfile: false,
      ...EMPTY_RESPONSE_EXTENSIONS,
      fallback: true,
      fallbackReason: recommendations.length > 0 ? fallbackReason : 'no-content'
    };
  }

  if (intent === 'tour') {
    const candidates = findTourDestinationCandidates(request.message, content, request.locale);
    const tourPlan = deterministicTourPlan(request, content);
    const destination = tourPlan
      ? candidates.find((candidate) => candidate.sceneId === tourPlan.destinationSceneId)
      : undefined;
    return {
      intent,
      answered: Boolean(tourPlan),
      answer: tourPlan
        ? (request.locale === 'th'
          ? `พบเส้นทางไป ${destination?.label ?? ''} แล้ว กดเริ่มพาทัวร์เพื่อเดินทางทีละฉาก`
          : `A route to ${destination?.label ?? ''} is ready. Start the guided tour to move scene by scene.`)
        : localizedFallbackReason(fallbackReason, request.locale),
      relatedSceneIds: tourPlan ? [] : candidates.map((candidate) => candidate.sceneId),
      relatedProgramIds: [],
      comparisonProgramIds: [],
      tourPlan,
      programRecommendations: [],
      needsRecommendationProfile: false,
      ...EMPTY_RESPONSE_EXTENSIONS,
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
    relatedSceneIds: [...new Set(documents.flatMap((document) => document.sceneId ? [document.sceneId] : []))],
    relatedProgramIds: findRelatedProgramIds(request, content, citations),
    comparisonProgramIds: [],
    programRecommendations: [],
    needsRecommendationProfile: false,
    ...EMPTY_RESPONSE_EXTENSIONS,
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
  const destinationSceneIds = parsed.data.destinationSceneIds.filter((sceneId): sceneId is SceneId => isSceneId(sceneId));
  const comparisonProgramIds = parsed.data.comparisonProgramIds.filter((programId) => programIds.has(programId));
  const seenPrograms = new Set<string>();
  const programRecommendations = parsed.data.programRecommendations.flatMap((item) => {
    if (!programIds.has(item.programId) || seenPrograms.has(item.programId)) return [];
    seenPrograms.add(item.programId);
    return [item];
  });
  const supported = parsed.data.intent === 'tour'
    ? destinationSceneIds.length > 0
    : parsed.data.intent === 'program-comparison'
      ? comparisonProgramIds.length >= 2
      : citations.length > 0;
  return {
    intent: parsed.data.intent,
    answered: parsed.data.answered && supported,
    answer: parsed.data.answer
      .replace(/\[[^\r\n]+?\]\(https?:\/\/[^)\s]+\)/giu, '')
      .replace(/https?:\/\/\S+/giu, '')
      .replace(/\[(?:\d+(?:\s*,\s*\d+)*|source\s*\d*|citation\s*\d*)\]/giu, '')
      .replace(/(?:sources?|citations?|references?|แหล่งอ้างอิง|แหล่งข้อมูล|อ้างอิง)\s*:\s*[\s\S]*$/iu, '')
      .trim(),
    citations,
    relatedSceneIds: [...new Set(relatedSceneIds)],
    destinationSceneIds: [...new Set(destinationSceneIds)].slice(0, 5),
    comparisonProgramIds: [...new Set(comparisonProgramIds)].slice(0, 3),
    programRecommendations
  };
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
  if (isCurrentViewIntent(request.message)) {
    return createCurrentViewResponse(request, content);
  }

  if (isActivityListIntent(request.message)) {
    return createActivityListResponse(request, content);
  }

  if (isFacultyOverviewIntent(request.message)) {
    return createFacultyOverviewResponse(request, content);
  }

  const comparison = deterministicComparisonResponse(request, content);
  if (comparison) return comparison;

  const recommendationIntent = Boolean(request.recommendationProfile) || isRecommendationIntent(request.message);
  if (recommendationIntent && !request.recommendationProfile) {
    return createFallbackChatResponse(request, content);
  }

  const tourRequest = isTourIntent(request.message)
    || isGenericTourIntent(request.message)
    || request.conversationContext?.awaitingTourPreference === true;
  if (request.conversationContext?.awaitingTourPreference && /^(กิจกรรม|activities?)$/iu.test(request.message.trim())) {
    return createActivityListResponse(request, content);
  }
  if (isGenericTourIntent(request.message) && !request.conversationContext?.awaitingTourPreference) {
    return createTourPreferenceResponse(request, content);
  }

  // Tour requests are resolved locally so generic wording can never select an arbitrary scene.
  if (tourRequest) {
    if (request.conversationContext?.awaitingTourPreference && !isTourIntent(request.message)) {
      const preferenceCandidates = findTourPreferenceCandidates(request, content);
      if (preferenceCandidates.length !== 1) {
        return createTourPreferenceResponse(request, content, preferenceCandidates);
      }
      const candidate = preferenceCandidates[0];
      if (!candidate) return createTourPreferenceResponse(request, content, preferenceCandidates);
      const preferencePlan = buildMultiStopTourPath(request.sceneId, [candidate.sceneId]);
      return preferencePlan
        ? createPreparedTourResponse(request, {
          destinationSceneId: candidate.sceneId,
          stopSceneIds: preferencePlan.stopSceneIds,
          sceneIds: preferencePlan.sceneIds
        }, candidate.label)
        : createTourPreferenceResponse(request, content, preferenceCandidates);
    }
    const directPlan = deterministicTourPlan(request, content);
    if (directPlan) {
      const destination = findTourDestinationCandidates(request.message, content, request.locale, 15)
        .find((candidate) => candidate.sceneId === directPlan.destinationSceneId);
      return createPreparedTourResponse(request, directPlan, destination?.label);
    }
    return createTourPreferenceResponse(request, content);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return createFallbackChatResponse(request, content, 'not-configured');
  }

  const deterministicRecommendations = request.recommendationProfile
    ? rankProgramsForProfile(request.recommendationProfile, content, request.locale, 3)
    : [];
  if (recommendationIntent && deterministicRecommendations.length === 0) {
    return createFallbackChatResponse(request, content, 'no-content');
  }
  const allDocuments = buildKnowledgeDocuments(content);
  const validContextProgramIds = request.conversationContext?.lastProgramIds.filter((id) => (
    content.programs.some((program) => program.id === id)
  )) ?? [];
  const validContextFacultyIds = request.conversationContext?.lastFacultyIds.filter((id) => (
    content.faculties.some((faculty) => faculty.id === id)
  )) ?? [];
  const validContextSceneIds = request.conversationContext?.lastSceneIds.filter(isSceneId) ?? [];
  const contextDocumentIds = new Set([
    ...validContextProgramIds,
    ...validContextFacultyIds
  ]);
  const selectedDocuments = selectKnowledge(
    allDocuments,
    request.recommendationProfile ? `${request.message} ${profileLookupText(request.recommendationProfile)}` : request.message,
    request.sceneId,
    recommendationIntent
  );
  const documents = [
    ...allDocuments.filter((document) => contextDocumentIds.has(document.citation.id)),
    ...selectedDocuments
  ].filter((document, index, items) => (
    items.findIndex((candidate) => candidate.citation.id === document.citation.id) === index
  )).filter((document) => !recommendationIntent
    || document.citation.kind !== 'program'
    || deterministicRecommendations.some((item) => item.programId === document.citation.id));
  if (documents.length === 0) return createFallbackChatResponse(request, content, 'no-content');

  const quota = await consumeAiQuota();
  if (!quota.allowed) return createFallbackChatResponse(request, content, quota.reason ?? 'quota-exceeded');

  const sceneTitle = localize(getScene(request.sceneId).title, request.locale);
  const context = documents.map((document) => `<document id="${document.citation.id}">\n${document.text}\n</document>`).join('\n\n');
  const history = request.history.map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`).join('\n');
  const languageInstruction = request.locale === 'th' ? 'ตอบเป็นภาษาไทย' : 'Answer in English';
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const prompt = `You are the FITM 360 virtual-tour information assistant.
${languageInstruction}. The visitor is viewing scene "${sceneTitle}" (${request.sceneId}).
Classify the request as answer, tour, program-recommendation, or program-comparison.
Answer ONLY from the supplied documents and scene catalog. Never use outside knowledge and never invent facts.
For a tour request, choose one to five destinationSceneIds from the scene catalog in the order requested. Do not invent or calculate the route.
For a program recommendation, use only PROGRAM documents, return at most three program IDs, and explain the match without claiming guaranteed admission. Give INTEREST TAGS and CAREER TAGS more weight than names, descriptions, and admission prose, while respecting the selected qualification and desired level.
For a comparison, return two or three comparisonProgramIds from PROGRAM documents. For a normal answer, return empty destinationSceneIds, comparisonProgramIds, and programRecommendations arrays.
If the supplied content does not contain the answer, set answered=false and clearly state that the information is unavailable.
Return citationIds only from document id attributes. relatedSceneIds may only use scene IDs explicitly present in documents.
Citation IDs are for server validation only. Never put URLs, a sources list, citations, or a references section in answer.
Do not request or repeat personal data.

RECOMMENDATION PROFILE:
${recommendationProfilePrompt(request.recommendationProfile)}

RECENT CONVERSATION:
${history || '(none)'}

VALIDATED CONVERSATION CONTEXT IDS:
Programs: ${validContextProgramIds.join(', ') || '(none)'}
Faculties: ${validContextFacultyIds.join(', ') || '(none)'}
Scenes: ${validContextSceneIds.join(', ') || '(none)'}

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
          required: ['intent', 'answered', 'answer', 'citationIds', 'relatedSceneIds', 'destinationSceneIds', 'comparisonProgramIds', 'programRecommendations'],
          properties: {
            intent: { type: 'string', enum: ['answer', 'tour', 'program-recommendation', 'program-comparison'] },
            answered: { type: 'boolean' },
            answer: { type: 'string' },
            citationIds: { type: 'array', items: { type: 'string' }, maxItems: 8 },
            relatedSceneIds: { type: 'array', items: { type: 'string' }, maxItems: 6 },
            destinationSceneIds: { type: 'array', items: { type: 'string' }, maxItems: 5 },
            comparisonProgramIds: { type: 'array', items: { type: 'string' }, maxItems: 3 },
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

    if (recommendationIntent) {
      const modelReasonByProgram = new Map(grounded.programRecommendations.map((item) => [item.programId, item.reason]));
      const programRecommendations: ProgramRecommendation[] = deterministicRecommendations.map((item) => ({
        ...item,
        reason: modelReasonByProgram.get(item.programId) ?? item.reason
      }));
      return {
        intent: 'program-recommendation',
        answered: programRecommendations.length > 0,
        answer: grounded.answer,
        relatedSceneIds: [],
        relatedProgramIds: programRecommendations.map((item) => item.programId),
        comparisonProgramIds: [],
        programRecommendations,
        needsRecommendationProfile: false,
        ...EMPTY_RESPONSE_EXTENSIONS,
        fallback: false
      };
    }

    const tourPlan = grounded.intent === 'tour' && grounded.destinationSceneIds.length > 0
      ? createTourPlan(request.sceneId, grounded.destinationSceneIds)
      : undefined;
    if (grounded.intent === 'tour' && !tourPlan) {
      return {
        intent: 'tour',
        answered: false,
        answer: request.locale === 'th'
          ? 'ไม่พบเส้นทางที่เชื่อมครบทุกจุดหมาย กรุณาลองระบุจุดหมายใหม่หรือเลือกทีละจุด'
          : 'A connected route could not be found for every stop. Try different destinations or select one stop at a time.',
        relatedSceneIds: grounded.destinationSceneIds,
        relatedProgramIds: [],
        comparisonProgramIds: [],
        programRecommendations: [],
        needsRecommendationProfile: false,
        ...EMPTY_RESPONSE_EXTENSIONS,
        fallback: true,
        fallbackReason: 'no-content'
      };
    }
    const programRecommendations: ProgramRecommendation[] = [];
    const recommendationIds = programRecommendations.map((item) => item.programId);
    const relatedProgramIds = recommendationIds.length
      ? recommendationIds
      : findRelatedProgramIds(request, content, grounded.citations);

    return {
      intent: grounded.intent,
      answered: grounded.answered && (grounded.intent !== 'tour' || Boolean(tourPlan)),
      answer: grounded.answer,
      relatedSceneIds: grounded.relatedSceneIds,
      relatedProgramIds,
      comparisonProgramIds: grounded.comparisonProgramIds,
      tourPlan,
      programRecommendations,
      needsRecommendationProfile: grounded.intent === 'program-recommendation' && !request.recommendationProfile,
      ...EMPTY_RESPONSE_EXTENSIONS,
      fallback: false
    };
  } catch (error) {
    const reason = classifyGeminiError(error);
    logGeminiFailure(error, reason, model);
    return createFallbackChatResponse(request, content, reason);
  }
}
