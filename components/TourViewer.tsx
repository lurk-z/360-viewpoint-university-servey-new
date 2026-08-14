'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import {
  EquirectangularAdapter,
  Viewer,
  events as viewerEvents
} from '@photo-sphere-viewer/core';
import {
  AutorotatePlugin,
  events as autorotateEvents
} from '@photo-sphere-viewer/autorotate-plugin';
import {
  MarkersPlugin,
  type MarkerConfig,
  type MarkerElement
} from '@photo-sphere-viewer/markers-plugin';
import {
  VirtualTourPlugin,
  events as virtualTourEvents,
  type VirtualTourNode
} from '@photo-sphere-viewer/virtual-tour-plugin';
import {
  getInfoHotspots,
  getNavigationHotspots,
  getScene,
  getTourStructureSignature,
  localize,
  toDegrees,
  tourScenes,
  type InfoHotspot,
  type Locale,
  type SceneId
} from '../src/tour-data';
import { goToScene, message } from '../src/i18n';
import {
  ARROW_SETTLE_DURATION,
  getSceneTransitionOptions
} from '../src/viewer-transition';
import { installPanoramaEnhancement } from '../src/panorama-enhancement';
import { resolveInfoHotspot, resolveTourScene, type PublicContentSnapshot } from '../src/content';

