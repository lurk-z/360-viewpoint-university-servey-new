'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  getInfoHotspots,
  getNavigationHotspots,
  getScene,
  getSceneAssetUrls,
  localize,
  tourScenes,
  type InfoHotspot,
  type InfoImage,
  type InfoReference,
  type SceneId
} from '../src/tour-data';
import {
  goToScene,
  imageCounter,
  loadingProgress,
  message,
  sceneChanged,
  sceneCounter
} from '../src/i18n';
import { useTourStore } from '../src/stores/tour-store';
import type { TourPlan } from '../src/chat';
import {
  resolveInfoHotspot,
  resolveTourScene
} from '../src/content';
import { ModalDialog } from './ModalDialog';
import ActivitiesDialog from './ActivitiesDialog';
import FacultyProgramsDialog from './FacultyProgramsDialog';
import TourChat from './TourChat';
import TourViewer, { type TourViewerHandle } from './TourViewer';
import TourMap, { type TourMapMode } from './TourMap';
import { usePublicContent } from './usePublicContent';
import { findShortestTourPath } from '../src/tour-routing';

type DialogName = 'info' | 'academics' | 'activities' | 'about' | 'text-tour' | null;
type CompactOverlay = 'info' | 'map' | 'tools' | 'chat' | null;
const FITM_LOGO_URL = '/mainimages/Logo_FitM/FITM_LOGO.png';
const COMPACT_TOUR_QUERY = '(max-width: 1024px)';

