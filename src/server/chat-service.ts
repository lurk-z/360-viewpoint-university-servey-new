import { GoogleGenAI } from '@google/genai';
import {
  geminiAnswerSchema,
  type ChatIntent,
  type ChatRequest,
  type ChatResponse,
  type Citation,
  type ProgramRecommendation,
  type RecommendationProfile,
  type TourPlan
} from '../chat';
import { isSceneId, type PublicContentSnapshot } from '../content';
import { getScene, localize, type SceneId } from '../tour-data';
import { buildMultiStopTourPath, buildTourDestinationCatalog, findTourDestinationCandidates } from '../tour-routing';
import { consumeAiQuota } from './ai-usage';
import { classifyGeminiError, logGeminiFailure } from './chat-errors';
import {
  isActivityListIntent,
  isCareerIntent,
  isCurrentViewIntent,
  isFacultyOverviewIntent,
  isGenericTourIntent,
  isProgramListIntent,
  isRecommendationIntent,
  isTourIntent
} from './chat-intents';
import {
  buildKnowledgeDocuments,
  findRelatedProgramIds,
  selectKnowledge,
  type KnowledgeDocument
} from './chat-knowledge';
import { profileLookupText, rankProgramsForProfile } from './chat-program-ranking';
import {
  createActivityListResponse,
  createCurrentViewResponse,
  createFacultyOverviewResponse,
  createFallbackChatResponse,
  createPreparedTourResponse,
  createTourPreferenceResponse,
  deterministicComparisonResponse,
  deterministicTourPlan,
  findTourPreferenceCandidates
} from './chat-deterministic';
import { createAcademicGuidanceResponse, createDormitoryResponse, createProgramFacultyResponse, createProgramListResponse, mentionedFacultyIds } from './chat-guidance';

export { classifyGeminiError } from './chat-errors';
export { buildKnowledgeDocuments, findRelatedProgramIds } from './chat-knowledge';
export { rankProgramsForProfile } from './chat-program-ranking';
export { createFallbackChatResponse } from './chat-deterministic';

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

const GEMINI_TIMEOUT_MS = 20_000;
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const EMPTY_RESPONSE_EXTENSIONS = {
  relatedActivityIds: [] as readonly string[],
  relatedFacultyIds: [] as readonly string[],
  needsTourPreference: false
} as const;

function createTourPlan(from: SceneId, stopSceneIds: readonly SceneId[]): TourPlan | undefined {
  const path = buildMultiStopTourPath(from, stopSceneIds, 5);
  const destinationSceneId = path?.stopSceneIds.at(-1);
  return path && destinationSceneId
    ? { destinationSceneId, stopSceneIds: path.stopSceneIds, sceneIds: path.sceneIds }
    : undefined;
}

