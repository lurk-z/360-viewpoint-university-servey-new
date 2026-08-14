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

export type ChatIntent = 'answer' | 'tour' | 'program-recommendation';
export type ChatFallbackReason =
  | 'not-configured'
  | 'invalid-key'
  | 'quota-exceeded'
  | 'model-unavailable'
  | 'timeout'
  | 'invalid-response'
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
  readonly sceneIds: readonly SceneId[];
}

export interface ProgramRecommendation {
  readonly programId: string;
  readonly reason: string;
}

export interface ChatRequest {
  readonly message: string;
  readonly locale: Locale;
  readonly sceneId: SceneId;
  readonly history: readonly ChatTurn[];
  readonly recommendationProfile?: RecommendationProfile;
}

export interface ChatResponse {
  readonly intent: ChatIntent;
  readonly answered: boolean;
  readonly answer: string;
  readonly citations: readonly Citation[];
  readonly relatedSceneIds: readonly SceneId[];
  readonly relatedProgramIds: readonly string[];
  readonly tourPlan?: TourPlan;
  readonly programRecommendations: readonly ProgramRecommendation[];
  readonly needsRecommendationProfile: boolean;
  readonly fallback: boolean;
  readonly fallbackReason?: ChatFallbackReason;
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
  recommendationProfile: recommendationProfileSchema.optional()
});

export const geminiAnswerSchema = z.object({
  intent: z.enum(['answer', 'tour', 'program-recommendation']),
  answered: z.boolean(),
  answer: z.string().trim().min(1).max(4_000),
  citationIds: z.array(z.string()).max(8),
  relatedSceneIds: z.array(z.string()).max(6),
  destinationSceneId: z.string().max(100),
  programRecommendations: z.array(z.object({
    programId: z.string().max(200),
    reason: z.string().trim().min(1).max(800)
  })).max(3)
});
