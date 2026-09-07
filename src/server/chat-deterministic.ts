import type { ChatFallbackReason, ChatIntent, ChatRequest, ChatResponse, TourPlan } from '../chat';
import { localizeContent, resolveTourScene, type PublicContentSnapshot } from '../content';
import { sortActivities } from '../activities';
import { getInfoHotspots, getScene, localize, tourScenes, type Locale, type SceneId } from '../tour-data';
import {
  buildMultiStopTourPath,
  findTourDestinationCandidates,
  findTourDestinationMentions,
  type TourDestinationCandidate
} from '../tour-routing';
import { localizedFallbackReason } from './chat-errors';
import {
  compactChatLookup,
  contextualProgramIds,
  isActivityListIntent,
  isComparisonIntent,
  isContextReferenceIntent,
  isFacultyOverviewIntent,
  isGenericTourIntent,
  isRecommendationIntent,
  isTourIntent
} from './chat-intents';
import { buildKnowledgeDocuments, findRelatedProgramIds, selectKnowledge } from './chat-knowledge';
import { INTEREST_ALIASES, rankProgramsForProfile } from './chat-program-ranking';

const EMPTY_RESPONSE_EXTENSIONS = {
  relatedActivityIds: [] as readonly string[],
  relatedFacultyIds: [] as readonly string[],
  needsTourPreference: false
} as const;

const TOUR_INTEREST_ALIASES: readonly (readonly string[])[] = [
  ...INTEREST_ALIASES,
  ['อาหาร', 'ของกิน', 'โรงอาหาร', 'food', 'meal', 'cafeteria']
];

function createTourPlan(from: SceneId, stopSceneIds: readonly SceneId[]): TourPlan | undefined {
  const path = buildMultiStopTourPath(from, stopSceneIds, 5);
  const destinationSceneId = path?.stopSceneIds.at(-1);
  return path && destinationSceneId ? { destinationSceneId, stopSceneIds: path.stopSceneIds, sceneIds: path.sceneIds } : undefined;
}

function angularDistance(left: number, right: number): number {
  return Math.abs((((left - right) % 360) + 540) % 360 - 180);
}

export function createCurrentViewResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse {
  const scene = getScene(request.sceneId);
  const visibleHotspot = request.viewYaw === undefined ? undefined : getInfoHotspots(scene)
    .map((hotspot) => ({ hotspot, distance: angularDistance(hotspot.yaw, request.viewYaw!) }))
    .filter((item) => item.distance <= 45)
    .sort((a, b) => a.distance - b.distance)[0]?.hotspot;
  const published = visibleHotspot
    ? content.hotspots.find((item) => item.hotspotId === visibleHotspot.id) ?? content.faculties.find((item) => item.hotspotId === visibleHotspot.id)
    : undefined;
  const resolvedScene = resolveTourScene(scene, content);
  const answer = published
    ? ('title' in published
      ? `${localizeContent(published.title, request.locale)} — ${localizeContent(published.description, request.locale)}`
      : `${localizeContent(published.name, request.locale)} — ${localizeContent(published.description, request.locale)}`)
    : `${localize(resolvedScene.title, request.locale)} — ${localize(resolvedScene.description, request.locale)}`;
  return {
    intent: 'answer', answered: true, answer, relatedSceneIds: [], relatedProgramIds: [], comparisonProgramIds: [],
    programRecommendations: [], needsRecommendationProfile: false, ...EMPTY_RESPONSE_EXTENSIONS, fallback: false
  };
}