export function validateGroundedAnswer(value: unknown, documents: readonly KnowledgeDocument[]): ValidatedGeminiAnswer | null {
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

function recommendationProfilePrompt(profile?: RecommendationProfile): string {
  if (!profile) return '(none)';
  return `INTERESTS: ${profile.interests}\nCURRENT QUALIFICATION: ${profile.currentQualification}\nDESIRED LEVEL: ${profile.desiredLevel}`;
}

export async function answerGroundedQuestion(request: ChatRequest, content: PublicContentSnapshot): Promise<ChatResponse> {
  if (request.selectedTourSceneId) {
    const plan = createTourPlan(request.sceneId, [request.selectedTourSceneId]);
    return plan
      ? createPreparedTourResponse(request, plan, localize(getScene(request.selectedTourSceneId).title, request.locale))
      : createTourPreferenceResponse(request, content, []);
  }
  if (isCurrentViewIntent(request.message)) return createCurrentViewResponse(request, content);
  if (isActivityListIntent(request.message)) return createActivityListResponse(request, content);
  if (isGenericTourIntent(request.message)) return createTourPreferenceResponse({ ...request, conversationContext: undefined }, content);
  const explicitTour = isTourIntent(request.message);
  if (!explicitTour && isFacultyOverviewIntent(request.message)) {
    return mentionedFacultyIds(request.message, content).length
      ? createProgramListResponse(request, content)
      : createFacultyOverviewResponse(request, content);
  }

  const comparison = deterministicComparisonResponse(request, content);
  if (comparison) return comparison;

  if (!explicitTour && (isCareerIntent(request.message) || isRecommendationIntent(request.message) || request.recommendationProfile)) {
    return createAcademicGuidanceResponse(request, content);
  }
  const programFacultyResponse = !explicitTour ? createProgramFacultyResponse(request, content) : undefined;
  if (programFacultyResponse) return programFacultyResponse;
  if (!explicitTour && isProgramListIntent(request.message)) return createProgramListResponse(request, content);
  if (!explicitTour && request.conversationContext?.awaitingRecommendationProfile
    && /สนใจ|อยาก|ชอบ|ม\.?\s*[36]|ปวช|ปวส|ปริญญา|interest|study|qualification/iu.test(request.message)) {
    return createAcademicGuidanceResponse(request, content);
  }

  const recommendationIntent = Boolean(request.recommendationProfile) || isRecommendationIntent(request.message);
  if (recommendationIntent && !request.recommendationProfile) return createFallbackChatResponse(request, content);

  const tourRequest = isTourIntent(request.message)
    || isGenericTourIntent(request.message)
    || request.conversationContext?.awaitingTourPreference === true;
  if (request.conversationContext?.awaitingTourPreference && /^(กิจกรรม|activities?)$/iu.test(request.message.trim())) {
    return createActivityListResponse(request, content);
  }
  if (isGenericTourIntent(request.message) && !request.conversationContext?.awaitingTourPreference) {
    return createTourPreferenceResponse(request, content);
  }

  if (tourRequest) {
    if (request.conversationContext?.awaitingTourPreference && !isTourIntent(request.message)) {
      const preferenceCandidates = findTourPreferenceCandidates(request, content);
      if (preferenceCandidates.length !== 1) return createTourPreferenceResponse(request, content, preferenceCandidates);
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

  const dormitoryResponse = createDormitoryResponse(request, content);
  if (dormitoryResponse) return dormitoryResponse;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your-gemini-api-key') return createFallbackChatResponse(request, content, 'not-configured');

  const deterministicRecommendations = request.recommendationProfile
    ? rankProgramsForProfile(request.recommendationProfile, content, request.locale, 3)
    : [];
  if (recommendationIntent && deterministicRecommendations.length === 0) return createFallbackChatResponse(request, content, 'no-content');

  const allDocuments = buildKnowledgeDocuments(content);
  const validContextProgramIds = request.conversationContext?.lastProgramIds.filter((id) => content.programs.some((program) => program.id === id)) ?? [];
  const validContextFacultyIds = request.conversationContext?.lastFacultyIds.filter((id) => content.faculties.some((faculty) => faculty.id === id)) ?? [];
  const validContextSceneIds = request.conversationContext?.lastSceneIds.filter(isSceneId) ?? [];
  const contextDocumentIds = new Set([...validContextProgramIds, ...validContextFacultyIds]);
  const selectedDocuments = selectKnowledge(
    allDocuments,
    request.recommendationProfile ? `${request.message} ${profileLookupText(request.recommendationProfile)}` : request.message,
    request.sceneId,
    recommendationIntent
  );
  const documents = [
    ...allDocuments.filter((document) => contextDocumentIds.has(document.citation.id)),
    ...selectedDocuments
  ].filter((document, index, items) => items.findIndex((candidate) => candidate.citation.id === document.citation.id) === index)
    .filter((document) => !recommendationIntent
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
Scope recommendations to Prachinburi Campus. University-wide admission or career pages may include other campuses; never infer that those programs are taught here.
Career directions describe possibilities, not guaranteed employment, salary, professional licences or admission. Use published career tags and program descriptions only.
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