export interface TourViewerHandle {
  navigate: (sceneId: SceneId) => Promise<void>;
  reset: (sceneId: SceneId, animate?: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleAutorotate: () => void;
  toggleFullscreen: () => void;
  focus: () => void;
}

interface TourViewerProps {
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly onInfo: (hotspot: InfoHotspot) => void;
  readonly onProgress: (progress: number) => void;
  readonly onReady: (sceneId: SceneId) => void;
  readonly onSceneChange: (sceneId: SceneId) => void;
  readonly onError: () => void;
  readonly onAutorotate: (enabled: boolean) => void;
}

interface ViewerCallbacks {
  locale: Locale;
  content: PublicContentSnapshot;
  onInfo: (hotspot: InfoHotspot) => void;
  onProgress: (progress: number) => void;
  onReady: (sceneId: SceneId) => void;
  onSceneChange: (sceneId: SceneId) => void;
  onError: () => void;
  onAutorotate: (enabled: boolean) => void;
}

interface PreservedViewerState {
  readonly sceneId: SceneId;
  readonly yaw: number;
  readonly pitch: number;
  readonly zoom: number;
}

const buildTourNodes = (): VirtualTourNode[] => tourScenes.map((scene) => ({
  id: scene.id,
  panorama: scene.panorama,
  name: `${scene.title.th} · ${scene.title.en}`,
  data: { sceneId: scene.id },
  links: getNavigationHotspots(scene).map((hotspot) => ({
    nodeId: hotspot.target,
    position: { yaw: toDegrees(hotspot.yaw), pitch: toDegrees(hotspot.pitch) },
    data: { hotspotId: hotspot.id }
  }))
}));

const TourViewer = forwardRef<TourViewerHandle, TourViewerProps>(function TourViewer(
  { locale, content, onInfo, onProgress, onReady, onSceneChange, onError, onAutorotate },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const markersRef = useRef<MarkersPlugin | null>(null);
  const virtualTourRef = useRef<VirtualTourPlugin | null>(null);
  const autorotateRef = useRef<AutorotatePlugin | null>(null);
  const viewAnimationIdRef = useRef(0);
  const viewerGenerationRef = useRef(0);
  const preservedViewerStateRef = useRef<PreservedViewerState | null>(null);
  const refreshMarkersRef = useRef<(() => void) | null>(null);
  const callbacksRef = useRef<ViewerCallbacks>({
    locale,
    content,
    onInfo,
    onProgress,
    onReady,
    onSceneChange,
    onError,
    onAutorotate
  });
  callbacksRef.current = { locale, content, onInfo, onProgress, onReady, onSceneChange, onError, onAutorotate };
  const tourStructureSignature = getTourStructureSignature();

  useImperativeHandle(ref, () => ({
    navigate: async (sceneId) => {
      const plugin = virtualTourRef.current;
      const viewer = viewerRef.current;
      if (!plugin || !viewer) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      viewAnimationIdRef.current += 1;
      await viewer.stopAnimation();
      if (viewerRef.current !== viewer || virtualTourRef.current !== plugin) return;
      await plugin.setCurrentNode(sceneId, getSceneTransitionOptions(false, reducedMotion));
    },
    reset: (sceneId, animate = false) => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      viewAnimationIdRef.current += 1;
      void viewer.stopAnimation();
      const scene = getScene(sceneId);
      if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        void viewer.animate({
          yaw: toDegrees(scene.initialView.yaw),
          pitch: toDegrees(scene.initialView.pitch),
          zoom: scene.initialView.zoom,
          speed: 550
        });
      } else {
        viewer.rotate({
          yaw: toDegrees(scene.initialView.yaw),
          pitch: toDegrees(scene.initialView.pitch)
        });
        viewer.zoom(scene.initialView.zoom);
      }
    },
    zoomIn: () => viewerRef.current?.zoomIn(8),
    zoomOut: () => viewerRef.current?.zoomOut(8),
    toggleAutorotate: () => autorotateRef.current?.toggle(),
    toggleFullscreen: () => viewerRef.current?.toggleFullscreen(),
    focus: () => containerRef.current?.focus()
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const generation = ++viewerGenerationRef.current;
    const preservedState = preservedViewerStateRef.current;
    const startSceneId = preservedState && tourScenes.some((scene) => scene.id === preservedState.sceneId)
      ? preservedState.sceneId
      : 'entrance';
    const settleFrames = new Set<number>();
    let disposed = false;
    let restoringInitialView = Boolean(preservedState && preservedState.sceneId === startSceneId);
    let cleanupViewer: (() => void) | undefined;
    const initializeFrame = window.requestAnimationFrame(() => {
      if (disposed || viewerGenerationRef.current !== generation) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const createArrowElement = (link: { nodeId: string }): HTMLElement => {
      const target = resolveTourScene(getScene(link.nodeId as SceneId), callbacksRef.current.content);
      const targetTitle = localize(target.title, callbacksRef.current.locale);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tour-arrow';
      button.dataset.target = target.id;
      button.setAttribute('aria-label', goToScene(callbacksRef.current.locale, targetTitle));

      const icon = document.createElement('span');
      icon.className = 'tour-arrow__icon';
      icon.setAttribute('aria-hidden', 'true');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 72 42');
      svg.setAttribute('focusable', 'false');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'tour-arrow__chevron');
      path.setAttribute('d', 'M6 27 36 7 66 27 58 37 36 22 14 37Z');
      svg.append(path);
      icon.append(svg);
      button.append(icon);
      return button;
    };

    const viewer = new Viewer({
      container,
      navbar: false,
      defaultZoomLvl: 22,
      minFov: 35,
      maxFov: 100,
      canvasBackground: '#082f49',
      adapter: EquirectangularAdapter.withConfig({
        shader: true,
        useXmpData: false
      }),
      defaultTransition: { effect: 'fade', speed: reducedMotion ? 0 : 650, rotation: false },
      plugins: [
        MarkersPlugin.withConfig({
          defaultHoverScale: reducedMotion ? false : { amount: 1.12, duration: 130 },
          gotoMarkerSpeed: reducedMotion ? 0 : '6rpm'
        }),
        AutorotatePlugin.withConfig({
          autostartOnIdle: false,
          autorotateSpeed: '-1.2rpm',
          autorotatePitch: 0
        }),
        VirtualTourPlugin.withConfig({
          nodes: buildTourNodes(),
          startNodeId: startSceneId,
          positionMode: 'manual',
          renderMode: '2d',
          preload: false,
          transitionOptions: (_toNode, _fromNode, fromLink) => {
            viewAnimationIdRef.current += 1;
            void viewerRef.current?.stopAnimation();
            return getSceneTransitionOptions(Boolean(fromLink), reducedMotion);
          },
          arrowStyle: {
            element: createArrowElement,
            className: 'tour-arrow-marker',
            size: { width: 80, height: 60 }
          },
          getLinkTooltip: (_content, link) => {
            const target = resolveTourScene(getScene(link.nodeId as SceneId), callbacksRef.current.content);
            return goToScene(callbacksRef.current.locale, localize(target.title, callbacksRef.current.locale));
          }
        })
      ]
    });

    const markersPlugin = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
    const autorotatePlugin = viewer.getPlugin<AutorotatePlugin>(AutorotatePlugin);
    const virtualTourPlugin = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
    const disposePanoramaEnhancement = installPanoramaEnhancement(viewer.renderer);
    viewerRef.current = viewer;
    markersRef.current = markersPlugin;
    autorotateRef.current = autorotatePlugin;
    virtualTourRef.current = virtualTourPlugin;

    const setInitialView = (sceneId: SceneId, animate = false, speed = 550): void => {
      const scene = getScene(sceneId);
      if (animate && !reducedMotion) {
        void viewer.animate({
          yaw: toDegrees(scene.initialView.yaw),
          pitch: toDegrees(scene.initialView.pitch),
          zoom: scene.initialView.zoom,
          speed
        });
      } else {
        viewer.rotate({
          yaw: toDegrees(scene.initialView.yaw),
          pitch: toDegrees(scene.initialView.pitch)
        });
        viewer.zoom(scene.initialView.zoom);
      }
    };

    const buildInfoMarkers = (sceneId: SceneId): MarkerConfig[] => getInfoHotspots(getScene(sceneId)).map((baseHotspot) => {
      const hotspot = resolveInfoHotspot(baseHotspot, callbacksRef.current.content);
      const element = document.createElement('button') as HTMLButtonElement & MarkerElement;
      const title = localize(hotspot.title, callbacksRef.current.locale);
      const tapMovementThreshold = 10;
      let touchPointer: { pointerId: number; x: number; y: number } | null = null;
      let suppressClickUntil = 0;
      const openHotspot = (): void => callbacksRef.current.onInfo(hotspot);
      element.type = 'button';
      element.className = 'info-hotspot';
      element.textContent = 'i';
      element.setAttribute('aria-label', `${message(callbacksRef.current.locale, 'infoPoint')}: ${title}`);
      element.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' || !event.isPrimary) return;
        touchPointer = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      });
      element.addEventListener('pointermove', (event) => {
        if (!touchPointer || event.pointerId !== touchPointer.pointerId) return;
        if (Math.hypot(event.clientX - touchPointer.x, event.clientY - touchPointer.y) > tapMovementThreshold) {
          touchPointer = null;
        }
      });
      element.addEventListener('pointercancel', () => {
        touchPointer = null;
      });
      element.addEventListener('pointerup', (event) => {
        if (!touchPointer || event.pointerId !== touchPointer.pointerId) return;
        const moved = Math.hypot(event.clientX - touchPointer.x, event.clientY - touchPointer.y);
        touchPointer = null;
        if (moved > tapMovementThreshold) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickUntil = performance.now() + 750;
        openHotspot();
      });
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        if (performance.now() < suppressClickUntil) return;
        openHotspot();
      });
      return {
        id: hotspot.id,
        element,
        position: { yaw: toDegrees(hotspot.yaw), pitch: toDegrees(hotspot.pitch) },
        size: { width: 48, height: 48 },
        anchor: 'center center',
        tooltip: title,
        hideList: true,
        data: { type: 'info', hotspotId: hotspot.id }
      };
    });