function formatActivityDate(startDate: string | undefined, endDate: string | undefined, locale: Locale): string {
  if (!startDate && !endDate) return locale === 'th' ? 'ยังไม่ระบุวันที่' : 'Date not specified';
  const format = (value: string): string => new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00.000Z`));
  const start = startDate ?? endDate ?? '';
  const end = endDate ?? startDate ?? '';
  return start === end ? format(start) : `${format(start)} – ${format(end)}`;
}

export function createActivityListResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse {
  const activities = sortActivities(content.activities);
  const visible = activities.slice(0, 12);
  const answer = activities.length === 0
    ? (request.locale === 'th' ? 'ขณะนี้ยังไม่มีกิจกรรมที่เผยแพร่ในระบบ Admin' : 'There are currently no published activities in Admin.')
    : request.locale === 'th'
      ? `ขณะนี้มีกิจกรรมที่เผยแพร่ ${activities.length} รายการ\n${visible.map((activity, index) => `${index + 1}. ${activity.title.th} — ${formatActivityDate(activity.startDate, activity.endDate, request.locale)}\n${activity.summary.th}`).join('\n')}`
      : `There ${activities.length === 1 ? 'is' : 'are'} ${activities.length} published ${activities.length === 1 ? 'activity' : 'activities'}:\n${visible.map((activity, index) => `${index + 1}. ${activity.title.en} — ${formatActivityDate(activity.startDate, activity.endDate, request.locale)}\n${activity.summary.en}`).join('\n')}`;
  return {
    intent: 'activity-list', answered: activities.length > 0, answer, relatedSceneIds: [], relatedProgramIds: [],
    relatedActivityIds: visible.map((activity) => activity.id), relatedFacultyIds: [], comparisonProgramIds: [],
    programRecommendations: [], needsRecommendationProfile: false, needsTourPreference: false, fallback: false
  };
}

export function createFacultyOverviewResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse {
  const faculties = content.faculties;
  const answer = faculties.length === 0
    ? (request.locale === 'th' ? 'ขณะนี้ยังไม่มีข้อมูลคณะที่เผยแพร่ในระบบ Admin' : 'There are currently no published faculties in Admin.')
    : request.locale === 'th'
      ? `มจพ. วิทยาเขตปราจีนบุรี มีคณะที่เผยแพร่ ${faculties.length} แห่ง\n${faculties.map((faculty, index) => `${index + 1}. ${faculty.name.th} (${content.programs.filter((program) => program.facultyId === faculty.id).length} หลักสูตร)`).join('\n')}\n\nหากต้องการให้ช่วยเลือกคณะหรือหลักสูตร กรุณาระบุความสนใจ วุฒิปัจจุบัน และระดับที่ต้องการเรียนด้านล่าง`
      : `KMUTNB Prachinburi Campus has ${faculties.length} published faculties:\n${faculties.map((faculty, index) => {
        const count = content.programs.filter((program) => program.facultyId === faculty.id).length;
        return `${index + 1}. ${faculty.name.en} (${count} ${count === 1 ? 'program' : 'programs'})`;
      }).join('\n')}\n\nTo find a suitable faculty or program, enter your interests, current qualification, and desired study level below.`;
  return {
    intent: 'faculty-overview', answered: faculties.length > 0, answer, relatedSceneIds: [], relatedProgramIds: [],
    relatedActivityIds: [], relatedFacultyIds: faculties.map((faculty) => faculty.id), comparisonProgramIds: [],
    programRecommendations: [], needsRecommendationProfile: faculties.length > 0, needsTourPreference: false, fallback: false
  };
}

export function findTourPreferenceCandidates(request: ChatRequest, content: PublicContentSnapshot): readonly TourDestinationCandidate[] {
  const meaningfulSceneIds = new Set<SceneId>([
    ...content.faculties.flatMap((faculty) => faculty.sceneId ? [faculty.sceneId] : []),
    ...content.hotspots.map((hotspot) => hotspot.sceneId),
    ...content.activities.flatMap((activity) => activity.sceneId ? [activity.sceneId] : []),
    ...tourScenes.filter((scene) => 'mapLandmark' in scene && scene.mapLandmark === true).map((scene) => scene.id)
  ]);
  const normalizedMessage = compactChatLookup(request.message);
  const directCandidates = findTourDestinationCandidates(request.message, content, request.locale, tourScenes.length)
    .filter((candidate) => meaningfulSceneIds.has(candidate.sceneId));
  const directLeader = directCandidates[0];
  if (directLeader && directLeader.score >= 900 && directLeader.score >= (directCandidates[1]?.score ?? 0) + 200) return [directLeader];
  const manualSceneIds = /(?:กีฬา|ออกกำลังกาย|ฟุตบอล|\bsports?\b|\bexercise\b|\bfootball\b)/iu.test(request.message)
    ? ['multipurposeGym'] as const
    : /(?:หอพัก|ที่พักนักศึกษา|หอชาย|หอหญิง|\bdormitor(?:y|ies)\b|student housing)/iu.test(request.message)
      ? ['maleDormitory', 'femaleDormitory1', 'femaleDormitory2'] as const
      : /(?:ด้านการเรียน|หลักสูตร|คณะ|\bacademic\b|\bstudy\b)/iu.test(request.message)
        ? content.faculties.flatMap((faculty) => faculty.sceneId ? [faculty.sceneId] : [])
        : [];
  if (manualSceneIds.length) {
    return manualSceneIds.filter((sceneId, index, items) => items.indexOf(sceneId) === index).map((sceneId) => ({
      sceneId, label: localize(resolveTourScene(getScene(sceneId), content).title, request.locale), score: 1_000
    }));
  }
  const expandedQueries = [request.message, ...TOUR_INTEREST_ALIASES.flatMap((group) => group.some((term) => {
    const normalizedTerm = compactChatLookup(term);
    return normalizedTerm.length >= 3 && normalizedMessage.includes(normalizedTerm);
  }) ? group : [])];
  const candidateByScene = new Map<SceneId, TourDestinationCandidate>();
  for (const query of expandedQueries) {
    const queryCandidates = findTourDestinationCandidates(query, content, request.locale, tourScenes.length).filter((candidate) => meaningfulSceneIds.has(candidate.sceneId));
    const queryLeaderScore = queryCandidates[0]?.score ?? 0;
    for (const candidate of queryCandidates) {
      const normalizedCandidate = { ...candidate, score: queryLeaderScore ? Math.round((candidate.score / queryLeaderScore) * 1_000) : 0 };
      const current = candidateByScene.get(candidate.sceneId);
      if (!current || normalizedCandidate.score > current.score) candidateByScene.set(candidate.sceneId, normalizedCandidate);
    }
  }
  const candidates = [...candidateByScene.values()].sort((left, right) => right.score - left.score);
  const leadingScore = candidates[0]?.score ?? 0;
  return candidates.filter((candidate) => candidate.score >= Math.max(100, leadingScore - 100)).slice(0, 5);
}

export function createTourPreferenceResponse(request: ChatRequest, content: PublicContentSnapshot, suppliedCandidates?: readonly TourDestinationCandidate[]): ChatResponse {
  const candidates = suppliedCandidates ?? (isGenericTourIntent(request.message) && !request.conversationContext?.awaitingTourPreference ? [] : findTourPreferenceCandidates(request, content));
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
    intent: 'tour', answered: false, answer, relatedSceneIds: [], relatedProgramIds: [], relatedActivityIds: [],
    relatedFacultyIds: [], comparisonProgramIds: [], programRecommendations: [], needsRecommendationProfile: false,
    needsTourPreference: true, fallback: false
  };
}

export function createPreparedTourResponse(request: ChatRequest, plan: TourPlan, destinationLabel?: string): ChatResponse {
  return {
    intent: 'tour', answered: true,
    answer: request.locale === 'th'
      ? `เตรียมเส้นทาง${plan.stopSceneIds.length > 1 ? ` ${plan.stopSceneIds.length} จุด` : ''}ไปยัง ${destinationLabel ?? 'จุดหมายที่เลือก'} แล้ว กดเริ่มพาทัวร์เพื่อเดินทางทีละฉาก`
      : `The ${plan.stopSceneIds.length > 1 ? `${plan.stopSceneIds.length}-stop ` : ''}route to ${destinationLabel ?? 'the selected destination'} is ready. Start the guided tour to move scene by scene.`,
    relatedSceneIds: plan.stopSceneIds, relatedProgramIds: [], comparisonProgramIds: [], tourPlan: plan,
    programRecommendations: [], needsRecommendationProfile: false, ...EMPTY_RESPONSE_EXTENSIONS, fallback: false
  };
}

export function inferFallbackIntent(request: ChatRequest): ChatIntent {
  if (isComparisonIntent(request.message)) return 'program-comparison';
  if (request.recommendationProfile || isRecommendationIntent(request.message)) return 'program-recommendation';
  if (isTourIntent(request.message) || isGenericTourIntent(request.message) || request.conversationContext?.awaitingTourPreference) return 'tour';
  return 'answer';
}

export function deterministicTourPlan(request: ChatRequest, content: PublicContentSnapshot): TourPlan | undefined {
  const candidates = findTourDestinationCandidates(request.message, content, request.locale, 15);
  const mentions = findTourDestinationMentions(request.message, content, request.locale, 5);
  const strong = candidates.filter((candidate) => candidate.score >= 300);
  const multiStopWording = /(และ|แล้วไป|ต่อด้วย|จาก.+ไป|,|;|\band\b|then|after)/iu.test(request.message);
  let destinations = multiStopWording && mentions.length > 1 ? mentions
    : multiStopWording && strong.length > 1 ? strong.slice(0, 5)
      : candidates[0] && (candidates[0].score >= 300 || candidates[0].score >= (candidates[1]?.score ?? 0) + 20) ? [candidates[0]] : [];
  if (destinations.length === 0 && request.conversationContext && isContextReferenceIntent(request.message)) {
    const contextualSceneIds = [
      ...request.conversationContext.lastFacultyIds.flatMap((facultyId) => {
        const sceneId = content.faculties.find((faculty) => faculty.id === facultyId)?.sceneId;
        return sceneId ? [sceneId] : [];
      }),
      ...request.conversationContext.lastSceneIds
    ].filter((sceneId, index, items) => items.indexOf(sceneId) === index);
    destinations = contextualSceneIds.slice(0, multiStopWording ? 5 : 1).map((sceneId) => ({
      sceneId, label: localize(resolveTourScene(getScene(sceneId), content).title, request.locale), score: 1_000
    }));
  }
  return destinations.length ? createTourPlan(request.sceneId, destinations.map((candidate) => candidate.sceneId)) : undefined;
}

export function deterministicComparisonResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse | undefined {
  if (!isComparisonIntent(request.message)) return undefined;
  const programIds = contextualProgramIds(request, content).slice(0, 3);
  if (programIds.length < 2) {
    return {
      intent: 'program-comparison', answered: false,
      answer: request.locale === 'th' ? 'กรุณาระบุหรือเลือกหลักสูตรอย่างน้อย 2 รายการเพื่อเปรียบเทียบ' : 'Please name or select at least two programs to compare.',
      relatedSceneIds: [], relatedProgramIds: programIds, comparisonProgramIds: [], programRecommendations: [],
      needsRecommendationProfile: false, ...EMPTY_RESPONSE_EXTENSIONS, fallback: false
    };
  }
  return {
    intent: 'program-comparison', answered: true,
    answer: request.locale === 'th' ? `เตรียมตารางเปรียบเทียบ ${programIds.length} หลักสูตรจากข้อมูลที่เผยแพร่แล้ว` : `A comparison of ${programIds.length} published programs is ready.`,
    relatedSceneIds: [], relatedProgramIds: programIds, comparisonProgramIds: programIds, programRecommendations: [],
    needsRecommendationProfile: false, ...EMPTY_RESPONSE_EXTENSIONS, fallback: false
  };
}

export function createFallbackChatResponse(request: ChatRequest, content: PublicContentSnapshot, fallbackReason: ChatFallbackReason = 'not-configured'): ChatResponse {
  if (isActivityListIntent(request.message)) return createActivityListResponse(request, content);
  if (isFacultyOverviewIntent(request.message)) return createFacultyOverviewResponse(request, content);
  const intent = inferFallbackIntent(request);
  const comparison = deterministicComparisonResponse(request, content);
  if (comparison) return comparison;
  if (intent === 'program-recommendation' && !request.recommendationProfile) {
    return {
      intent, answered: false,
      answer: request.locale === 'th' ? 'กรอกความสนใจ วุฒิปัจจุบัน และระดับที่ต้องการเรียน เพื่อให้ระบบค้นหาหลักสูตรที่เหมาะสมจากข้อมูล Admin' : 'Tell us your interests, current qualification, and desired study level so the system can match published programs.',
      relatedSceneIds: [], relatedProgramIds: [], comparisonProgramIds: [], programRecommendations: [],
      needsRecommendationProfile: true, ...EMPTY_RESPONSE_EXTENSIONS, fallback: false
    };
  }
  if (intent === 'program-recommendation' && request.recommendationProfile) {
    const recommendations = rankProgramsForProfile(request.recommendationProfile, content, request.locale, 3);
    return {
      intent, answered: recommendations.length > 0,
      answer: recommendations.length > 0 ? localizedFallbackReason(fallbackReason, request.locale) : localizedFallbackReason('no-content', request.locale),
      relatedSceneIds: [], relatedProgramIds: recommendations.map((item) => item.programId), comparisonProgramIds: [],
      programRecommendations: recommendations, needsRecommendationProfile: false, ...EMPTY_RESPONSE_EXTENSIONS,
      fallback: true, fallbackReason: recommendations.length > 0 ? fallbackReason : 'no-content'
    };
  }
  if (intent === 'tour') {
    const candidates = findTourDestinationCandidates(request.message, content, request.locale);
    const tourPlan = deterministicTourPlan(request, content);
    const destination = tourPlan ? candidates.find((candidate) => candidate.sceneId === tourPlan.destinationSceneId) : undefined;
    return {
      intent, answered: Boolean(tourPlan),
      answer: tourPlan
        ? (request.locale === 'th' ? `พบเส้นทางไป ${destination?.label ?? ''} แล้ว กดเริ่มพาทัวร์เพื่อเดินทางทีละฉาก` : `A route to ${destination?.label ?? ''} is ready. Start the guided tour to move scene by scene.`)
        : localizedFallbackReason(fallbackReason, request.locale),
      relatedSceneIds: tourPlan ? [] : candidates.map((candidate) => candidate.sceneId), relatedProgramIds: [],
      comparisonProgramIds: [], tourPlan, programRecommendations: [], needsRecommendationProfile: false,
      ...EMPTY_RESPONSE_EXTENSIONS, fallback: true, fallbackReason
    };
  }
  const documents = selectKnowledge(buildKnowledgeDocuments(content), request.message, request.sceneId).slice(0, 4);
  const citations = documents.map((document) => document.citation);
  return {
    intent, answered: false,
    answer: documents.length ? localizedFallbackReason(fallbackReason, request.locale) : localizedFallbackReason('no-content', request.locale),
    relatedSceneIds: [...new Set(documents.flatMap((document) => document.sceneId ? [document.sceneId] : []))],
    relatedProgramIds: findRelatedProgramIds(request, content, citations), comparisonProgramIds: [], programRecommendations: [],
    needsRecommendationProfile: false, ...EMPTY_RESPONSE_EXTENSIONS, fallback: true,
    fallbackReason: documents.length ? fallbackReason : 'no-content'
  };
}
