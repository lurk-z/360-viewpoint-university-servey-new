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
  readonly onInfo: (hotspot: InfoHotspot) => void;
  readonly onProgress: (progress: number) => void;
  readonly onReady: (sceneId: SceneId) => void;
  readonly onSceneChange: (sceneId: SceneId) => void;
  readonly onError: () => void;
  readonly onAutorotate: (enabled: boolean) => void;
}

interface ViewerCallbacks {
  locale: Locale;
  onInfo: (hotspot: InfoHotspot) => void;
  onProgress: (progress: number) => void;
  onReady: (sceneId: SceneId) => void;
  onSceneChange: (sceneId: SceneId) => void;
  onError: () => void;
  onAutorotate: (enabled: boolean) => void;
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
  { locale, onInfo, onProgress, onReady, onSceneChange, onError, onAutorotate },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const markersRef = useRef<MarkersPlugin | null>(null);
  const virtualTourRef = useRef<VirtualTourPlugin | null>(null);
  const autorotateRef = useRef<AutorotatePlugin | null>(null);
  const viewAnimationIdRef = useRef(0);
  const callbacksRef = useRef<ViewerCallbacks>({
    locale,
    onInfo,
    onProgress,
    onReady,
    onSceneChange,
    onError,
    onAutorotate
  });
  callbacksRef.current = { locale, onInfo, onProgress, onReady, onSceneChange, onError, onAutorotate };

  useImperativeHandle(ref, () => ({
    navigate: async (sceneId) => {
      const plugin = virtualTourRef.current;
      if (!plugin) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      viewAnimationIdRef.current += 1;
      await viewerRef.current?.stopAnimation();
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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const createArrowElement = (link: { nodeId: string }): HTMLElement => {
      const target = getScene(link.nodeId as SceneId);
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
      svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M12 20V5m0 0-6 6m6-6 6 6');
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
      canvasBackground: '#431407',
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
          startNodeId: 'entrance',
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
            size: { width: 45, height: 45 }
          },
          getLinkTooltip: (_content, link) => {
            const target = getScene(link.nodeId as SceneId);
            return goToScene(callbacksRef.current.locale, localize(target.title, callbacksRef.current.locale));
          }
        })
      ]
    });

    const markersPlugin = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
    const autorotatePlugin = viewer.getPlugin<AutorotatePlugin>(AutorotatePlugin);
    const virtualTourPlugin = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
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

    const buildInfoMarkers = (sceneId: SceneId): MarkerConfig[] => getInfoHotspots(getScene(sceneId)).map((hotspot) => {
      const element = document.createElement('button') as HTMLButtonElement & MarkerElement;
      const title = localize(hotspot.title, callbacksRef.current.locale);
      element.type = 'button';
      element.className = 'info-hotspot';
      element.textContent = 'i';
      element.setAttribute('aria-label', `${message(callbacksRef.current.locale, 'infoPoint')}: ${title}`);
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        callbacksRef.current.onInfo(hotspot);
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
      callbacksRef.current.onProgress(Math.max(0, Math.min(100, Math.round(progress))));
    });
    viewer.addEventListener(viewerEvents.PanoramaErrorEvent.type, () => callbacksRef.current.onError());
    viewer.addEventListener(viewerEvents.ReadyEvent.type, () => {
      const node = virtualTourPlugin.getCurrentNode();
      const sceneId = (node?.id as SceneId | undefined) ?? 'entrance';
      callbacksRef.current.onReady(sceneId);
      markersPlugin.setMarkers(buildInfoMarkers(sceneId));
      setInitialView(sceneId);
    }, { once: true });
    viewer.addEventListener(viewerEvents.PanoramaLoadedEvent.type, () => viewer.hideError());
    virtualTourPlugin.addEventListener(virtualTourEvents.NodeChangedEvent.type, ({ node, data }) => {
      const sceneId = node.id as SceneId;
      callbacksRef.current.onSceneChange(sceneId);
      markersPlugin.setMarkers(buildInfoMarkers(sceneId));
      const animationId = ++viewAnimationIdRef.current;
      const settleAfterArrow = Boolean(data.fromLink) && !reducedMotion;
      window.requestAnimationFrame(() => {
        if (animationId !== viewAnimationIdRef.current) return;
        void viewer.stopAnimation().then(() => {
          if (animationId !== viewAnimationIdRef.current) return;
          setInitialView(sceneId, settleAfterArrow, ARROW_SETTLE_DURATION);
        });
      });
    });
    autorotatePlugin.addEventListener(autorotateEvents.AutorotateEvent.type, ({ autorotateEnabled }) => {
      callbacksRef.current.onAutorotate(autorotateEnabled);
    });

    return () => {
      viewer.destroy();
      viewerRef.current = null;
      markersRef.current = null;
      virtualTourRef.current = null;
      autorotateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.querySelectorAll<HTMLButtonElement>('.tour-arrow[data-target]').forEach((button) => {
      const targetId = button.dataset.target as SceneId | undefined;
      if (!targetId) return;
      const target = getScene(targetId);
      const targetTitle = localize(target.title, locale);
      button.setAttribute('aria-label', goToScene(locale, targetTitle));
    });
  }, [locale]);

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
