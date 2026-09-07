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
} from '@photo-sphere-viewer/markers-plugin';
import {
  VirtualTourPlugin,
  events as virtualTourEvents
} from '@photo-sphere-viewer/virtual-tour-plugin';
import {
  getTourInfoGeometrySignature,
  getTourNavigationSignature,
  getTourViewerInventorySignature,
  getScene,
  localize,
  toDegrees,
  tourScenes,
  type InfoHotspot,
  type Locale,
  type SceneId
} from '../src/tour-data';
import { goDownToScene, goToScene, message } from '../src/i18n';
import {
  ARROW_SETTLE_DURATION,
  getSceneTransitionOptions
} from '../src/viewer-transition';
import { installPanoramaEnhancement } from '../src/panorama-enhancement';
import { resolveTourScene, type PublicContentSnapshot } from '../src/content';
import { buildInfoMarkers, createNavigationArrowElement } from './tour/viewer/viewer-elements';
import { buildTourNodes, getSceneNavigationSignature } from './tour/viewer/viewer-nodes';
import useNavigationHotReload from './tour/viewer/useNavigationHotReload';
import type { NavigationPositionPreview, TourViewerHandle, ViewerCallbacks } from './tour/viewer/types';

export type { NavigationPositionPreview, TourViewerHandle } from './tour/viewer/types';

interface TourViewerProps {
  readonly initialSceneId?: SceneId;
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly onInfo: (hotspot: InfoHotspot) => void;
  readonly onProgress: (progress: number) => void;
  readonly onReady: (sceneId: SceneId) => void;
  readonly onSceneChange: (sceneId: SceneId) => void;
  readonly onError: () => void;
  readonly onAutorotate: (enabled: boolean) => void;
  readonly onViewYaw?: (yaw: number) => void;
  readonly navigationPlacementHotspotId?: string;
  readonly navigationPreview?: NavigationPositionPreview | null;
  readonly onNavigationPositionPick?: (position: NavigationPositionPreview) => void;
}

interface PreservedViewerState {
  readonly sceneId: SceneId;
  readonly yaw: number;
  readonly pitch: number;
  readonly zoom: number;
}

