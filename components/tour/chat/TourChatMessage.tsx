'use client';

import { resolveTourScene } from '../../../src/content';
import { getScene, localize } from '../../../src/tour-data';
import TourChatRecommendationForm from './TourChatRecommendationForm';
import {
  ActivityCards,
  FacultyCards,
  ProgramComparisonCards,
  ProgramRecommendationCards,
  RelatedProgramCards,
  TourRouteCard
} from './TourChatCards';
import type { TourChatMessageProps } from './types';

export default function TourChatMessage({
  item,
  locale,
  currentSceneId,
  content,
  recommendationProfile,
  loading,
  onRecommendationProfileChange,
  onSubmitRecommendation,
  ...actions
}: TourChatMessageProps) {
  return (
    <article className={`tour-chat__message is-${item.role}${item.fallback ? ' is-fallback' : ''}`}>
      <p>{item.text}</p>
      {item.needsRecommendationProfile ? (
        <TourChatRecommendationForm
          locale={locale}
          profile={recommendationProfile}
          loading={loading}
          onChange={onRecommendationProfileChange}
          onSubmit={onSubmitRecommendation}
        />
      ) : null}
      <FacultyCards ids={item.relatedFacultyIds ?? []} locale={locale} content={content} onOpenFaculty={actions.onOpenFaculty} onClose={actions.onClose} />
      <ActivityCards ids={item.relatedActivityIds ?? []} locale={locale} content={content} onOpenActivity={actions.onOpenActivity} onClose={actions.onClose} />
      {item.tourPlan ? <TourRouteCard plan={item.tourPlan} locale={locale} currentSceneId={currentSceneId} content={content} onStartTour={actions.onStartTour} onClose={actions.onClose} /> : null}
      <ProgramRecommendationCards recommendations={item.programRecommendations ?? []} locale={locale} content={content} actions={actions} />
      <ProgramComparisonCards ids={item.comparisonProgramIds ?? []} locale={locale} content={content} onOpenProgram={actions.onOpenProgram} />
      {!item.programRecommendations?.length ? <RelatedProgramCards ids={item.relatedProgramIds ?? []} locale={locale} content={content} onOpenProgram={actions.onOpenProgram} /> : null}
      {item.relatedSceneIds?.map((targetSceneId) => (
        <button className="tour-chat__scene-link" type="button" key={targetSceneId} onClick={() => {
          if (item.intent === 'tour') actions.onStartTourTo(targetSceneId);
          else actions.onNavigate(targetSceneId);
          actions.onClose();
        }}>
          {localize(resolveTourScene(getScene(targetSceneId), content).title, locale)}
        </button>
      ))}
    </article>
  );
}