function subscribeCompactTourUi(callback: () => void): () => void {
  const media = window.matchMedia(COMPACT_TOUR_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getCompactTourUiSnapshot(): boolean {
  return window.matchMedia(COMPACT_TOUR_QUERY).matches;
}

function getCompactTourUiServerSnapshot(): boolean {
  return false;
}

function useCompactTourUi(): boolean {
  return useSyncExternalStore(
    subscribeCompactTourUi,
    getCompactTourUiSnapshot,
    getCompactTourUiServerSnapshot
  );
}

interface InfoSelection {
  readonly sceneId: SceneId;
  readonly hotspotId: string;
}

interface ImageViewerState {
  readonly images: readonly InfoImage[];
  readonly index: number;
}

interface AcademicSelection {
  readonly facultyId?: string;
  readonly programId?: string;
}

interface GuidedTourState extends TourPlan {
  readonly currentIndex: number;
}

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
  const compactTourUi = useCompactTourUi();
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
  const [selectedInfoSelection, setSelectedInfoSelection] = useState<InfoSelection | null>(null);
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const { content } = usePublicContent();
  const [desktopChatOpen, setDesktopChatOpen] = useState(false);
  const [compactOverlay, setCompactOverlay] = useState<CompactOverlay>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [academicSelection, setAcademicSelection] = useState<AcademicSelection>({});
  const [mapExpanded, setMapExpanded] = useState(false);
  const [guidedTour, setGuidedTour] = useState<GuidedTourState | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuButtonRef = useRef<HTMLButtonElement>(null);

  const activeSceneId = tourScenes.some((item) => item.id === currentSceneId)
    ? currentSceneId
    : tourScenes[0]?.id ?? 'entrance';
  const scene = resolveTourScene(getScene(activeSceneId), content);
  const sceneIndex = tourScenes.findIndex((item) => item.id === scene.id) + 1;
  const sceneInfoHotspots = getInfoHotspots(scene).map((hotspot) => resolveInfoHotspot(hotspot, content));
  const sceneFaculty = content.faculties.find((faculty) => faculty.sceneId === scene.id);
  const selectedInfoScene = selectedInfoSelection
    ? tourScenes.find((item) => item.id === selectedInfoSelection.sceneId)
    : undefined;
  const selectedInfo = selectedInfoSelection && selectedInfoScene
    ? getInfoHotspots(selectedInfoScene)
      .find((hotspot) => hotspot.id === selectedInfoSelection.hotspotId)
    : undefined;
  const resolvedSelectedInfo = selectedInfo ? resolveInfoHotspot(selectedInfo, content) : undefined;
  const alternativeLocale = locale === 'th' ? 'en' : 'th';
  const activeImage = imageViewer?.images[imageViewer.index];
  const guidedDestinationScene = guidedTour
    ? resolveTourScene(getScene(guidedTour.destinationSceneId), content)
    : undefined;
  const guidedDestinationFaculty = guidedTour
    ? content.faculties.find((faculty) => faculty.sceneId === guidedTour.destinationSceneId)
    : undefined;
  const guidedDestinationInfo = guidedTour
    ? getInfoHotspots(getScene(guidedTour.destinationSceneId))[0]
    : undefined;
  const chatOpen = compactTourUi ? compactOverlay === 'chat' : desktopChatOpen;
  const scenePanelOpen = compactTourUi ? compactOverlay === 'info' : sceneInfoVisible;
  const compactMapHidden = compactTourUi && compactOverlay !== null && compactOverlay !== 'map';
  const mapMode: TourMapMode = mapExpanded
    ? 'fullscreen'
    : compactTourUi
      ? compactOverlay === 'map' ? 'panel' : 'preview'
      : 'panel';

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (currentSceneId !== activeSceneId) setCurrentScene(activeSceneId);
  }, [activeSceneId, currentSceneId, setCurrentScene]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setHeaderMenuOpen(false);
    setMapExpanded(false);
    if (compactTourUi) setDesktopChatOpen(false);
    else setCompactOverlay(null);
  }, [compactTourUi]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const closeMenu = (event: PointerEvent): void => {
      if (headerMenuRef.current?.contains(event.target as Node)) return;
      setHeaderMenuOpen(false);
    };
    const closeMenuWithKeyboard = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setHeaderMenuOpen(false);
      headerMenuButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeMenu);
    window.addEventListener('keydown', closeMenuWithKeyboard);
    const frame = window.requestAnimationFrame(() => {
      headerMenuRef.current?.querySelector<HTMLElement>('.header-nav a, .header-nav button')?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', closeMenu);
      window.removeEventListener('keydown', closeMenuWithKeyboard);
    };
  }, [headerMenuOpen]);

  useEffect(() => {
    setGuidedTour((current) => {
      if (!current) return null;
      const currentIndex = current.sceneIds.indexOf(activeSceneId);
      if (currentIndex >= 0) return currentIndex === current.currentIndex ? current : { ...current, currentIndex };
      const recalculated = findShortestTourPath(activeSceneId, current.destinationSceneId);
      return recalculated
        ? { destinationSceneId: current.destinationSceneId, sceneIds: recalculated, currentIndex: 0 }
        : null;
    });
  }, [activeSceneId]);

  useEffect(() => {
    const key = 'fitm-tour-visit-counted';
    if (window.sessionStorage.getItem(key)) return;
    void fetch('/api/visits', { method: 'POST', keepalive: true })
      .then((response) => {
        if (response.ok) window.sessionStorage.setItem(key, '1');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!imageViewer) return;

    const handleImageKeys = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      setImageViewer((current) => {
        if (!current || current.images.length < 2) return current;
        const index = (current.index + direction + current.images.length) % current.images.length;
        return { ...current, index };
      });
    };

    window.addEventListener('keydown', handleImageKeys, true);
    return () => window.removeEventListener('keydown', handleImageKeys, true);
  }, [imageViewer]);

  useEffect(() => {
    if (!mapExpanded) return;
    const closeExpandedMap = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMapExpanded(false);
    };
    window.addEventListener('keydown', closeExpandedMap);
    return () => window.removeEventListener('keydown', closeExpandedMap);
  }, [mapExpanded]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  const announce = (text: string): void => {
    setAnnouncement('');
    window.setTimeout(() => setAnnouncement(text), 30);
  };

  const navigate = async (sceneId: SceneId): Promise<void> => {
    if (sceneId === activeSceneId) {
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
    setImageViewer(null);
    setSelectedInfoSelection({ sceneId: activeSceneId, hotspotId: hotspot.id });
    setDialog('info');
  };

  const toggleCompactOverlay = (overlay: Exclude<CompactOverlay, null>): void => {
    setMapExpanded(false);
    setCompactOverlay((current) => current === overlay ? null : overlay);
  };

  const setChatOpen = (open: boolean): void => {
    if (compactTourUi) {
      setMapExpanded(false);
      setCompactOverlay(open ? 'chat' : null);
      return;
    }
    setDesktopChatOpen(open);
  };

  const closeScenePanel = (): void => {
    if (compactTourUi) setCompactOverlay(null);
    else setSceneInfoVisible(false);
  };

  const openHeaderDialog = (name: Exclude<DialogName, 'info' | null>): void => {
    setHeaderMenuOpen(false);
    setDialog(name);
  };

  const startGuidedTour = (plan: TourPlan): void => {
    const sceneIds = findShortestTourPath(activeSceneId, plan.destinationSceneId);
    if (!sceneIds) return;
    setGuidedTour({ destinationSceneId: plan.destinationSceneId, sceneIds, currentIndex: 0 });
    announce(locale === 'th'
      ? `เริ่มพาทัวร์ไป ${localize(resolveTourScene(getScene(plan.destinationSceneId), content).title, locale)}`
      : `Guided tour started to ${localize(resolveTourScene(getScene(plan.destinationSceneId), content).title, locale)}`);
  };

  const startGuidedTourTo = (destinationSceneId: SceneId): void => {
    const sceneIds = findShortestTourPath(activeSceneId, destinationSceneId);
    if (sceneIds) startGuidedTour({ destinationSceneId, sceneIds });
  };

  const openImage = (images: readonly InfoImage[], index: number): void => {
    setImageViewer({ images, index });
  };

  const moveImage = (direction: -1 | 1): void => {
    setImageViewer((current) => {
      if (!current || current.images.length < 2) return current;
      const index = (current.index + direction + current.images.length) % current.images.length;
      return { ...current, index };
    });
  };

  const openAcademics = (facultyId?: string, programId?: string): void => {
    setAcademicSelection({ facultyId, programId });
    setDialog('academics');
  };

  const closeDialog = (): void => {
    setImageViewer(null);
    setDialog(null);
    setSelectedInfoSelection(null);
    setAcademicSelection({});
  };

  const handleSceneChange = (sceneId: SceneId): void => {
    setCurrentScene(sceneId);
    cacheSceneForOffline(sceneId);
    const index = tourScenes.findIndex((item) => item.id === sceneId) + 1;
    announce(sceneChanged(locale, index, tourScenes.length, localize(resolveTourScene(getScene(sceneId), content).title, locale)));
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
        <a className="brand" href="#tour-viewer" aria-label="FITM 360° Virtual Tour">
          <span className="brand__mark brand__mark--fitm" aria-hidden="true">
            <img src={FITM_LOGO_URL} alt="" width={200} height={117} />
          </span>
          <span className="brand__copy">
            <strong>FITM 360° Virtual Tour</strong>
            <span>{message(locale, 'brandSubtitle')}</span>
          </span>
        </a>
        <div className="header-actions" ref={headerMenuRef}>
          <nav
            id="tour-header-menu"
            className={`header-nav${headerMenuOpen ? ' is-open' : ''}`}
            aria-label={message(locale, 'mainMenu')}
            aria-hidden={compactTourUi && !headerMenuOpen}
            inert={compactTourUi && !headerMenuOpen ? true : undefined}
          >
            <a className="header-button" href="/admin/login" aria-label={message(locale, 'adminLogin')} onClick={() => setHeaderMenuOpen(false)}>
              <Icon><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon>
              <span>{message(locale, 'adminLogin')}</span>
            </a>
            <button className="header-button" type="button" aria-label={message(locale, 'academicsButton')} onClick={() => { setHeaderMenuOpen(false); openAcademics(); }}>
              <Icon><path d="m3 9 9-5 9 5-9 5-9-5ZM7 12v4c3 2 7 2 10 0v-4M21 9v6" /></Icon>
              <span>{message(locale, 'academicsButton')}</span>
            </button>
            <button className="header-button" type="button" aria-label={message(locale, 'activitiesButton')} onClick={() => openHeaderDialog('activities')}>
              <Icon><path d="M5 5h14v15H5zM8 3v4M16 3v4M5 9h14M8 13h3M13 13h3M8 16h3" /></Icon>
              <span>{message(locale, 'activitiesButton')}</span>
            </button>
            <button className="header-button" type="button" onClick={() => openHeaderDialog('about')}>
              <Icon><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></Icon>
              <span>{message(locale, 'aboutButton')}</span>
            </button>
          </nav>
          <div className="language-switch" role="group" aria-label={message(locale, 'languageLabel')}>
            <button type="button" aria-pressed={locale === 'th'} onClick={() => setLocale('th')}>ไทย</button>
            <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>En</button>
          </div>
          <button
            ref={headerMenuButtonRef}
            className="header-menu-toggle"
            type="button"
            aria-expanded={headerMenuOpen}
            aria-controls="tour-header-menu"
            aria-label={message(locale, headerMenuOpen ? 'closeMenu' : 'openMenu')}
            onClick={() => setHeaderMenuOpen((open) => !open)}
          >
            <Icon>{headerMenuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</Icon>
          </button>
        </div>
      </header>

      <main className="tour-layout">
        <section className={`viewer-shell${chatOpen ? ' is-chat-open' : ''}${compactOverlay ? ` has-compact-overlay compact-overlay--${compactOverlay}` : ''}${guidedTour ? ' has-guided-tour' : ''}`} aria-labelledby="scene-title">
          <TourViewer
            ref={viewerRef}
            locale={locale}
            content={content}
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

          <aside
            className={`persistent-tour-map is-${mapMode}${mapExpanded ? ' is-expanded' : ''}${compactMapHidden ? ' is-compact-hidden' : ''}`}
            aria-labelledby="persistent-map-title"
            aria-hidden={compactMapHidden || undefined}
            inert={compactMapHidden ? true : undefined}
          >
            <h2 id="persistent-map-title" className="tour-map-title">{message(locale, 'mapTitle')}</h2>
            <TourMap
              locale={locale}
              currentSceneId={activeSceneId}
              content={content}
              onNavigate={(sceneId) => void navigate(sceneId)}
              mode={mapMode}
              onExpandedChange={setMapExpanded}
              guidedRouteSceneIds={guidedTour?.sceneIds ?? []}
            />
            {mapMode === 'preview' && !compactMapHidden ? (
              <button
                className="map-preview-trigger"
                type="button"
                aria-label={message(locale, 'openMapPanel')}
                onClick={() => toggleCompactOverlay('map')}
              >
                <span className="sr-only">{message(locale, 'openMapPanel')}</span>
              </button>
            ) : null}
          </aside>

          <button
            className="compact-scene-summary"
            type="button"
            hidden={introOpen}
            aria-expanded={compactOverlay === 'info'}
            aria-controls="scene-panel"
            aria-label={message(locale, compactOverlay === 'info' ? 'hideInfo' : 'showInfo')}
            onClick={() => toggleCompactOverlay('info')}
          >
            <span>{sceneCounter(locale, sceneIndex, tourScenes.length)}</span>
            <strong>{localize(scene.title, locale)}</strong>
            <Icon><path d="M9 18l6-6-6-6" /></Icon>
          </button>

          <section
            id="scene-panel"
            className={`scene-panel${scenePanelOpen ? '' : ' is-hidden'}`}
            aria-labelledby="scene-title"
            aria-hidden={!scenePanelOpen}
            inert={!scenePanelOpen ? true : undefined}
          >
            <div className="scene-panel__heading">
              <p className="eyebrow">
                {isHydrated
                  ? sceneCounter(locale, sceneIndex, tourScenes.length)
                  : sceneCounter(locale, 1, tourScenes.length)}
              </p>
              <button className="close-icon" type="button" aria-label={message(locale, 'hideInfo')} onClick={closeScenePanel}>
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
                      {localize(resolveTourScene(getScene(hotspot.target), content).title, locale)}
                    </button>
                  ))}
                </div>
              </div>
              <div hidden={sceneInfoHotspots.length === 0}>
                <h2>{message(locale, 'information')}</h2>
                <div className="compact-actions">
                  {sceneInfoHotspots.map((hotspot) => (
                    <button className="compact-action" type="button" key={hotspot.id} onClick={() => openInfo(hotspot)}>
                      {localize(hotspot.title, locale)}
                    </button>
                  ))}
                </div>
              </div>
              {sceneFaculty ? (
                <div>
                  <h2>{message(locale, 'academicsEyebrow')}</h2>
                  <div className="compact-actions">
                    <button className="compact-action" type="button" onClick={() => openAcademics(sceneFaculty.id)}>
                      {message(locale, 'academicsButton')}
                    </button>
                  </div>
                </div>
              ) : null}
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
            <button type="button" aria-label={message(locale, 'reset')} data-tooltip={message(locale, 'reset')} onClick={() => viewerRef.current?.reset(activeSceneId, true)}>
              <Icon><path d="M3 12a9 9 0 1 1 9 9M3 12V7M3 12h5" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'enterFullscreen')} data-tooltip={message(locale, 'enterFullscreen')} onClick={() => viewerRef.current?.toggleFullscreen()}>
              <Icon><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></Icon>
            </button>
            <button type="button" aria-pressed={sceneInfoVisible} aria-label={sceneInfoVisible ? message(locale, 'hideInfo') : message(locale, 'showInfo')} data-tooltip={sceneInfoVisible ? message(locale, 'hideInfo') : message(locale, 'showInfo')} onClick={() => setSceneInfoVisible(!sceneInfoVisible)}>
              <Icon><path d="M4 5h16v14H4zM8 9h8M8 13h6" /></Icon>
            </button>
          </div>

          <div
            id="compact-viewer-tools"
            className="compact-tool-popover"
            role="toolbar"
            aria-label={message(locale, 'controlsLabel')}
            hidden={compactOverlay !== 'tools'}
          >
            <button type="button" aria-pressed={autorotate} aria-label={message(locale, 'rotate')} onClick={() => viewerRef.current?.toggleAutorotate()}>
              <Icon><path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'zoomIn')} onClick={() => viewerRef.current?.zoomIn()}>
              <Icon><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6M21 21l-4.3-4.3" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'zoomOut')} onClick={() => viewerRef.current?.zoomOut()}>
              <Icon><circle cx="11" cy="11" r="7" /><path d="M8 11h6M21 21l-4.3-4.3" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'reset')} onClick={() => viewerRef.current?.reset(activeSceneId, true)}>
              <Icon><path d="M3 12a9 9 0 1 1 9 9M3 12V7M3 12h5" /></Icon>
            </button>
            <button type="button" aria-label={message(locale, 'enterFullscreen')} onClick={() => viewerRef.current?.toggleFullscreen()}>
              <Icon><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></Icon>
            </button>
          </div>

          <nav className="compact-tour-dock" aria-label={message(locale, 'tourToolbar')} hidden={introOpen}>
            <button
              type="button"
              className={compactOverlay === 'info' ? 'is-active' : ''}
              aria-pressed={compactOverlay === 'info'}
              aria-controls="scene-panel"
              onClick={() => toggleCompactOverlay('info')}
            >
              <Icon><path d="M4 5h16v14H4zM8 9h8M8 13h6" /></Icon>
              <span>{message(locale, 'dockInfo')}</span>
            </button>
            <button
              type="button"
              className={compactOverlay === 'map' ? 'is-active' : ''}
              aria-pressed={compactOverlay === 'map'}
              aria-controls="tour-map-canvas"
              onClick={() => toggleCompactOverlay('map')}
            >
              <Icon><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15" /></Icon>
              <span>{message(locale, 'dockMap')}</span>
            </button>
            <button
              type="button"
              className={compactOverlay === 'tools' ? 'is-active' : ''}
              aria-pressed={compactOverlay === 'tools'}
              aria-controls="compact-viewer-tools"
              onClick={() => toggleCompactOverlay('tools')}
            >
              <Icon><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3" /></Icon>
              <span>{message(locale, 'dockTools')}</span>
            </button>
            <button
              type="button"
              className={compactOverlay === 'chat' ? 'is-active' : ''}
              aria-pressed={compactOverlay === 'chat'}
              aria-expanded={chatOpen}
              aria-label={message(locale, compactOverlay === 'chat' ? 'aiClose' : 'aiOpen')}
              aria-controls="tour-chat-panel"
              onClick={() => toggleCompactOverlay('chat')}
            >
              <Icon><path d="M5 5h14v10H9l-4 4V5ZM8 9h8M8 12h5" /></Icon>
              <span>{message(locale, 'dockAi')}</span>
            </button>
          </nav>

          <div className="scene-loader" role="status" hidden={ready}>
            <span className="spinner" aria-hidden="true" />
            <span>{message(locale, 'loadingScene')}</span>
          </div>

          <TourChat
            open={chatOpen}
            locale={locale}
            sceneId={activeSceneId}
            content={content}
            onNavigate={(sceneId) => void navigate(sceneId)}
            onOpenProgram={(programId) => {
              const program = content.programs.find((item) => item.id === programId);
              if (program) openAcademics(program.facultyId, program.id);
            }}
            onOpenFaculty={(facultyId) => openAcademics(facultyId)}
            onOpenAcademics={() => openAcademics()}
            onStartTour={startGuidedTour}
            onStartTourTo={startGuidedTourTo}
            onOpenChange={setChatOpen}
          />

          {guidedTour && guidedDestinationScene ? (
            <section className={`guided-tour${guidedTour.currentIndex === guidedTour.sceneIds.length - 1 ? ' is-arrived' : ''}`} aria-live="polite">
              <div>
                <span>{guidedTour.currentIndex === guidedTour.sceneIds.length - 1
                  ? message(locale, 'guidedTourArrived')
                  : message(locale, 'guidedTourTitle')}</span>
                <strong>{localize(guidedDestinationScene.title, locale)}</strong>
                <small>{guidedTour.currentIndex + 1} / {guidedTour.sceneIds.length}</small>
              </div>
              <div className="guided-tour__actions">
                <button
                  type="button"
                  aria-label={message(locale, 'guidedTourPrevious')}
                  disabled={guidedTour.currentIndex === 0}
                  onClick={() => {
                    const target = guidedTour.sceneIds[guidedTour.currentIndex - 1];
                    if (target) void navigate(target);
                  }}
                ><Icon><path d="m15 18-6-6 6-6" /></Icon><span>{message(locale, 'guidedTourPrevious')}</span></button>
                {guidedTour.currentIndex < guidedTour.sceneIds.length - 1 ? (
                  <button
                    className="is-primary"
                    type="button"
                    aria-label={message(locale, 'guidedTourNext')}
                    onClick={() => {
                      const target = guidedTour.sceneIds[guidedTour.currentIndex + 1];
                      if (target) void navigate(target);
                    }}
                  ><Icon><path d="m9 18 6-6-6-6" /></Icon><span>{message(locale, 'guidedTourNext')}</span></button>
                ) : <>
                  {guidedDestinationInfo ? (
                    <button className="is-primary" type="button" aria-label={message(locale, 'guidedTourOpenPlace')} onClick={() => openInfo(resolveInfoHotspot(guidedDestinationInfo, content))}>
                      <Icon><path d="M4 5h16v14H4zM8 9h8M8 13h6" /></Icon><span>{message(locale, 'guidedTourOpenPlace')}</span>
                    </button>
                  ) : null}
                  {guidedDestinationFaculty ? (
                    <button className="is-primary" type="button" aria-label={message(locale, 'guidedTourOpenFaculty')} onClick={() => openAcademics(guidedDestinationFaculty.id)}>
                      <Icon><path d="m3 9 9-5 9 5-9 5-9-5ZM7 12v4c3 2 7 2 10 0v-4" /></Icon><span>{message(locale, 'guidedTourOpenFaculty')}</span>
                    </button>
                  ) : null}
                </>}
                <button type="button" aria-label={message(locale, 'guidedTourOpenMap')} onClick={() => setMapExpanded(true)}>
                  <Icon><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15" /></Icon><span>{message(locale, 'guidedTourOpenMap')}</span>
                </button>
                <button type="button" aria-label={message(locale, 'guidedTourCancel')} onClick={() => setGuidedTour(null)}>
                  <Icon><path d="m6 6 12 12M18 6 6 18" /></Icon><span>{message(locale, 'guidedTourCancel')}</span>
                </button>
              </div>
            </section>
          ) : null}

          <section id="intro" className={`intro${introOpen ? '' : ' is-closing'}`} aria-labelledby="intro-title" hidden={!introOpen}>
            <div className="intro__card">
              <div className="intro__brand" aria-hidden="true">
                <span className="brand__mark brand__mark--fitm brand__mark--large">
                  <img src={FITM_LOGO_URL} alt="" width={200} height={117} />
                </span>
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

      <ModalDialog open={dialog === 'info'} titleId="info-dialog-title" wide closeLabel={message(locale, 'close')} onClose={closeDialog}>
        {resolvedSelectedInfo ? <>
          <p className="eyebrow">{message(locale, 'infoPoint')}</p>
          <h2 id="info-dialog-title">{localize(resolvedSelectedInfo.title, locale)}</h2>
          <p className="scene-alt-title">{localize(resolvedSelectedInfo.title, alternativeLocale)}</p>
          <p className="dialog-description">{localize(resolvedSelectedInfo.description, locale)}</p>
          <ReferenceLine reference={resolvedSelectedInfo.reference} locale={locale} />
          {resolvedSelectedInfo.images?.length ? (
            <div className="info-gallery">
              {resolvedSelectedInfo.images.map((image, index) => (
                <figure key={`${image.src}-${index}`}>
                  <button
                    className="info-gallery__button"
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`${message(locale, 'openImage')}: ${localize(image.alt, locale)}`}
                    onClick={() => openImage(resolvedSelectedInfo.images ?? [], index)}
                  >
                    <img src={image.src} alt={localize(image.alt, locale)} loading="lazy" />
                    <span className="info-gallery__zoom" aria-hidden="true">
                      <Icon><path d="m15 15 5 5M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13ZM8 10.5h5M10.5 8v5" /></Icon>
                    </span>
                  </button>
                  {image.caption ? <figcaption>{localize(image.caption, locale)}</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : null}
        </> : null}
      </ModalDialog>

      <FacultyProgramsDialog
        open={dialog === 'academics'}
        locale={locale}
        content={content}
        initialFacultyId={academicSelection.facultyId}
        initialProgramId={academicSelection.programId}
        onClose={closeDialog}
        onNavigate={(sceneId) => {
          closeDialog();
          void navigate(sceneId);
        }}
      />

      <ActivitiesDialog
        open={dialog === 'activities'}
        locale={locale}
        content={content}
        onClose={closeDialog}
        onNavigate={(sceneId) => void navigate(sceneId)}
        onOpenImage={(activity) => {
          if (!activity.imageUrl) return;
          openImage([{
            src: activity.imageUrl,
            alt: activity.title,
            caption: activity.title
          }], 0);
        }}
      />

      <ModalDialog
        open={Boolean(imageViewer && activeImage)}
        titleId="info-lightbox-title"
        media
        closeLabel={message(locale, 'close')}
        onClose={() => setImageViewer(null)}
      >
        {imageViewer && activeImage ? (
          <div className="info-lightbox">
            <h2 className="sr-only" id="info-lightbox-title">{message(locale, 'imageViewerTitle')}</h2>
            <div className="info-lightbox__stage">
              {imageViewer.images.length > 1 ? (
                <button
                  className="info-lightbox__nav info-lightbox__nav--previous"
                  type="button"
                  aria-label={message(locale, 'previousImage')}
                  onClick={() => moveImage(-1)}
                >
                  <Icon><path d="m15 18-6-6 6-6" /></Icon>
                </button>
              ) : null}
              <img src={activeImage.src} alt={localize(activeImage.alt, locale)} />
              {imageViewer.images.length > 1 ? (
                <button
                  className="info-lightbox__nav info-lightbox__nav--next"
                  type="button"
                  aria-label={message(locale, 'nextImage')}
                  onClick={() => moveImage(1)}
                >
                  <Icon><path d="m9 18 6-6-6-6" /></Icon>
                </button>
              ) : null}
            </div>
            <div className="info-lightbox__meta" aria-live="polite">
              <span>{imageCounter(locale, imageViewer.index + 1, imageViewer.images.length)}</span>
              {activeImage.caption ? <strong>{localize(activeImage.caption, locale)}</strong> : null}
            </div>
          </div>
        ) : null}
      </ModalDialog>

      <ModalDialog open={dialog === 'about'} titleId="about-dialog-title" closeLabel={message(locale, 'close')} onClose={closeDialog}>
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

      <ModalDialog open={dialog === 'text-tour'} titleId="text-tour-title" wide closeLabel={message(locale, 'close')} onClose={closeDialog}>
        <p className="eyebrow">{message(locale, 'textTourEyebrow')}</p>
        <h2 id="text-tour-title">{message(locale, 'textTourTitle')}</h2>
        <p className="dialog-description">{message(locale, 'textTourDescription')}</p>
        <div className="text-tour-content">
          {tourScenes.map((baseItem, index) => {
            const item = resolveTourScene(baseItem, content);
            return (
              <article className="text-scene" key={item.id}>
                <h3>{index + 1}. {localize(item.title, locale)}</h3>
                <p className="scene-alt-title">{localize(item.title, alternativeLocale)}</p>
                <p>{localize(item.description, locale)}</p>
                <button className="compact-action" type="button" onClick={() => { closeDialog(); void navigate(item.id); }}>{goToScene(locale, localize(item.title, locale))}</button>
                {getInfoHotspots(baseItem).map((hotspot) => resolveInfoHotspot(hotspot, content)).map((hotspot) => (
                  <details key={hotspot.id}>
                    <summary>{localize(hotspot.title, locale)}</summary>
                    <p>{localize(hotspot.description, locale)}</p>
                    <ReferenceLine reference={hotspot.reference} locale={locale} />
                  </details>
                ))}
              </article>
            );
          })}
        </div>
      </ModalDialog>
    </div>
  );
}
