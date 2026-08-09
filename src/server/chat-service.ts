import { GoogleGenAI } from '@google/genai';
import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../lib/supabase/env';
import { geminiAnswerSchema, type ChatRequest, type ChatResponse, type Citation } from '../chat';
import { localizeContent, type PublicContentSnapshot } from '../content';
import { getScene, localize, type SceneId } from '../tour-data';

export interface KnowledgeDocument {
  readonly citation: Citation;
  readonly sceneId?: SceneId;
  readonly text: string;
}

const MAX_CONTEXT_CHARACTERS = 80_000;

function sourceUrl(source: { readonly url?: string }): string | undefined {
  return source.url;
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
        text: `PROGRAM ${item.slug}\nFACULTY: ${faculty?.name.th ?? '-'} / ${faculty?.name.en ?? '-'}\nDEPARTMENT: ${item.department?.th ?? '-'} / ${item.department?.en ?? '-'}\nTH: ${item.name.th} (${item.level.th})\n${item.summary.th}\n${item.description.th}\nการรับสมัคร: ${item.admission.th}\nEN: ${item.name.en} (${item.level.en})\n${item.summary.en}\n${item.description.en}\nAdmission: ${item.admission.en}`
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
  return [
    name,
    withoutPrefix,
    firstThaiPart ? `คณะ${firstThaiPart}` : '',
    withoutEnglishPrefix,
    firstEnglishPart ?? '',
    slug
  ]
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

  const hasAcademicIntent = /(คณะ|หลักสูตร|สาขา|เปิดสอน|เรียน|faculty|program|course|degree|study)/iu
    .test(request.message);
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
  sceneId: SceneId
): KnowledgeDocument[] {
  const queryTokens = new Set(tokens(question));
  const ranked = documents.map((document, index) => ({
    document,
    index,
    score: (document.sceneId === sceneId ? 100 : 0)
      + tokens(document.text).reduce((score, token) => score + (queryTokens.has(token) ? 3 : 0), 0)
  })).sort((a, b) => b.score - a.score || a.index - b.index);

  const selected: KnowledgeDocument[] = [];
  let length = 0;
  for (const { document } of ranked) {
    if (selected.length >= 24 || length + document.text.length > MAX_CONTEXT_CHARACTERS) continue;
    selected.push(document);
    length += document.text.length;
  }
  return selected;
}

export function createFallbackChatResponse(
  request: ChatRequest,
  content: PublicContentSnapshot
): ChatResponse {
  const documents = selectKnowledge(buildKnowledgeDocuments(content), request.message, request.sceneId).slice(0, 4);
  const citations = documents.map((document) => document.citation);
  const answer = request.locale === 'th'
    ? 'ขณะนี้ AI ยังไม่พร้อมใช้งาน คุณสามารถเปิดข้อมูลที่เกี่ยวข้องด้านล่างแทนได้'
    : 'The AI assistant is currently unavailable. You can open the related information below instead.';
  return {
    answered: false,
    answer,
    citations,
    relatedSceneIds: [...new Set(documents.flatMap((document) => document.sceneId ? [document.sceneId] : []))],
    relatedProgramIds: findRelatedProgramIds(request, content, citations),
    fallback: true
  };
}

export function validateGroundedAnswer(
  value: unknown,
  documents: readonly KnowledgeDocument[]
): Omit<ChatResponse, 'fallback' | 'relatedProgramIds'> | null {
  const parsed = geminiAnswerSchema.safeParse(value);
  if (!parsed.success) return null;
  const citationById = new Map(documents.map((document) => [document.citation.id, document.citation]));
  const citations = parsed.data.citationIds.flatMap((id) => {
    const citation = citationById.get(id);
    return citation ? [citation] : [];
  });
  const relatedSceneIds = parsed.data.relatedSceneIds.filter((sceneId): sceneId is SceneId => (
    documents.some((document) => document.sceneId === sceneId)
  ));
  return {
    answered: parsed.data.answered,
    answer: parsed.data.answer,
    citations,
    relatedSceneIds: [...new Set(relatedSceneIds)]
  };
}

async function consumeDailyQuota(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const configuredLimit = Number.parseInt(process.env.GEMINI_DAILY_LIMIT ?? '200', 10);
  const limit = Number.isFinite(configuredLimit) ? Math.max(1, configuredLimit) : 200;
  const { data, error } = await createAdminSupabaseClient().rpc('consume_ai_quota', {
    limit_count: limit
  });
  return !error && data === true;
}

export async function answerGroundedQuestion(
  request: ChatRequest,
  content: PublicContentSnapshot
): Promise<ChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your-gemini-api-key' || !(await consumeDailyQuota())) {
    return createFallbackChatResponse(request, content);
  }

  const documents = selectKnowledge(buildKnowledgeDocuments(content), request.message, request.sceneId);
  if (documents.length === 0) return createFallbackChatResponse(request, content);
  const sceneTitle = localize(getScene(request.sceneId).title, request.locale);
  const context = documents.map((document) => (
    `<document id="${document.citation.id}">\n${document.text}\n</document>`
  )).join('\n\n');
  const history = request.history.map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`).join('\n');
  const languageInstruction = request.locale === 'th' ? 'ตอบเป็นภาษาไทย' : 'Answer in English';

  const prompt = `You are the FITM 360 virtual-tour information assistant.
${languageInstruction}. The visitor is viewing scene "${sceneTitle}" (${request.sceneId}).
Answer ONLY from the supplied documents. Never use outside knowledge and never invent facts.
If the documents do not contain the answer, set answered=false and clearly say that the information is unavailable.
Return citationIds only from document id attributes. relatedSceneIds may only use scene IDs explicitly present in documents.
When the visitor asks which programs a faculty offers, list every supplied PROGRAM document for that faculty.
Do not request or repeat personal data.

RECENT CONVERSATION:
${history || '(none)'}

DOCUMENTS:
${context}

QUESTION:
${request.message}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const responsePromise = ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        maxOutputTokens: 1_200,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['answered', 'answer', 'citationIds', 'relatedSceneIds'],
          properties: {
            answered: { type: 'boolean' },
            answer: { type: 'string' },
            citationIds: { type: 'array', items: { type: 'string' }, maxItems: 8 },
            relatedSceneIds: { type: 'array', items: { type: 'string' }, maxItems: 6 }
          }
        }
      }
    });
    const response = await Promise.race([
      responsePromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 25_000))
    ]);
    const grounded = validateGroundedAnswer(JSON.parse(response.text ?? '{}'), documents);
    if (!grounded) return createFallbackChatResponse(request, content);
    return {
      ...grounded,
      relatedProgramIds: findRelatedProgramIds(request, content, grounded.citations),
      fallback: false
    };
  } catch {
    return createFallbackChatResponse(request, content);
  }
}

export function citationLabel(citation: Citation, locale: 'th' | 'en'): string {
  return localizeContent(citation.title, locale);
}
