'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { message } from '../../src/i18n';
import { resolveTourScene, type PublicContentSnapshot } from '../../src/content';
import {
  getMapLandmarkScenes,
  localize,
  tourScenes,
  type Locale,
  type SceneId
} from '../../src/tour-data';
import { ModalDialog } from '../ModalDialog';
import TourIcon from './TourIcon';

function searchableText(sceneId: SceneId, content: PublicContentSnapshot): string {
  const scene = resolveTourScene(tourScenes.find((item) => item.id === sceneId)!, content);
  return [
    scene.id,
    scene.title.th,
    scene.title.en,
    scene.description.th,
    scene.description.en,
    ...scene.tags.th,
    ...scene.tags.en
  ].join(' ').normalize('NFKC').toLocaleLowerCase();
}

export default function TourDestinationDialog({
  open,
  locale,
  content,
  currentSceneId,
  onClose,
  onNavigate
}: {
  readonly open: boolean;
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly currentSceneId: SceneId;
  readonly onClose: () => void;
  readonly onNavigate: (sceneId: SceneId) => void;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().normalize('NFKC').toLocaleLowerCase());
  const landmarkIds = useMemo(() => new Set(getMapLandmarkScenes().map((scene) => scene.id)), []);
  const destinations = useMemo(() => {
    const source = deferredQuery
      ? tourScenes.filter((scene) => searchableText(scene.id, content).includes(deferredQuery))
      : tourScenes.filter((scene) => landmarkIds.has(scene.id));
    return source.map((scene) => resolveTourScene(scene, content));
  }, [content, deferredQuery, landmarkIds]);
  const alternativeLocale = locale === 'th' ? 'en' : 'th';

  return (
    <ModalDialog open={open} titleId="destination-dialog-title" wide closeLabel={message(locale, 'close')} onClose={onClose}>
      <p className="eyebrow">{message(locale, 'destinationMenuEyebrow')}</p>
      <h2 id="destination-dialog-title">{message(locale, 'destinationMenuTitle')}</h2>
      <p className="dialog-description">{message(locale, 'destinationMenuDescription')}</p>
      <label className="destination-search" htmlFor="destination-search-input">
        <span>{message(locale, 'destinationSearchLabel')}</span>
        <span className="destination-search__control">
          <TourIcon><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></TourIcon>
          <input
            id="destination-search-input"
            type="search"
            value={query}
            placeholder={message(locale, 'destinationSearchPlaceholder')}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
      </label>
      <div className="destination-results__heading">
        <strong>{message(locale, deferredQuery ? 'destinationSearchResults' : 'destinationLandmarks')}</strong>
        <span>{destinations.length}</span>
      </div>
      {destinations.length ? (
        <div className="destination-grid" aria-live="polite">
          {destinations.map((scene) => {
            const current = scene.id === currentSceneId;
            return (
              <button
                className="destination-card"
                type="button"
                key={scene.id}
                data-scene-id={scene.id}
                disabled={current}
                aria-current={current ? 'location' : undefined}
                onClick={() => {
                  onClose();
                  onNavigate(scene.id);
                }}
              >
                <span className="destination-card__icon" aria-hidden="true">
                  <TourIcon><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></TourIcon>
                </span>
                <span className="destination-card__copy">
                  <strong>{localize(scene.title, locale)}</strong>
                  <small>{localize(scene.title, alternativeLocale)}</small>
                </span>
                <span className="destination-card__action">
                  {message(locale, current ? 'destinationCurrent' : 'destinationGo')}
                </span>
              </button>
            );
          })}
        </div>
      ) : <p className="destination-empty">{message(locale, 'destinationNoResults')}</p>}
    </ModalDialog>
  );
}
