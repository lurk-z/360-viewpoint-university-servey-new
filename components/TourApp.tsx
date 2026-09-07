'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import {
  getInfoHotspots,
  getNavigationHotspots,
  getScene,
  localize,
  activateTourStructure,
  tourScenes,
  type InfoHotspot,
  type InfoImage,
  type SceneId
} from '../src/tour-data';
import {
  createBootstrapTourStructureData,
  toRuntimeTourScenes,
  type TourStructureData,
  type TourStructureSnapshot
} from '../src/tour-structure';
import { findCodeInfoGeometryDifferences, overlayCodeNavigation } from '../src/tour-navigation-sync';
import { message, sceneChanged } from '../src/i18n';
import { useTourStore } from '../src/stores/tour-store';
import {
  resolveInfoHotspot,
  resolveTourScene
} from '../src/content';
import TourViewer, { type TourViewerHandle } from './TourViewer';
import DevelopmentArrowPositioner, { type DevelopmentArrowOption } from './DevelopmentArrowPositioner';
import type { TourMapMode } from './TourMap';
import { usePublicContent } from './usePublicContent';
import { useTourStructure } from './useTourStructure';
import {
  getDefaultSupplementalMediaItemId,
  getTourSupplementalMediaGroups,
  type TourSupplementalMediaGroup
} from '../src/tour-supplemental-media';
import TourHeader from './tour/TourHeader';
import Icon from './tour/TourIcon';
import TourIntro from './tour/TourIntro';
import TourScenePanel from './tour/TourScenePanel';
import TourControls, { type CompactTourOverlay } from './tour/TourControls';
import GuidedTourBar from './tour/GuidedTourBar';
import { useCompactTourUi } from './tour/useCompactTourUi';
import { useGuidedTour } from './tour/useGuidedTour';
import useOfflineTourCache from './tour/useOfflineTourCache';
import useDevelopmentArrowPreview from './tour/useDevelopmentArrowPreview';
import useTourOverlayController from './tour/useTourOverlayController';

type DialogName = 'info' | 'academics' | 'activities' | 'about' | 'text-tour' | null;
type CompactOverlay = CompactTourOverlay;
const DEVELOPMENT_ARROW_TOOL = process.env.NODE_ENV === 'development';
const TourMap = dynamic(() => import('./TourMap'), { ssr: false });
const TourChat = dynamic(() => import('./TourChat'), { ssr: false });
const ActivitiesDialog = dynamic(() => import('./ActivitiesDialog'), { ssr: false });
const FacultyProgramsDialog = dynamic(() => import('./FacultyProgramsDialog'), { ssr: false });
const TourSupplementalMediaDialog = dynamic(() => import('./TourSupplementalMediaDialog'), { ssr: false });
const TourInfoDialog = dynamic(() => import('./tour/TourContentDialogs').then((module) => module.TourInfoDialog), { ssr: false });
const TourImageDialog = dynamic(() => import('./tour/TourContentDialogs').then((module) => module.TourImageDialog), { ssr: false });
const TourAboutDialog = dynamic(() => import('./tour/TourContentDialogs').then((module) => module.TourAboutDialog), { ssr: false });
const TourTextDialog = dynamic(() => import('./tour/TourContentDialogs').then((module) => module.TourTextDialog), { ssr: false });

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

interface SupplementalMediaSelection {
  readonly group: TourSupplementalMediaGroup;
  readonly initialItemId?: string;
}

