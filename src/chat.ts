import { z } from 'zod';
import { isSceneId, type LocalizedContent } from './content';
import type { Locale, SceneId } from './tour-data';

export type CitationKind = 'faculty' | 'program' | 'activity' | 'hotspot';

export interface Citation {
  readonly id: string;
  readonly kind: CitationKind;
  readonly title: LocalizedContent;
  readonly url?: string;
}

export interface ChatTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export type ChatIntent =
  | 'answer'
  | 'tour'
  | 'program-recommendation'
  | 'program-comparison'
  | 'activity-list'
  | 'faculty-overview'
  | 'career-guidance';
export type ChatFallbackReason =
  | 'not-configured'
  | 'invalid-key'
  | 'quota-exceeded'
  | 'model-unavailable'
  | 'timeout'
  | 'invalid-response'
  | 'rate-limited'
  | 'no-content';

export type CurrentQualification = 'm3' | 'm6-pvoc' | 'high-vocational' | 'bachelor' | 'other';
export type DesiredStudyLevel = 'vocational' | 'bachelor' | 'transfer' | 'master' | 'unsure';

export interface RecommendationProfile {
  readonly interests: string;
  readonly currentQualification: CurrentQualification;
  readonly desiredLevel: DesiredStudyLevel;
}

export interface TourPlan {
  readonly destinationSceneId: SceneId;
  readonly stopSceneIds: readonly SceneId[];
  readonly sceneIds: readonly SceneId[];
}

export interface ProgramRecommendation {
  readonly programId: string;
  readonly facultyId: string;
  readonly reason: string;
}

export interface ChatConversationContext {
  readonly lastProgramIds: readonly string[];
  readonly lastFacultyIds: readonly string[];
  readonly lastSceneIds: readonly SceneId[];
  readonly awaitingTourPreference: boolean;
  readonly awaitingRecommendationProfile?: boolean;
  readonly guidanceGoal?: 'program' | 'career';
}

export interface ChatSuggestedReply {
  readonly label: string;
  readonly message: string;
  /** An explicit destination chosen by the visitor; the server still validates the route. */
  readonly sceneId?: SceneId;
}

export interface CareerGuidance {
  readonly programId: string;
  readonly facultyId: string;
  readonly careers: readonly string[];
}

export interface ChatRequest {
  readonly message: string;
  readonly locale: Locale;
  readonly sceneId: SceneId;
  readonly history: readonly ChatTurn[];
  readonly viewYaw?: number;
  readonly conversationContext?: ChatConversationContext;
  readonly recommendationProfile?: RecommendationProfile;
  readonly selectedTourSceneId?: SceneId;
}

export interface ChatResponse {
  readonly intent: ChatIntent;
  readonly answered: boolean;
  readonly answer: string;
  readonly relatedSceneIds: readonly SceneId[];
  readonly relatedProgramIds: readonly string[];
  readonly relatedActivityIds: readonly string[];
  readonly relatedFacultyIds: readonly string[];
  readonly comparisonProgramIds: readonly string[];
  readonly tourPlan?: TourPlan;
  readonly programRecommendations: readonly ProgramRecommendation[];
  readonly needsRecommendationProfile: boolean;
  readonly needsTourPreference: boolean;
  readonly fallback: boolean;
  readonly fallbackReason?: ChatFallbackReason;
  readonly suggestedReplies?: readonly ChatSuggestedReply[];
  readonly careerGuidance?: readonly CareerGuidance[];
  readonly suggestedInterests?: string;
}

const recommendationProfileSchema = z.object({
  interests: z.string().trim().min(2).max(300),
  currentQualification: z.enum(['m3', 'm6-pvoc', 'high-vocational', 'bachelor', 'other']),
  desiredLevel: z.enum(['vocational', 'bachelor', 'transfer', 'master', 'unsure'])
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  locale: z.enum(['th', 'en']),
  sceneId: z.string().refine(isSceneId, 'Unknown scene'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().trim().min(1).max(1_000)
  })).max(6).default([]),
  viewYaw: z.number().finite().min(-180).max(180).optional(),
  selectedTourSceneId: z.string().refine(isSceneId, 'Unknown destination').optional(),
  conversationContext: z.object({
    lastProgramIds: z.array(z.string().uuid()).max(3).default([]),
    lastFacultyIds: z.array(z.string().uuid()).max(5).default([]),
    lastSceneIds: z.array(z.string().refine(isSceneId, 'Unknown scene')).max(5).default([]),
    awaitingTourPreference: z.boolean().default(false),
    awaitingRecommendationProfile: z.boolean().optional(),
    guidanceGoal: z.enum(['program', 'career']).optional()
  }).optional(),
  recommendationProfile: recommendationProfileSchema.optional()
});

export const geminiAnswerSchema = z.object({
  intent: z.enum(['answer', 'tour', 'program-recommendation', 'program-comparison']),
  answered: z.boolean(),
  answer: z.string().trim().min(1).max(4_000),
  citationIds: z.array(z.string()).max(8),
  relatedSceneIds: z.array(z.string()).max(6),
  destinationSceneIds: z.array(z.string().max(100)).max(5),
  comparisonProgramIds: z.array(z.string().max(200)).max(3),
  programRecommendations: z.array(z.object({
    programId: z.string().max(200),
    reason: z.string().trim().min(1).max(800)
  })).max(3)
});
