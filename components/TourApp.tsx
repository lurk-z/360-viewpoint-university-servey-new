'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  getInfoHotspots,
  getNavigationHotspots,
  getScene,
  getSceneAssetUrls,
  localize,
  tourScenes,
  type InfoHotspot,
  type InfoReference,
  type SceneId
} from '../src/tour-data';
import {
  goToScene,
  loadingProgress,
  message,
  sceneChanged,
  sceneCounter
} from '../src/i18n';
import { useTourStore } from '../src/stores/tour-store';
import { ModalDialog } from './ModalDialog';
import TourViewer, { type TourViewerHandle } from './TourViewer';
import TourMap from './TourMap';

type DialogName = 'info' | 'about' | 'text-tour' | null;

function Icon({ children }: { readonly children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

function ReferenceLine({ reference, locale }: { readonly reference: InfoReference; readonly locale: 'th' | 'en' }) {
  const label = localize(reference.label, locale);
  return (
    <p className="info-reference">
      <strong>{message(locale, 'sourceLabel')}:</strong>
      {reference.url ? (
        <a href={reference.url} target="_blank" rel="noopener noreferrer">{label}</a>
      ) : <span>{label}</span>}
    </p>
  );
}

export default function TourApp() {
  const locale = useTourStore((state) => state.locale);
  const currentSceneId = useTourStore((state) => state.currentSceneId);
  const ready = useTourStore((state) => state.ready);
  const progress = useTourStore((state) => state.progress);
  const introOpen = useTourStore((state) => state.introOpen);
  const error = useTourStore((state) => state.error);
  const sceneInfoVisible = useTourStore((state) => state.sceneInfoVisible);
  const autorotate = useTourStore((state) => state.autorotate);
  const setLocale = useTourStore((state) => state.setLocale);
  const setCurrentScene = useTourStore((state) => state.setCurrentScene);
  const setReady = useTourStore((state) => state.setReady);
  const setProgress = useTourStore((state) => state.setProgress);
  const setIntroOpen = useTourStore((state) => state.setIntroOpen);
  const setError = useTourStore((state) => state.setError);
  const setSceneInfoVisible = useTourStore((state) => state.setSceneInfoVisible);
  const setAutorotate = useTourStore((state) => state.setAutorotate);
  const viewerRef = useRef<TourViewerHandle>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedInfo, setSelectedInfo] = useState<InfoHotspot | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  const scene = getScene(currentSceneId);
  const alternativeLocale = locale === 'th' ? 'en' : 'th';

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'development') {
      const clearDevelopmentCaches = async (): Promise<void> => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if ('caches' in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith('kmuntb-tour-')).map((key) => window.caches.delete(key)));
        }
      };
      void clearDevelopmentCaches().catch(() => undefined);
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  const announce = (text: string): void => {
    setAnnouncement('');
    window.setTimeout(() => setAnnouncement(text), 30);
  };

  const navigate = async (sceneId: SceneId): Promise<void> => {
    if (sceneId === currentSceneId) {
      viewerRef.current?.reset(sceneId, true);
      return;
    }
    try {
      await viewerRef.current?.navigate(sceneId);
    } catch {
      setError(message(locale, 'loadErrorDescription'));
    }
  };

  const openInfo = (hotspot: InfoHotspot): void => {
    setSelectedInfo(hotspot);
    setDialog('info');
  };

  const closeDialog = (): void => {
    setDialog(null);
    setSelectedInfo(null);
  };

  const handleSceneChange = (sceneId: SceneId): void => {
    setCurrentScene(sceneId);
    cacheSceneForOffline(sceneId);
    const index = tourScenes.findIndex((item) => item.id === sceneId) + 1;
    announce(sceneChanged(locale, index, tourScenes.length, localize(getScene(sceneId).title, locale)));
  };

  const handleStart = (): void => {
    setIntroOpen(false);
    window.setTimeout(() => viewerRef.current?.focus(), 320);
  };

  const cacheSceneForOffline = (sceneId: SceneId): void => {
    if (process.env.NODE_ENV === 'development' || !('serviceWorker' in navigator)) return;
    const assets = getSceneAssetUrls(getScene(sceneId));
    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: 'CACHE_SCENE_ASSETS', sceneId, assets });
    }).catch(() => undefined);
  };

  return (
    <div className="app min-h-dvh">
      <div className="skip-links">
        <a href="#tour-viewer">{message(locale, 'skipViewer')}</a>
      </div>

      <header className="app-header">
        <a className="brand" href="#tour-viewer" aria-label="Virtual Open House KMUTNB">
          <span className="brand__mark" aria-hidden="true">
            <Icon><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></Icon>
          </span>
          <span className="brand__copy">
            <strong>Virtual Open House</strong>
            <span>{message(locale, 'brandSubtitle')}</span>
          </span>
        </a>
        <div className="header-actions">
          <button className="header-button" type="button" onClick={() => setDialog('about')}>
            <Icon><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></Icon>
            <span>{message(locale, 'aboutButton')}</span>
          </button>
          <div className="language-switch" role="group" aria-label={message(locale, 'languageLabel')}>
            <button type="button" aria-pressed={locale === 'th'} onClick={() => setLocale('th')}>ไทย</button>
            <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>En</button>
          </div>
        </div>
      </header>

      <main className="tour-layout">
        <section className="viewer-shell" aria-labelledby="scene-title">
          <TourViewer
            ref={viewerRef}
            locale={locale}
            onInfo={openInfo}
            onProgress={setProgress}
            onReady={(sceneId) => {
              setCurrentScene(sceneId);
              cacheSceneForOffline(sceneId);
              setReady(true);
              setProgress(100);
              setError(null);
            }}
            onSceneChange={handleSceneChange}
            onError={() => setError(message(locale, 'loadErrorDescription'))}
            onAutorotate={setAutorotate}
          />
          <div className="viewer-vignette" aria-hidden="true" />

          <aside className="persistent-tour-map" aria-labelledby="persistent-map-title">
            <h2 id="persistent-map-title" className="tour-map-title">{message(locale, 'mapTitle')}</h2>
            <TourMap
              locale={locale}
              currentSceneId={currentSceneId}
              onNavigate={(sceneId) => void navigate(sceneId)}
            />
          </aside>

          <section
            id="scene-panel"
            className={`scene-panel${sceneInfoVisible ? '' : ' is-hidden'}`}
            aria-labelledby="scene-title"
            aria-hidden={!sceneInfoVisible}
            inert={!sceneInfoVisible ? true : undefined}
          >
            <div className="scene-panel__heading">
              <p className="eyebrow">
                {isHydrated
                  ? sceneCounter(locale, tourScenes.findIndex((item) => item.id === scene.id) + 1, tourScenes.length)
                  : sceneCounter(locale, 1, tourScenes.length)}
              </p>
              <button className="close-icon" type="button" aria-label={message(locale, 'hideInfo')} onClick={() => setSceneInfoVisible(false)}>
                <Icon><path d="m6 6 12 12M18 6 6 18" /></Icon>
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
                    <button className="compact-action" type="button" key={hotspot.id} onClick={() => void navigate(hotspot.target)}>
                      {localize(getScene(hotspot.target).title, locale)}
                    </button>
                  ))}
                </div>
              </div>
              <div hidden={getInfoHotspots(scene).length === 0}>
                <h2>{message(locale, 'information')}</h2>
                <div className="compact-actions">
                  {getInfoHotspots(scene).map((hotspot) => (
                    <button className="compact-action" type="button" key={hotspot.id} onClick={() => openInfo(hotspot)}>
                      {localize(hotspot.title, locale)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <p id="viewer-help" className="viewer-help">
            <Icon><path d="M8 11V7a4 4 0 0 1 8 0v4M5 11h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /></Icon>
            <span>{message(locale, 'viewerHelp')}</span>
          </p>

          <div className="control-rail" role="toolbar" aria-label={message(locale, 'controlsLabel')}>
            <button type="button" aria-pressed={autorotate} aria-label={message(locale, 'rotate')} data-tooltip={message(locale, 'rotate')} onClick={() => viewerRef.current?.toggleAutorotate()}>
              <Icon><path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'zoomIn')} data-tooltip={message(locale, 'zoomIn')} onClick={() => viewerRef.current?.zoomIn()}>
              <Icon><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6M21 21l-4.3-4.3" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'zoomOut')} data-tooltip={message(locale, 'zoomOut')} onClick={() => viewerRef.current?.zoomOut()}>
              <Icon><circle cx="11" cy="11" r="7" /><path d="M8 11h6M21 21l-4.3-4.3" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'reset')} data-tooltip={message(locale, 'reset')} onClick={() => viewerRef.current?.reset(currentSceneId, true)}>
              <Icon><path d="M3 12a9 9 0 1 1 9 9M3 12V7M3 12h5" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'enterFullscreen')} data-tooltip={message(locale, 'enterFullscreen')} onClick={() => viewerRef.current?.toggleFullscreen()}>
              <Icon><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></Icon>
            </button>
            <button type="button" aria-pressed={sceneInfoVisible} aria-label={sceneInfoVisible ? message(locale, 'hideInfo') : message(locale, 'showInfo')} data-tooltip={sceneInfoVisible ? message(locale, 'hideInfo') : message(locale, 'showInfo')} onClick={() => setSceneInfoVisible(!sceneInfoVisible)}>
              <Icon><path d="M4 5h16v14H4zM8 9h8M8 13h6" /></Icon>
            </button>
          </div>

          <div className="scene-loader" role="status" hidden={ready}>
            <span className="spinner" aria-hidden="true" />
            <span>{message(locale, 'loadingScene')}</span>
          </div>

          <section id="intro" className={`intro${introOpen ? '' : ' is-closing'}`} aria-labelledby="intro-title" hidden={!introOpen}>
            <div className="intro__card">
              <div className="intro__brand" aria-hidden="true">
                <span className="brand__mark brand__mark--large"><Icon><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></Icon></span>
              </div>
              <p className="eyebrow">{message(locale, 'introEyebrow')}</p>
              <h2 id="intro-title">{message(locale, 'introTitle')}</h2>
              <p>{message(locale, 'introDescription')}</p>
              <div className="initial-loading" role="status" aria-live="polite">
                <progress max={100} value={progress} />
                <span>{ready ? message(locale, 'initialReady') : progress > 0 ? loadingProgress(locale, progress) : message(locale, 'initialLoading')}</span>
              </div>
              {error ? (
                <div className="load-error" role="alert">
                  <strong>{message(locale, 'loadErrorTitle')}</strong>
                  <span>{error}</span>
                  <button className="secondary-button" type="button" onClick={() => window.location.reload()}>{message(locale, 'retry')}</button>
                </div>
              ) : null}
              <div className="intro__actions">
                <button className="primary-button" type="button" disabled={!ready} onClick={handleStart}>
                  <span>{message(locale, 'start')}</span>
                  <Icon><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
                </button>
                <button className="secondary-button" type="button" onClick={() => setDialog('text-tour')}>{message(locale, 'textTour')}</button>
              </div>
            </div>
          </section>
          <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
        </section>

      </main>

      <ModalDialog open={dialog === 'info'} titleId="info-dialog-title" wide onClose={closeDialog}>
        {selectedInfo ? <>
          <p className="eyebrow">{message(locale, 'infoPoint')}</p>
          <h2 id="info-dialog-title">{localize(selectedInfo.title, locale)}</h2>
          <p className="scene-alt-title">{localize(selectedInfo.title, alternativeLocale)}</p>
          <p className="dialog-description">{localize(selectedInfo.description, locale)}</p>
          <ReferenceLine reference={selectedInfo.reference} locale={locale} />
          {selectedInfo.images?.length ? (
            <div className="info-gallery">
              {selectedInfo.images.map((image, index) => (
                <figure key={`${image.src}-${index}`}>
                  <img src={image.src} alt={localize(image.alt, locale)} loading="lazy" />
                  {image.caption ? <figcaption>{localize(image.caption, locale)}</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : null}
        </> : null}
      </ModalDialog>

      <ModalDialog open={dialog === 'about'} titleId="about-dialog-title" onClose={closeDialog}>
        <p className="eyebrow">{message(locale, 'aboutEyebrow')}</p>
        <h2 id="about-dialog-title">{message(locale, 'aboutTitle')}</h2>
        <p className="dialog-description">{message(locale, 'aboutDescription')}</p>
        <dl className="project-facts">
          <dt>{message(locale, 'faculty')}</dt><dd>{message(locale, 'facultyValue')}</dd>
          <dt>{message(locale, 'campus')}</dt><dd>{message(locale, 'campusValue')}</dd>
          <dt>{message(locale, 'creator')}</dt><dd>{message(locale, 'creatorValue')}</dd>
          <dt>{message(locale, 'advisor')}</dt><dd>{message(locale, 'advisorValue')}</dd>
        </dl>
        <h3>{message(locale, 'objectivesTitle')}</h3>
        <ul className="objective-list">
          {(['objective1', 'objective2', 'objective3', 'objective4'] as const).map((key) => <li key={key}>{message(locale, key)}</li>)}
        </ul>
        <p className="privacy-note">{message(locale, 'privacyNote')}</p>
      </ModalDialog>

      <ModalDialog open={dialog === 'text-tour'} titleId="text-tour-title" wide onClose={closeDialog}>
        <p className="eyebrow">{message(locale, 'textTourEyebrow')}</p>
        <h2 id="text-tour-title">{message(locale, 'textTourTitle')}</h2>
        <p className="dialog-description">{message(locale, 'textTourDescription')}</p>
        <div className="text-tour-content">
          {tourScenes.map((item, index) => (
            <article className="text-scene" key={item.id}>
              <h3>{index + 1}. {localize(item.title, locale)}</h3>
              <p className="scene-alt-title">{localize(item.title, alternativeLocale)}</p>
              <p>{localize(item.description, locale)}</p>
              <button className="compact-action" type="button" onClick={() => { closeDialog(); void navigate(item.id); }}>{goToScene(locale, localize(item.title, locale))}</button>
              {getInfoHotspots(item).map((hotspot) => (
                <details key={hotspot.id}>
                  <summary>{localize(hotspot.title, locale)}</summary>
                  <p>{localize(hotspot.description, locale)}</p>
                  <ReferenceLine reference={hotspot.reference} locale={locale} />
                </details>
              ))}
            </article>
          ))}
        </div>
      </ModalDialog>
    </div>
  );
}
