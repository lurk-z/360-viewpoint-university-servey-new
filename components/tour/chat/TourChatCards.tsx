'use client';

import type { ProgramRecommendation, TourPlan } from '../../../src/chat';
import { localizeContent, resolveTourScene, type PublicContentSnapshot } from '../../../src/content';
import { message } from '../../../src/i18n';
import { getScene, localize, type Locale, type SceneId } from '../../../src/tour-data';
import type { TourChatActions } from './types';

function formatActivityDate(startDate: string | undefined, endDate: string | undefined, locale: Locale): string {
  if (!startDate && !endDate) return locale === 'th' ? 'ยังไม่ระบุวันที่' : 'Date not specified';
  const format = (value: string): string => new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00.000Z`));
  const start = startDate ?? endDate ?? '';
  const end = endDate ?? startDate ?? '';
  return start === end ? format(start) : `${format(start)} – ${format(end)}`;
}

export function FacultyCards({ ids, locale, content, onOpenFaculty, onClose }: {
  readonly ids: readonly string[];
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly onOpenFaculty: TourChatActions['onOpenFaculty'];
  readonly onClose: TourChatActions['onClose'];
}) {
  if (!ids.length) return null;
  return (
    <div className="tour-chat__faculties">
      <strong>{locale === 'th' ? 'ข้อมูลคณะ' : 'Faculties'}</strong>
      {ids.flatMap((facultyId) => {
        const faculty = content.faculties.find((value) => value.id === facultyId);
        if (!faculty) return [];
        const programCount = content.programs.filter((program) => program.facultyId === faculty.id).length;
        return [
          <button type="button" key={faculty.id} onClick={() => { onOpenFaculty(faculty.id); onClose(); }}>
            <span>{localizeContent(faculty.name, locale)}</span>
            <small>{locale === 'th' ? `${programCount} หลักสูตร` : `${programCount} ${programCount === 1 ? 'program' : 'programs'}`}</small>
          </button>
        ];
      })}
    </div>
  );
}

export function ActivityCards({ ids, locale, content, onOpenActivity, onClose }: {
  readonly ids: readonly string[];
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly onOpenActivity: TourChatActions['onOpenActivity'];
  readonly onClose: TourChatActions['onClose'];
}) {
  if (!ids.length) return null;
  return (
    <div className="tour-chat__activities">
      <strong>{locale === 'th' ? 'กิจกรรมที่เผยแพร่' : 'Published activities'}</strong>
      {ids.flatMap((activityId) => {
        const activity = content.activities.find((value) => value.id === activityId);
        if (!activity) return [];
        return [
          <button type="button" key={activity.id} onClick={() => { onOpenActivity(activity.id); onClose(); }}>
            <span>{localizeContent(activity.title, locale)}</span>
            <small>{formatActivityDate(activity.startDate, activity.endDate, locale)}</small>
            <small>{localizeContent(activity.summary, locale)}</small>
          </button>
        ];
      })}
    </div>
  );
}

export function TourRouteCard({ plan, locale, currentSceneId, content, onStartTour, onClose }: {
  readonly plan: TourPlan;
  readonly locale: Locale;
  readonly currentSceneId: SceneId;
  readonly content: PublicContentSnapshot;
  readonly onStartTour: TourChatActions['onStartTour'];
  readonly onClose: TourChatActions['onClose'];
}) {
  const currentScene = resolveTourScene(getScene(currentSceneId), content);
  return (
    <div className="tour-chat__route-card">
      <strong>{message(locale, 'aiTourRoute')}</strong>
      <span>{localize(resolveTourScene(getScene(plan.destinationSceneId), content).title, locale)}</span>
      <div className="tour-chat__route-stops">
        <small>{localize(currentScene.title, locale)}</small>
        {plan.stopSceneIds.map((stopSceneId) => (
          <small key={stopSceneId}>→ {localize(resolveTourScene(getScene(stopSceneId), content).title, locale)}</small>
        ))}
      </div>
      <small>{message(locale, 'aiTourStepCount')}: {plan.sceneIds.length}</small>
      <button type="button" onClick={() => { onStartTour(plan); onClose(); }}>
        {message(locale, 'aiStartTour')}
      </button>
    </div>
  );
}

export function ProgramRecommendationCards({ recommendations, locale, content, actions }: {
  readonly recommendations: readonly ProgramRecommendation[];
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly actions: Pick<TourChatActions, 'onOpenProgram' | 'onOpenFaculty' | 'onOpenAcademics' | 'onStartTourTo' | 'onClose'>;
}) {
  if (!recommendations.length) return null;
  return (
    <div className="tour-chat__recommendations">
      <strong>{message(locale, 'aiRelatedPrograms')}</strong>
      {recommendations.flatMap((recommendation, index) => {
        const program = content.programs.find((value) => value.id === recommendation.programId);
        const faculty = program ? content.faculties.find((value) => value.id === program.facultyId) : undefined;
        const facultySceneId = faculty?.sceneId;
        if (!program) return [];
        return [
          <article key={program.id}>
            <span>{index + 1}</span>
            <div>
              <h3>{localizeContent(program.name, locale)}</h3>
              {faculty ? <p className="tour-chat__program-faculty">{locale === 'th' ? 'คณะ' : 'Faculty'}: {localizeContent(faculty.name, locale)}</p> : null}
              <p>{recommendation.reason}</p>
              <small>{localizeContent(program.admission, locale)}</small>
              <div>
                <button type="button" onClick={() => actions.onOpenProgram(program.id)}>{message(locale, 'aiViewProgram')}</button>
                {faculty ? <button type="button" onClick={() => actions.onOpenFaculty(faculty.id)}>{message(locale, 'aiViewFaculty')}</button> : null}
                {facultySceneId ? <button type="button" onClick={() => { actions.onStartTourTo(facultySceneId); actions.onClose(); }}>{message(locale, 'aiGuideToFaculty')}</button> : null}
              </div>
            </div>
          </article>
        ];
      })}
      <button className="tour-chat__more-programs" type="button" onClick={actions.onOpenAcademics}>{message(locale, 'aiMorePrograms')}</button>
      <p className="tour-chat__recommendation-disclaimer">{message(locale, 'aiRecommendationDisclaimer')}</p>
    </div>
  );
}

export function ProgramComparisonCards({ ids, locale, content, onOpenProgram }: {
  readonly ids: readonly string[];
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly onOpenProgram: TourChatActions['onOpenProgram'];
}) {
  if (!ids.length) return null;
  return (
    <div className="tour-chat__comparison">
      <strong>{locale === 'th' ? 'เปรียบเทียบหลักสูตร' : 'Program comparison'}</strong>
      <div className="tour-chat__comparison-grid">
        {ids.flatMap((programId) => {
          const program = content.programs.find((value) => value.id === programId);
          const faculty = program ? content.faculties.find((value) => value.id === program.facultyId) : undefined;
          if (!program) return [];
          return [
            <article key={program.id}>
              <h3>{localizeContent(program.name, locale)}</h3>
              {faculty ? <strong>{localizeContent(faculty.name, locale)}</strong> : null}
              {program.department ? <span>{localizeContent(program.department, locale)}</span> : null}
              <span>{localizeContent(program.level, locale)}</span>
              <p>{localizeContent(program.summary, locale)}</p>
              <small>{localizeContent(program.admission, locale)}</small>
              {program.interestTags?.[locale].length || program.careerTags?.[locale].length ? (
                <div className="tour-chat__comparison-tags">
                  {program.interestTags?.[locale].map((tag) => <span key={`interest-${tag}`}>{tag}</span>)}
                  {program.careerTags?.[locale].map((tag) => <span key={`career-${tag}`}>{tag}</span>)}
                </div>
              ) : null}
              <button type="button" onClick={() => onOpenProgram(program.id)}>{message(locale, 'aiViewProgram')}</button>
            </article>
          ];
        })}
      </div>
    </div>
  );
}

export function RelatedProgramCards({ ids, locale, content, onOpenProgram }: {
  readonly ids: readonly string[];
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly onOpenProgram: TourChatActions['onOpenProgram'];
}) {
  if (!ids.length) return null;
  return (
    <div className="tour-chat__programs">
      <strong>{message(locale, 'aiRelatedPrograms')}</strong>
      {ids.flatMap((programId) => {
        const program = content.programs.find((item) => item.id === programId);
        const faculty = program ? content.faculties.find((item) => item.id === program.facultyId) : undefined;
        return program ? [
          <button type="button" key={program.id} onClick={() => onOpenProgram(program.id)}>
            <span>{localizeContent(program.name, locale)}</span>
            {faculty ? <small>{locale === 'th' ? 'คณะ' : 'Faculty'}: {localizeContent(faculty.name, locale)}</small> : null}
          </button>
        ] : [];
      })}
    </div>
  );
}