    viewer.addEventListener(viewerEvents.LoadProgressEvent.type, ({ progress }) => {
      if (disposed) return;
      callbacksRef.current.onProgress(Math.max(0, Math.min(100, Math.round(progress))));
    });
    viewer.addEventListener(viewerEvents.PanoramaErrorEvent.type, () => {
      if (!disposed) callbacksRef.current.onError();
    });
    viewer.addEventListener(viewerEvents.ReadyEvent.type, () => {
      if (disposed) return;
      const node = virtualTourPlugin.getCurrentNode();
      const sceneId = (node?.id as SceneId | undefined) ?? startSceneId;
      callbacksRef.current.onReady(sceneId);
      markersPlugin.setMarkers(buildInfoMarkers(sceneId));
      if (preservedState && sceneId === preservedState.sceneId) {
        viewer.rotate({ yaw: preservedState.yaw, pitch: preservedState.pitch });
        viewer.zoom(preservedState.zoom);
      } else {
        setInitialView(sceneId);
      }
      const restoreFrame = window.requestAnimationFrame(() => {
        settleFrames.delete(restoreFrame);
        restoringInitialView = false;
      });
      settleFrames.add(restoreFrame);
    }, { once: true });
    viewer.addEventListener(viewerEvents.PanoramaLoadedEvent.type, () => {
      if (!disposed) viewer.hideError();
    });
    virtualTourPlugin.addEventListener(virtualTourEvents.NodeChangedEvent.type, ({ node, data }) => {
      if (disposed) return;
      const sceneId = node.id as SceneId;
      callbacksRef.current.onSceneChange(sceneId);
      markersPlugin.setMarkers(buildInfoMarkers(sceneId));
      if (restoringInitialView && sceneId === startSceneId) return;
      const animationId = ++viewAnimationIdRef.current;
      const settleAfterArrow = Boolean(data.fromLink) && !reducedMotion;
      const settleFrame = window.requestAnimationFrame(() => {
        settleFrames.delete(settleFrame);
        if (disposed || animationId !== viewAnimationIdRef.current) return;
        void Promise.resolve(viewer.stopAnimation()).then(() => {
          if (disposed || animationId !== viewAnimationIdRef.current) return;
          setInitialView(sceneId, settleAfterArrow, ARROW_SETTLE_DURATION);
        }).catch(() => undefined);
      });
      settleFrames.add(settleFrame);
    });
    refreshMarkersRef.current = () => {
      const sceneId = virtualTourPlugin.getCurrentNode()?.id as SceneId | undefined;
      if (sceneId) markersPlugin.setMarkers(buildInfoMarkers(sceneId));
    };
    autorotatePlugin.addEventListener(autorotateEvents.AutorotateEvent.type, ({ autorotateEnabled }) => {
      callbacksRef.current.onAutorotate(autorotateEnabled);
    });