export default function TourApp({ initialTourStructure, initialSceneId, lockTourStructure = false }: {
  readonly initialTourStructure: TourStructureSnapshot;
  readonly initialSceneId?: string;
  readonly lockTourStructure?: boolean;
}) {
  const tourStructure = useTourStructure(initialTourStructure, !lockTourStructure);
  const lastValidCodeStructureRef = useRef<TourStructureData | null>(null);
  let activeTourStructure = tourStructure.data;
  let developmentNavigationError: string | undefined;
  let developmentInfoDifferenceIds: readonly string[] = [];
  if (DEVELOPMENT_ARROW_TOOL) {
    try {
      const codeStructure = createBootstrapTourStructureData();
      developmentInfoDifferenceIds = findCodeInfoGeometryDifferences(tourStructure.data, codeStructure);
      activeTourStructure = overlayCodeNavigation(tourStructure.data, codeStructure);
      lastValidCodeStructureRef.current = codeStructure;
    } catch (error) {
      developmentNavigationError = error instanceof Error ? error.message : 'Navigation validation failed';
      if (lastValidCodeStructureRef.current) {
        try {
          activeTourStructure = overlayCodeNavigation(tourStructure.data, lastValidCodeStructureRef.current);
        } catch {
          activeTourStructure = tourStructure.data;
        }
      }
    }
  }
  const developmentInfoDifferenceSignature = developmentInfoDifferenceIds.join(',');
  useEffect(() => {
    if (!DEVELOPMENT_ARROW_TOOL || !developmentInfoDifferenceSignature) return;
    console.warn(
      `[Tour development] Info geometry from tour-data.ts is ignored. Edit these Info points in Admin: ${developmentInfoDifferenceSignature}`
    );
  }, [developmentInfoDifferenceSignature]);
  activateTourStructure(
    toRuntimeTourScenes(activeTourStructure),
    activeTourStructure.map
  );
  const compactTourUi = useCompactTourUi();
  const overlayController = useTourOverlayController(compactTourUi);
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
  const viewYawRef = useRef<number | undefined>(undefined);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedInfoSelection, setSelectedInfoSelection] = useState<InfoSelection | null>(null);
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const { content } = usePublicContent();
  const {
    compactOverlay,
    chatOpen,
    chatMounted,
    headerMenuOpen,
    mapExpanded,
    setCompactOverlay,
    toggleCompactOverlay: toggleOverlay,
    setDesktopChatOpen,
    setHeaderMenuOpen,
    setMapExpanded
  } = overlayController;
  const [academicSelection, setAcademicSelection] = useState<AcademicSelection>({});
  const [selectedActivityId, setSelectedActivityId] = useState<string>();
  const [supplementalMediaSelection, setSupplementalMediaSelection] = useState<SupplementalMediaSelection | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuButtonRef = useRef<HTMLButtonElement>(null);

  const requestedInitialSceneId = initialSceneId && tourScenes.some((item) => item.id === initialSceneId)
    ? initialSceneId
    : undefined;
  const activeSceneId = !ready && requestedInitialSceneId
    ? requestedInitialSceneId
    : tourScenes.some((item) => item.id === currentSceneId)
      ? currentSceneId
      : tourScenes[0]?.id ?? 'entrance';
  const announce = (text: string): void => {
    setAnnouncement('');
    window.setTimeout(() => setAnnouncement(text), 30);
  };
  const { guidedTour, startGuidedTour, startGuidedTourTo, cancelGuidedTour } = useGuidedTour({
    activeSceneId,
    locale,
    content,
    announce
  });
  const scene = resolveTourScene(getScene(activeSceneId), content);
  const sceneIndex = tourScenes.findIndex((item) => item.id === scene.id) + 1;
  const sceneNavigationHotspots = getNavigationHotspots(scene);
  const sceneNavigationSignature = JSON.stringify(sceneNavigationHotspots.map((hotspot) => ({
    id: hotspot.id,
    target: hotspot.target,
    yaw: hotspot.yaw,
    pitch: hotspot.pitch,
    direction: hotspot.direction ?? 'standard'
  })));
  const developmentArrow = useDevelopmentArrowPreview(activeSceneId, sceneNavigationSignature);
  const developmentArrowToolOpen = developmentArrow.open;
  const selectedDevelopmentArrowId = developmentArrow.selectedHotspotId;
  const developmentArrowPreview = developmentArrow.preview;
  const cacheSceneForOffline = useOfflineTourCache();
  const developmentArrowOptions: readonly DevelopmentArrowOption[] = sceneNavigationHotspots.map((hotspot) => ({
    id: hotspot.id,
    target: hotspot.target,
    targetLabel: localize(resolveTourScene(getScene(hotspot.target), content).title, locale),
    yaw: hotspot.yaw,
    pitch: hotspot.pitch,
    direction: hotspot.direction
  }));
  const sceneInfoHotspots = getInfoHotspots(scene).map((hotspot) => resolveInfoHotspot(hotspot, content));
  const sceneSupplementalMediaGroups = getTourSupplementalMediaGroups(scene.id);
  const sceneFaculty = content.faculties.find((faculty) => faculty.sceneId === scene.id);
  const selectedInfoScene = selectedInfoSelection
    ? tourScenes.find((item) => item.id === selectedInfoSelection.sceneId)
    : undefined;
  const selectedInfo = selectedInfoSelection && selectedInfoScene
    ? getInfoHotspots(selectedInfoScene)
      .find((hotspot) => hotspot.id === selectedInfoSelection.hotspotId)
    : undefined;
  const resolvedSelectedInfo = selectedInfo ? resolveInfoHotspot(selectedInfo, content) : undefined;
  const guidedDestinationScene = guidedTour
    ? resolveTourScene(getScene(guidedTour.destinationSceneId), content)
    : undefined;
  const guidedCurrentStop = guidedTour?.stopSceneIds.find((stopSceneId) => {
    const stopIndex = guidedTour.sceneIds.indexOf(stopSceneId);
    return stopIndex >= guidedTour.currentIndex;
  }) ?? guidedTour?.destinationSceneId;
  const guidedRemainingStops = guidedTour
    ? guidedTour.stopSceneIds.filter((stopSceneId) => guidedTour.sceneIds.indexOf(stopSceneId) >= guidedTour.currentIndex).length
    : 0;
  const guidedDestinationFaculty = guidedTour
    ? content.faculties.find((faculty) => faculty.sceneId === guidedTour.destinationSceneId)
    : undefined;
  const guidedDestinationInfo = guidedTour
    ? getInfoHotspots(getScene(guidedTour.destinationSceneId))[0]
    : undefined;
  const scenePanelOpen = compactTourUi ? compactOverlay === 'info' : sceneInfoVisible;
  const compactMapHidden = compactTourUi
    && (developmentArrowToolOpen || (compactOverlay !== null && compactOverlay !== 'map'));
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
    developmentArrow.closeTool();
    toggleOverlay(overlay);
  };

  const openDevelopmentArrowTool = (): void => {
    setMapExpanded(false);
    setCompactOverlay(null);
    developmentArrow.openTool();
  };

  const closeDevelopmentArrowTool = (): void => {
    developmentArrow.closeTool();
  };

  const setChatOpen = (open: boolean): void => {
    if (open) closeDevelopmentArrowTool();
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
    if (name === 'activities') setSelectedActivityId(undefined);
    setDialog(name);
  };

  const openImage = (images: readonly InfoImage[], index: number): void => {
    setImageViewer({ images, index });
  };

  const openSupplementalMedia = (group: TourSupplementalMediaGroup): void => {
    setSupplementalMediaSelection({
      group,
      initialItemId: getDefaultSupplementalMediaItemId(activeSceneId, group)
    });
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

  const openActivity = (activityId: string): void => {
    if (!content.activities.some((activity) => activity.id === activityId)) return;
    setSelectedActivityId(activityId);
    setDialog('activities');
  };

  const closeDialog = (): void => {
    setImageViewer(null);
    setDialog(null);
    setSelectedInfoSelection(null);
    setAcademicSelection({});
    setSelectedActivityId(undefined);
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

  return (
    <div className="app min-h-dvh">
      <div className="skip-links">
        <a href="#tour-viewer">{message(locale, 'skipViewer')}</a>
      </div>

      <TourHeader
        locale={locale}
        compact={compactTourUi}
        menuOpen={headerMenuOpen}
        menuRef={headerMenuRef}
        menuButtonRef={headerMenuButtonRef}
        onMenuOpenChange={setHeaderMenuOpen}
        onLocaleChange={setLocale}
        onOpenAcademics={() => openAcademics()}
        onOpenActivities={() => openHeaderDialog('activities')}
        onOpenAbout={() => openHeaderDialog('about')}
      />

      <main className="tour-layout">
        <section className={`viewer-shell${chatOpen ? ' is-chat-open' : ''}${compactOverlay ? ` has-compact-overlay compact-overlay--${compactOverlay}` : ''}${guidedTour ? ' has-guided-tour' : ''}`} aria-labelledby="scene-title">
          <TourViewer
            ref={viewerRef}
            initialSceneId={requestedInitialSceneId}
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
            onViewYaw={(yaw) => { viewYawRef.current = yaw; }}
            navigationPlacementHotspotId={developmentArrowToolOpen ? selectedDevelopmentArrowId : undefined}
            navigationPreview={developmentArrowToolOpen ? developmentArrowPreview : null}
            onNavigationPositionPick={(position) => {
              if (!developmentArrowToolOpen || position.hotspotId !== selectedDevelopmentArrowId) return;
              developmentArrow.setPreview(position);
            }}
          />
          <div className="viewer-vignette" aria-hidden="true" />

          <aside
            className={`persistent-tour-map is-${mapMode}${mapExpanded ? ' is-expanded' : ''}${compactMapHidden ? ' is-compact-hidden' : ''}`}
            aria-labelledby="persistent-map-title"
            aria-hidden={compactMapHidden || undefined}
            inert={compactMapHidden ? true : undefined}
          >
            <h2 id="persistent-map-title" className="tour-map-title">{message(locale, 'mapTitle')}</h2>
            {ready ? (
              <TourMap
                locale={locale}
                currentSceneId={activeSceneId}
                content={content}
                onNavigate={(sceneId) => void navigate(sceneId)}
                mode={mapMode}
                onExpandedChange={setMapExpanded}
                guidedRouteSceneIds={guidedTour?.sceneIds ?? []}
              />
            ) : <div className="tour-map-loading" aria-hidden="true" />}
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

          <TourScenePanel
            scene={scene}
            sceneIndex={sceneIndex}
            sceneCount={tourScenes.length}
            locale={locale}
            hydrated={isHydrated}
            open={scenePanelOpen}
            compactOverlayOpen={compactOverlay === 'info'}
            introOpen={introOpen}
            content={content}
            infoHotspots={sceneInfoHotspots}
            supplementalMediaGroups={sceneSupplementalMediaGroups}
            faculty={sceneFaculty}
            onToggleCompactInfo={() => toggleCompactOverlay('info')}
            onClose={closeScenePanel}
            onNavigate={(sceneId) => void navigate(sceneId)}
            onOpenInfo={openInfo}
            onOpenSupplementalMedia={openSupplementalMedia}
            onOpenAcademics={(facultyId) => openAcademics(facultyId)}
          />

          <p id="viewer-help" className="viewer-help">
            <Icon><path d="M8 11V7a4 4 0 0 1 8 0v4M5 11h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /></Icon>
            <span>{message(locale, 'viewerHelp')}</span>
          </p>

          <TourControls
            locale={locale}
            activeSceneId={activeSceneId}
            autorotate={autorotate}
            sceneInfoVisible={sceneInfoVisible}
            compactOverlay={compactOverlay}
            introOpen={introOpen}
            chatOpen={chatOpen}
            developmentArrowTool={DEVELOPMENT_ARROW_TOOL}
            viewer={viewerRef.current}
            onSceneInfoVisibleChange={setSceneInfoVisible}
            onToggleCompactOverlay={toggleCompactOverlay}
            onOpenDevelopmentArrowTool={openDevelopmentArrowTool}
          />

          {DEVELOPMENT_ARROW_TOOL && developmentNavigationError && !introOpen && !developmentArrowToolOpen ? (
            <div className="development-navigation-error" role="alert">
              <strong>{locale === 'th' ? 'โค้ดลูกศรยังไม่ผ่านการตรวจ' : 'Arrow code is not valid yet'}</strong>
              <span>{developmentNavigationError}</span>
              <button type="button" onClick={openDevelopmentArrowTool}>{locale === 'th' ? 'เปิดเครื่องมือ' : 'Open tool'}</button>
            </div>
          ) : null}

          {DEVELOPMENT_ARROW_TOOL && developmentArrowToolOpen && !introOpen ? (
            <DevelopmentArrowPositioner
              locale={locale}
              compact={compactTourUi}
              sceneLabel={localize(scene.title, locale)}
              options={developmentArrowOptions}
              selectedHotspotId={selectedDevelopmentArrowId}
              preview={developmentArrowPreview}
              validationError={developmentNavigationError}
              onSelect={(hotspotId) => {
                developmentArrow.setSelectedHotspotId(hotspotId);
                developmentArrow.setPreview(null);
              }}
              onReset={() => developmentArrow.setPreview(null)}
              onClose={closeDevelopmentArrowTool}
            />
          ) : null}

          <div className="scene-loader" role="status" hidden={ready}>
            <span className="spinner" aria-hidden="true" />
            <span>{message(locale, 'loadingScene')}</span>
          </div>

          {!chatMounted && !compactTourUi ? (
            <div className="tour-chat">
              <button
                className="tour-chat__toggle"
                type="button"
                aria-expanded="false"
                aria-controls="tour-chat-panel"
                aria-label={message(locale, 'aiOpen')}
                onClick={() => setChatOpen(true)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 5h14v10H9l-4 4V5Z" /><path d="M8 9h8M8 12h5" />
                </svg>
                <span>AI</span>
              </button>
            </div>
          ) : null}

          {chatMounted ? (
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
              onOpenActivity={openActivity}
              onOpenAcademics={() => openAcademics()}
              onStartTour={startGuidedTour}
              onStartTourTo={startGuidedTourTo}
              onOpenChange={setChatOpen}
              getViewYaw={() => viewYawRef.current}
            />
          ) : null}

          {guidedTour && guidedDestinationScene ? (
            <GuidedTourBar
              locale={locale}
              destinationLabel={localize(resolveTourScene(getScene(guidedCurrentStop ?? guidedTour.destinationSceneId), content).title, locale)}
              currentIndex={guidedTour.currentIndex}
              sceneCount={guidedTour.sceneIds.length}
              stopCount={guidedTour.stopSceneIds.length}
              remainingStops={guidedRemainingStops}
              canOpenPlace={Boolean(guidedDestinationInfo)}
              canOpenFaculty={Boolean(guidedDestinationFaculty)}
              onPrevious={() => {
                const target = guidedTour.sceneIds[guidedTour.currentIndex - 1];
                if (target) void navigate(target);
              }}
              onNext={() => {
                const target = guidedTour.sceneIds[guidedTour.currentIndex + 1];
                if (target) void navigate(target);
              }}
              onOpenPlace={() => {
                if (guidedDestinationInfo) openInfo(resolveInfoHotspot(guidedDestinationInfo, content));
              }}
              onOpenFaculty={() => {
                if (guidedDestinationFaculty) openAcademics(guidedDestinationFaculty.id);
              }}
              onOpenMap={() => setMapExpanded(true)}
              onCancel={cancelGuidedTour}
            />
          ) : null}

          <TourIntro
            locale={locale}
            open={introOpen}
            ready={ready}
            progress={progress}
            error={error}
            onStart={handleStart}
            onOpenTextTour={() => setDialog('text-tour')}
          />
          <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
        </section>

      </main>

      <TourInfoDialog
        open={dialog === 'info'}
        locale={locale}
        hotspot={resolvedSelectedInfo}
        onClose={closeDialog}
        onOpenImage={openImage}
      />

      {dialog === 'academics' ? (
        <FacultyProgramsDialog
          open
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
      ) : null}

      {dialog === 'activities' ? (
        <ActivitiesDialog
          open
          locale={locale}
          content={content}
          initialActivityId={selectedActivityId}
          onClose={closeDialog}
          onNavigate={(sceneId) => void navigate(sceneId)}
          onOpenImage={(activity) => {
            const activityImage = activity.images?.[0];
            if (!activityImage?.src && !activity.imageUrl) return;
            openImage([{
              src: activityImage?.src ?? activity.imageUrl!,
              alt: activityImage?.alt ?? activity.title,
              caption: activityImage?.caption ?? activity.title
            }], 0);
          }}
        />
      ) : null}

      {supplementalMediaSelection ? (
        <TourSupplementalMediaDialog
          locale={locale}
          group={supplementalMediaSelection.group}
          initialItemId={supplementalMediaSelection.initialItemId}
          onClose={() => setSupplementalMediaSelection(null)}
        />
      ) : null}

      <TourImageDialog
        locale={locale}
        images={imageViewer?.images}
        index={imageViewer?.index ?? 0}
        onClose={() => setImageViewer(null)}
        onMove={moveImage}
      />
      <TourAboutDialog open={dialog === 'about'} locale={locale} onClose={closeDialog} />
      <TourTextDialog
        open={dialog === 'text-tour'}
        locale={locale}
        content={content}
        onClose={closeDialog}
        onNavigate={(sceneId) => void navigate(sceneId)}
      />
    </div>
  );
}
