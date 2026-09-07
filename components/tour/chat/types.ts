import type { FormEvent } from 'react';
import type {
  ChatFallbackReason,
  ChatIntent,
  ChatTurn,
  ProgramRecommendation,
  RecommendationProfile,
  TourPlan
} from '../../../src/chat';
import type { PublicContentSnapshot } from '../../../src/content';
import type { Locale, SceneId } from '../../../src/tour-data';

export interface DisplayMessage extends ChatTurn {
  readonly id: number;
  readonly relatedSceneIds?: readonly SceneId[];
  readonly relatedProgramIds?: readonly string[];
  readonly relatedActivityIds?: readonly string[];
  readonly relatedFacultyIds?: readonly string[];
  readonly intent?: ChatIntent;
  readonly tourPlan?: TourPlan;
  readonly programRecommendations?: readonly ProgramRecommendation[];
  readonly comparisonProgramIds?: readonly string[];
  readonly needsRecommendationProfile?: boolean;
  readonly needsTourPreference?: boolean;
  readonly fallback?: boolean;
  readonly fallbackReason?: ChatFallbackReason;
}

export interface TourChatActions {
  readonly onNavigate: (sceneId: SceneId) => void;
  readonly onOpenProgram: (programId: string) => void;
  readonly onOpenFaculty: (facultyId: string) => void;
  readonly onOpenActivity: (activityId: string) => void;
  readonly onOpenAcademics: () => void;
  readonly onStartTour: (plan: TourPlan) => void;
  readonly onStartTourTo: (sceneId: SceneId) => void;
  readonly onClose: () => void;
}

export interface TourChatMessageProps extends TourChatActions {
  readonly item: DisplayMessage;
  readonly locale: Locale;
  readonly currentSceneId: SceneId;
  readonly content: PublicContentSnapshot;
  readonly recommendationProfile: RecommendationProfile;
  readonly loading: boolean;
  readonly onRecommendationProfileChange: (profile: RecommendationProfile) => void;
  readonly onSubmitRecommendation: (event: FormEvent<HTMLFormElement>) => void;
}
