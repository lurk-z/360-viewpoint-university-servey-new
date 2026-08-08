'use client';

import { useEffect, useMemo, useState } from 'react';
import { sortActivities } from '../src/activities';
import { localizeContent, type ActivityContent, type PublicContentSnapshot } from '../src/content';
import { message } from '../src/i18n';
import { sceneIds, type Locale, type SceneId } from '../src/tour-data';
import { ModalDialog } from './ModalDialog';

interface ActivitiesDialogProps {
  readonly open: boolean;
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly onClose: () => void;
  readonly onNavigate: (sceneId: SceneId) => void;
  readonly onOpenImage: (activity: ActivityContent) => void;
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function activityDate(activity: ActivityContent, locale: Locale): string {
  if (!activity.startDate && !activity.endDate) return message(locale, 'activityNoDate');
  if (!activity.endDate || activity.endDate === activity.startDate) {
    return formatDate(activity.startDate ?? activity.endDate ?? '', locale);
  }
  return `${formatDate(activity.startDate ?? activity.endDate, locale)} – ${formatDate(activity.endDate, locale)}`;
}

export default function ActivitiesDialog({
  open,
  locale,
  content,
  onClose,
  onNavigate,
  onOpenImage
}: ActivitiesDialogProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const activities = useMemo(() => sortActivities(content.activities), [content.activities]);
  const selected = activities.find((activity) => activity.id === selectedId);
  const selectedSceneId = selected?.sceneId && sceneIds.includes(selected.sceneId as SceneId)
    ? selected.sceneId as SceneId
    : undefined;
  const alternativeLocale = locale === 'th' ? 'en' : 'th';

  useEffect(() => {
    if (!open) setSelectedId(undefined);
    if (selectedId && !content.activities.some((activity) => activity.id === selectedId)) setSelectedId(undefined);
  }, [content.activities, open, selectedId]);

  return (
    <ModalDialog open={open} titleId="activities-dialog-title" wide closeLabel={message(locale, 'close')} onClose={onClose}>
      <p className="eyebrow">{message(locale, 'activitiesEyebrow')}</p>
      <h2 id="activities-dialog-title">{message(locale, 'activitiesTitle')}</h2>
      <p className="dialog-description">{message(locale, 'activitiesDescription')}</p>
      <div className={`activities-layout${selected ? ' has-activity' : ''}`}>
        <nav className="activities-list" aria-label={message(locale, 'activitiesListLabel')}>
          {activities.length ? activities.map((activity) => (
            <button
              className={selectedId === activity.id ? 'is-active' : ''}
              type="button"
              aria-pressed={selectedId === activity.id}
              key={activity.id}
              onClick={() => setSelectedId(activity.id)}
            >
              <strong>{localizeContent(activity.title, locale)}</strong>
              <span>{activityDate(activity, locale)}</span>
              <small>{localizeContent(activity.summary, locale)}</small>
            </button>
          )) : <p className="activities-empty">{message(locale, 'noActivities')}</p>}
        </nav>
        <article className="activities-detail" aria-live="polite">
          {selected ? <>
            <button className="activities-back" type="button" onClick={() => setSelectedId(undefined)}>
              <span aria-hidden="true">←</span> {message(locale, 'backToActivities')}
            </button>
            <p className="eyebrow">{message(locale, 'activityDetails')}</p>
            <h3>{localizeContent(selected.title, locale)}</h3>
            <p className="scene-alt-title">{localizeContent(selected.title, alternativeLocale)}</p>
            {selected.imageUrl ? (
              <button className="activities-image-button" type="button" onClick={() => onOpenImage(selected)}>
                <img src={selected.imageUrl} alt={localizeContent(selected.title, locale)} loading="lazy" />
              </button>
            ) : null}
            <dl className="activities-facts"><dt>{message(locale, 'activityDate')}</dt><dd>{activityDate(selected, locale)}</dd></dl>
            <p className="activities-summary">{localizeContent(selected.summary, locale)}</p>
            <p className="activities-description">{localizeContent(selected.description, locale)}</p>
            <p className="activities-source">
              <strong>{message(locale, 'sourceLabel')}:</strong>
              {selected.source.url
                ? <a href={selected.source.url} target="_blank" rel="noopener noreferrer">{localizeContent(selected.source.label, locale)}</a>
                : <span>{localizeContent(selected.source.label, locale)}</span>}
            </p>
            {selectedSceneId ? (
              <button className="primary-button activities-navigate" type="button" onClick={() => { onClose(); onNavigate(selectedSceneId); }}>
                {message(locale, 'activityGoToScene')}
              </button>
            ) : null}
          </> : <p className="activities-empty activities-empty--prompt">{message(locale, 'selectActivity')}</p>}
        </article>
      </div>
    </ModalDialog>
  );
}
