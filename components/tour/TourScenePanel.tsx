'use client';

import { message, sceneCounter } from '../../src/i18n';
import { resolveTourScene, type FacultyContent, type PublicContentSnapshot } from '../../src/content';
import {
  getNavigationHotspots,
  getScene,
  localize,
  type InfoHotspot,
  type Locale,
  type SceneId,
  type TourScene
} from '../../src/tour-data';
import type { TourSupplementalMediaGroup } from '../../src/tour-supplemental-media';
import TourIcon from './TourIcon';

interface TourScenePanelProps {
  readonly scene: TourScene;
  readonly sceneIndex: number;
  readonly sceneCount: number;
  readonly locale: Locale;
  readonly hydrated: boolean;
  readonly open: boolean;
  readonly compactOverlayOpen: boolean;
  readonly introOpen: boolean;
  readonly content: PublicContentSnapshot;
  readonly infoHotspots: readonly InfoHotspot[];
  readonly supplementalMediaGroups: readonly TourSupplementalMediaGroup[];
  readonly faculty?: FacultyContent;
  readonly onToggleCompactInfo: () => void;
  readonly onClose: () => void;
  readonly onNavigate: (sceneId: SceneId) => void;
  readonly onOpenInfo: (hotspot: InfoHotspot) => void;
  readonly onOpenSupplementalMedia: (group: TourSupplementalMediaGroup) => void;
  readonly onOpenAcademics: (facultyId: string) => void;
}

export default function TourScenePanel({
  scene,
  sceneIndex,
  sceneCount,
  locale,
  hydrated,
  open,
  compactOverlayOpen,
  introOpen,
  content,
  infoHotspots,
  supplementalMediaGroups,
  faculty,
  onToggleCompactInfo,
  onClose,
  onNavigate,
  onOpenInfo,
  onOpenSupplementalMedia,
  onOpenAcademics
}: TourScenePanelProps) {
  const alternativeLocale = locale === 'th' ? 'en' : 'th';

  return <>
    <button
      className="compact-scene-summary"
      type="button"
      hidden={introOpen}
      aria-expanded={compactOverlayOpen}
      aria-controls="scene-panel"
      aria-label={message(locale, compactOverlayOpen ? 'hideInfo' : 'showInfo')}
      onClick={onToggleCompactInfo}
    >
      <span>{sceneCounter(locale, sceneIndex, sceneCount)}</span>
      <strong>{localize(scene.title, locale)}</strong>
      <TourIcon><path d="M9 18l6-6-6-6" /></TourIcon>
    </button>

    <section
      id="scene-panel"
      className={`scene-panel${open ? '' : ' is-hidden'}`}
      aria-labelledby="scene-title"
      aria-hidden={!open}
      inert={!open ? true : undefined}
    >
      <div className="scene-panel__heading">
        <p className="eyebrow">
          {sceneCounter(locale, hydrated ? sceneIndex : 1, sceneCount)}
        </p>
        <button className="close-icon" type="button" aria-label={message(locale, 'hideInfo')} onClick={onClose}>
          <TourIcon><path d="m6 6 12 12M18 6 6 18" /></TourIcon>
        </button>
      </div>
      <h1 id="scene-title">{localize(scene.title, locale)}</h1>
      <p className="scene-alt-title">{localize(scene.title, alternativeLocale)}</p>
      <p className="scene-description">{localize(scene.description, locale)}</p>
      <div className="tag-list" aria-label={message(locale, 'tagListLabel')}>
        {scene.tags[locale].map((tag) => <span className="tag" key={tag}>{tag}</span>)}
      </div>
      <div className="scene-actions">
        <div>
          <h2>{message(locale, 'destinations')}</h2>
          <div className="compact-actions">
            {getNavigationHotspots(scene).map((hotspot) => (
              <button className="compact-action" type="button" key={hotspot.id} onClick={() => onNavigate(hotspot.target)}>
                {localize(resolveTourScene(getScene(hotspot.target), content).title, locale)}
              </button>
            ))}
          </div>
        </div>
        <div hidden={infoHotspots.length === 0}>
          <h2>{message(locale, 'information')}</h2>
          <div className="compact-actions">
            {infoHotspots.map((hotspot) => (
              <button className="compact-action" type="button" key={hotspot.id} onClick={() => onOpenInfo(hotspot)}>
                {localize(hotspot.title, locale)}
              </button>
            ))}
          </div>
        </div>
        {supplementalMediaGroups.length ? (
          <div>
            <h2>{locale === 'th' ? 'สื่อภายในอาคาร' : 'Building media'}</h2>
            <div className="compact-actions">
              {supplementalMediaGroups.map((group) => (
                <button className="compact-action" type="button" key={group.id} aria-haspopup="dialog" onClick={() => onOpenSupplementalMedia(group)}>
                  {localize(group.title, locale)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {faculty ? (
          <div>
            <h2>{message(locale, 'academicsEyebrow')}</h2>
            <div className="compact-actions">
              <button className="compact-action" type="button" onClick={() => onOpenAcademics(faculty.id)}>
                {message(locale, 'academicsButton')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  </>;
}
