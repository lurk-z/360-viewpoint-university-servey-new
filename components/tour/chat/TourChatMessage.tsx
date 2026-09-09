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
  active,
  onSuggestedReply,
  onRecommendationProfileChange,
  onSubmitRecommendation,
  ...actions
}: TourChatMessageProps) {
  return (
    <article className={`tour-chat__message is-${item.role}${item.fallback ? ' is-fallback' : ''}`}>
      <p>{item.text}</p>
      {item.needsRecommendationProfile && active ? (
        <TourChatRecommendationForm
          locale={locale}
          profile={recommendationProfile}
          loading={loading}
          onChange={onRecommendationProfileChange}
          onSubmit={onSubmitRecommendation}
        />
      ) : null}
      {item.suggestedReplies?.length && active ? (
        <div className="tour-chat__suggestions" role="group" aria-label={locale === 'th' ? 'ตัวเลือกตอบกลับ' : 'Suggested replies'}>
          {item.suggestedReplies.map((reply) => (
            <button type="button" disabled={loading} key={`${reply.sceneId ?? ''}:${reply.message}`} onClick={() => onSuggestedReply(reply)}>
              {reply.label}
            </button>
          ))}
        </div>
      ) : null}
      <FacultyCards ids={item.relatedFacultyIds ?? []} locale={locale} content={content} onOpenFaculty={actions.onOpenFaculty} onClose={actions.onClose} />
      <ActivityCards ids={item.relatedActivityIds ?? []} locale={locale} content={content} onOpenActivity={actions.onOpenActivity} onClose={actions.onClose} />
      {item.tourPlan ? <TourRouteCard plan={item.tourPlan} locale={locale} currentSceneId={currentSceneId} content={content} onStartTour={actions.onStartTour} onClose={actions.onClose} /> : null}
      <ProgramRecommendationCards recommendations={item.programRecommendations ?? []} locale={locale} content={content} actions={actions} />
      {item.careerGuidance?.length ? (
        <div className="tour-chat__careers">
          <strong>{locale === 'th' ? 'แนวทางอาชีพและงานที่เกี่ยวข้อง' : 'Career directions and related work'}</strong>
          {item.careerGuidance.flatMap((entry) => {
            const program = content.programs.find((p) => p.id === entry.programId);
            const faculty = content.faculties.find((f) => f.id === program?.facultyId);
            return program && faculty ? [<article key={entry.programId}>
              <strong>{localize(program.name, locale)}</strong>
              <p>{localize(faculty.name, locale)}</p>
              <p>{entry.careers.length ? entry.careers.join(' · ') : locale === 'th' ? 'ยังไม่มีข้อมูลแนวทางอาชีพของหลักสูตรนี้' : 'Career information is not available for this program yet.'}</p>
              <button type="button" onClick={() => actions.onOpenProgram(program.id)}>{locale === 'th' ? 'ดูรายละเอียดหลักสูตร' : 'View program details'}</button>
            </article>] : [];
          })}
        </div>
      ) : null}
      <ProgramComparisonCards ids={item.comparisonProgramIds ?? []} locale={locale} content={content} onOpenProgram={actions.onOpenProgram} />
      {!item.programRecommendations?.length && !item.careerGuidance?.length ? <RelatedProgramCards ids={item.relatedProgramIds ?? []} locale={locale} content={content} onOpenProgram={actions.onOpenProgram} /> : null}
      {!item.tourPlan ? item.relatedSceneIds?.map((targetSceneId) => (
        <button className="tour-chat__scene-link" type="button" key={targetSceneId} onClick={() => {
          if (item.intent === 'tour') actions.onStartTourTo(targetSceneId);
          else actions.onNavigate(targetSceneId);
          actions.onClose();
        }}>
          {localize(resolveTourScene(getScene(targetSceneId), content).title, locale)}
        </button>
      )) : null}
    </article>
  );
}