const TourViewer = forwardRef<TourViewerHandle, TourViewerProps>(function TourViewer(
  {
    initialSceneId,
    locale,
    content,
    onInfo,
    onProgress,
    onReady,
    onSceneChange,
    onError,
    onAutorotate,
    onViewYaw,
    navigationPlacementHotspotId,
    navigationPreview,
    onNavigationPositionPick
  },
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
  const sceneNavigationSignaturesRef = useRef(new Map<string, string>());
  const navigationPreviewRef = useRef<NavigationPositionPreview | null>(navigationPreview ?? null);
  navigationPreviewRef.current = navigationPreview ?? null;
  const callbacksRef = useRef<ViewerCallbacks>({
    locale,
    content,
    onInfo,
    onProgress,
    onReady,
    onSceneChange,
    onError,
    onAutorotate,
    onViewYaw,
    navigationPlacementHotspotId,
    onNavigationPositionPick
  });
  callbacksRef.current = {
    locale,
    content,
    onInfo,
    onProgress,
    onReady,
    onSceneChange,
    onError,
    onAutorotate,
    onViewYaw,
    navigationPlacementHotspotId,
    onNavigationPositionPick
  };
  const viewerInventorySignature = getTourViewerInventorySignature();
  const navigationSignature = `${getTourNavigationSignature()}|${navigationPreview
    ? `${navigationPreview.hotspotId}:${navigationPreview.yaw}:${navigationPreview.pitch}`
    : 'no-preview'}`;
  const infoGeometrySignature = getTourInfoGeometrySignature();

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
      : initialSceneId && tourScenes.some((scene) => scene.id === initialSceneId)
        ? initialSceneId
        : 'entrance';
    const settleFrames = new Set<number>();
    let yawFrame = 0;
    let pendingYaw = 0;
    let disposed = false;
    let restoringInitialView = Boolean(preservedState && preservedState.sceneId === startSceneId);
    let cleanupViewer: (() => void) | undefined;
    const initializeFrame = window.requestAnimationFrame(() => {
      if (disposed || viewerGenerationRef.current !== generation) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
          nodes: buildTourNodes(navigationPreviewRef.current),
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
            element: (link) => createNavigationArrowElement(link, callbacksRef.current),
            className: 'tour-arrow-marker',
            size: { width: 80, height: 60 }
          },
          getLinkTooltip: (_content, link) => {
            const target = resolveTourScene(getScene(link.nodeId as SceneId), callbacksRef.current.content);
            const targetTitle = localize(target.title, callbacksRef.current.locale);
            return link.data?.direction === 'down'
              ? goDownToScene(callbacksRef.current.locale, targetTitle)
              : goToScene(callbacksRef.current.locale, targetTitle);
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
    sceneNavigationSignaturesRef.current = new Map(tourScenes.map((scene) => [
      scene.id,
      getSceneNavigationSignature(scene, navigationPreviewRef.current)
    ]));

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
      markersPlugin.setMarkers(buildInfoMarkers(sceneId, callbacksRef.current));
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
    viewer.addEventListener(viewerEvents.ClickEvent.type, ({ data }) => {
      const hotspotId = callbacksRef.current.navigationPlacementHotspotId;
      const onPick = callbacksRef.current.onNavigationPositionPick;
      if (!hotspotId || !onPick || data.rightclick) return;
      const clickedElement = document.elementFromPoint(data.clientX, data.clientY);
      if (clickedElement?.closest('.tour-arrow, .info-hotspot')) return;
      const toOneDecimalDegree = (radians: number): number => (
        Math.round((radians * 180 / Math.PI) * 10) / 10
      );
      onPick({
        hotspotId,
        yaw: toOneDecimalDegree(data.yaw),
        pitch: toOneDecimalDegree(data.pitch)
      });
    });
    viewer.addEventListener(viewerEvents.PositionUpdatedEvent.type, ({ position }) => {
      pendingYaw = ((position.yaw * 180 / Math.PI + 180) % 360 + 360) % 360 - 180;
      if (yawFrame) return;
      yawFrame = window.requestAnimationFrame(() => {
        yawFrame = 0;
        if (!disposed) callbacksRef.current.onViewYaw?.(pendingYaw);
      });
    });
    virtualTourPlugin.addEventListener(virtualTourEvents.NodeChangedEvent.type, ({ node, data }) => {
      if (disposed) return;
      const sceneId = node.id as SceneId;
      callbacksRef.current.onSceneChange(sceneId);
      markersPlugin.setMarkers(buildInfoMarkers(sceneId, callbacksRef.current));
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
      if (sceneId) markersPlugin.setMarkers(buildInfoMarkers(sceneId, callbacksRef.current));
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
        if (yawFrame) window.cancelAnimationFrame(yawFrame);
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
        sceneNavigationSignaturesRef.current = new Map();
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
  }, [initialSceneId, viewerInventorySignature]);

  useNavigationHotReload({
    pluginRef: virtualTourRef,
    sceneSignaturesRef: sceneNavigationSignaturesRef,
    navigationSignature,
    navigationPreview
  });

  useEffect(() => {
    refreshMarkersRef.current?.();
  }, [infoGeometrySignature]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const frame = window.requestAnimationFrame(() => {
      container.querySelectorAll<HTMLButtonElement>('.tour-arrow[data-hotspot-id]').forEach((button) => {
        button.classList.toggle(
          'is-dev-selected',
          button.dataset.hotspotId === navigationPlacementHotspotId
        );
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [navigationPlacementHotspotId, navigationSignature]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.querySelectorAll<HTMLButtonElement>('.tour-arrow[data-target]').forEach((button) => {
      const targetId = button.dataset.target as SceneId | undefined;
      if (!targetId) return;
      const target = resolveTourScene(getScene(targetId), content);
      const targetTitle = localize(target.title, locale);
      button.setAttribute(
        'aria-label',
        button.classList.contains('is-stairs-down')
          ? goDownToScene(locale, targetTitle)
          : goToScene(locale, targetTitle)
      );
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
