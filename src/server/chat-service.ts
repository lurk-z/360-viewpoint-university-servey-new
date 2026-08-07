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
        text: `PROGRAM ${item.slug}\nFACULTY: ${faculty?.name.th ?? '-'} / ${faculty?.name.en ?? '-'}\nTH: ${item.name.th} (${item.level.th})\n${item.summary.th}\n${item.description.th}\nการรับสมัคร: ${item.admission.th}\nEN: ${item.name.en} (${item.level.en})\n${item.summary.en}\n${item.description.en}\nAdmission: ${item.admission.en}`
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
  const answer = request.locale === 'th'
    ? 'ขณะนี้ AI ยังไม่พร้อมใช้งาน คุณสามารถเปิดข้อมูลที่เกี่ยวข้องด้านล่างแทนได้'
    : 'The AI assistant is currently unavailable. You can open the related information below instead.';
  return {
    answered: false,
    answer,
    citations: documents.map((document) => document.citation),
    relatedSceneIds: [...new Set(documents.flatMap((document) => document.sceneId ? [document.sceneId] : []))],
    fallback: true
  };
}

export function validateGroundedAnswer(
  value: unknown,
  documents: readonly KnowledgeDocument[]
): Omit<ChatResponse, 'fallback'> | null {
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
      fallback: false
    };
  } catch {
    return createFallbackChatResponse(request, content);
  }
}

export function citationLabel(citation: Citation, locale: 'th' | 'en'): string {
  return localizeContent(citation.title, locale);
}