      cleanupViewer = () => {
        if (disposed) return;
        disposed = true;
        viewAnimationIdRef.current += 1;
        settleFrames.forEach((frame) => window.cancelAnimationFrame(frame));
        settleFrames.clear();
        try {
          const sceneId = virtualTourPlugin.getCurrentNode()?.id as SceneId | undefined;
          if (sceneId) {
            const position = viewer.getPosition();
            preservedViewerStateRef.current = {
              sceneId,
              yaw: position.yaw,
              pitch: position.pitch,
              zoom: viewer.getZoomLevel()
            };
          }
        } catch {
          preservedViewerStateRef.current = null;
        }
        disposePanoramaEnhancement();
        viewerRef.current = null;
        markersRef.current = null;
        virtualTourRef.current = null;
        autorotateRef.current = null;
        refreshMarkersRef.current = null;
        void Promise.resolve(viewer.stopAnimation()).catch(() => undefined);
        viewer.destroy();
      };
    });

    return () => {
      viewerGenerationRef.current += 1;
      window.cancelAnimationFrame(initializeFrame);
      if (cleanupViewer) {
        cleanupViewer();
      } else {
        disposed = true;
      }
    };
  }, [tourStructureSignature]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.querySelectorAll<HTMLButtonElement>('.tour-arrow[data-target]').forEach((button) => {
      const targetId = button.dataset.target as SceneId | undefined;
      if (!targetId) return;
      const target = resolveTourScene(getScene(targetId), content);
      const targetTitle = localize(target.title, locale);
      button.setAttribute('aria-label', goToScene(locale, targetTitle));
    });
    refreshMarkersRef.current?.();
  }, [locale, content]);

  return (
    <div
      ref={containerRef}
      id="tour-viewer"
      className="tour-viewer"
      tabIndex={0}
      role="region"
      aria-label={message(locale, 'viewerLabel')}
      aria-describedby="viewer-help"
    />
  );
});

export default TourViewer;
