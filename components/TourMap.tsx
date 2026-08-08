'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import {
  getScene,
  getSceneEdges,
  getMapLandmarkScenes,
  getTourStructureSignature,
  localize,
  tourMap,
  type Locale,
  type MapPosition,
  type SceneId
} from '../src/tour-data';
import { goToScene, message } from '../src/i18n';
import { resolveTourScene, type PublicContentSnapshot } from '../src/content';

interface TourMapProps {
  readonly locale: Locale;
  readonly currentSceneId: SceneId;
  readonly content: PublicContentSnapshot;
  readonly onNavigate: (sceneId: SceneId) => void;
  readonly expanded: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
}

interface CalibrationPoint {
  readonly x: number;
  readonly y: number;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const toLatLngTuple = ({ x, y }: MapPosition): [number, number] => [tourMap.height - y, x];

export default function TourMap({ locale, currentSceneId, content, onNavigate, expanded, onExpandedChange }: TourMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef(new Map<SceneId, LeafletMarker>());
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const onNavigateRef = useRef(onNavigate);
  const localeRef = useRef(locale);
  const currentSceneIdRef = useRef(currentSceneId);
  const contentRef = useRef(content);
  const followingRef = useRef(true);
  const coverMapRef = useRef<(() => void) | null>(null);
  const preservedMapViewRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const [following, setFollowing] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [calibrationPoint, setCalibrationPoint] = useState<CalibrationPoint | null>(null);
  const [copied, setCopied] = useState(false);
  onNavigateRef.current = onNavigate;
  localeRef.current = locale;
  currentSceneIdRef.current = currentSceneId;
  contentRef.current = content;
  const tourStructureSignature = getTourStructureSignature();
  const landmarkScenes = getMapLandmarkScenes();

  const setFollowMode = (value: boolean): void => {
    followingRef.current = value;
    setFollowing(value);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let initializeFrame: number | undefined;

    void import('leaflet').then((leaflet) => {
      if (cancelled || mapRef.current) return;

      const imageBounds = leaflet.latLngBounds(
        leaflet.latLng(0, 0),
        leaflet.latLng(tourMap.height, tourMap.width)
      );
      const map = leaflet.map(container, {
        crs: leaflet.CRS.Simple,
        minZoom: -2,
        maxZoom: 3,
        zoomSnap: 0.25,
        maxBounds: imageBounds,
        maxBoundsViscosity: 1,
        attributionControl: false
      });
      const toLatLng = (position: MapPosition) => leaflet.latLng(...toLatLngTuple(position));

      leaflet.imageOverlay(tourMap.image, imageBounds, {
        alt: message(localeRef.current, 'mapImageAlt')
      }).addTo(map);

      leaflet.polyline(
        getSceneEdges().map((edge) => [
          toLatLng(getScene(edge.from).mapPosition),
          toLatLng(getScene(edge.to).mapPosition)
        ]),
        { color: '#0ea5e9', weight: 3, opacity: 0.82, dashArray: '8 6' }
      ).addTo(map);

      for (const scene of landmarkScenes) {
        const isCurrent = scene.id === currentSceneIdRef.current;
        const title = localize(resolveTourScene(scene, contentRef.current).title, localeRef.current);
        const icon = leaflet.divIcon({
          className: 'tour-map-marker-shell',
          html: `<span class="tour-map-landmark-marker${isCurrent ? ' is-current' : ''}" aria-hidden="true"></span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        const marker = leaflet.marker(toLatLng(scene.mapPosition), {
          icon,
          keyboard: true,
          title: goToScene(localeRef.current, title),
          alt: goToScene(localeRef.current, title),
          zIndexOffset: isCurrent ? 1000 : 0,
          riseOnHover: true
        });
        marker.bindTooltip(title, { direction: 'top', offset: [0, -16] });
        marker.on('focus', () => marker.openTooltip());
        marker.on('blur', () => marker.closeTooltip());
        marker.on('click', () => onNavigateRef.current(scene.id));
        marker.addTo(map);
        markerRefs.current.set(scene.id, marker);
      }

      const userIcon = leaflet.divIcon({
        className: 'tour-map-user-shell',
        html: '<span class="tour-map-user"><span class="tour-map-user__dot"></span></span>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      userMarkerRef.current = leaflet.marker(toLatLng(getScene(currentSceneIdRef.current).mapPosition), {
        icon: userIcon,
        interactive: false,
        keyboard: false,
        zIndexOffset: 2200
      }).addTo(map);

      const coverMap = (): void => {
        map.invalidateSize({ pan: false });
        const coverZoom = Math.max(-2, Math.min(3, map.getBoundsZoom(imageBounds, true)));
        map.setMinZoom(coverZoom);
        if (!Number.isFinite(map.getZoom())) {
          map.setView(toLatLng(getScene(currentSceneIdRef.current).mapPosition), coverZoom, { animate: false });
          return;
        }
        if (map.getZoom() < coverZoom) map.setZoom(coverZoom, { animate: false });
        map.panInsideBounds(imageBounds, { animate: false });
      };
      coverMapRef.current = coverMap;

      map.on('dragstart', () => setFollowMode(false));
      if (isDevelopment) {
        map.on('click', ({ latlng }) => {
          const point = {
            x: Math.max(0, Math.min(tourMap.width, Math.round(latlng.lng))),
            y: Math.max(0, Math.min(tourMap.height, Math.round(tourMap.height - latlng.lat)))
          };
          setCalibrationPoint(point);
          setCopied(false);
        });
      }

      mapRef.current = map;
      initializeFrame = window.requestAnimationFrame(() => {
        initializeFrame = undefined;
        if (cancelled) return;
        coverMap();
        const preservedView = preservedMapViewRef.current;
        if (preservedView) {
          map.setView([preservedView.lat, preservedView.lng], Math.max(preservedView.zoom, map.getMinZoom()), { animate: false });
        } else {
          map.setView(toLatLng(getScene(currentSceneIdRef.current).mapPosition), map.getMinZoom(), { animate: false });
        }
      });
    });

    const resizeObserver = new ResizeObserver(() => coverMapRef.current?.());
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      if (initializeFrame !== undefined) window.cancelAnimationFrame(initializeFrame);
      resizeObserver.disconnect();
      markerRefs.current.clear();
      userMarkerRef.current = null;
      coverMapRef.current = null;
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        preservedMapViewRef.current = { lat: center.lat, lng: center.lng, zoom: mapRef.current.getZoom() };
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [tourStructureSignature]);

  useEffect(() => {
    const currentPosition = getScene(currentSceneId).mapPosition;
    userMarkerRef.current?.setLatLng(toLatLngTuple(currentPosition));
    if (followingRef.current) {
      mapRef.current?.panTo(toLatLngTuple(currentPosition), {
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: 0.35
      });
    }
    for (const [sceneId, marker] of markerRefs.current) {
      const scene = getScene(sceneId);
      const isCurrent = sceneId === currentSceneId;
      const title = localize(resolveTourScene(scene, content).title, locale);
      const accessibleTitle = goToScene(locale, title);
      const element = marker.getElement();
      element?.querySelector('.tour-map-landmark-marker')?.classList.toggle('is-current', isCurrent);
      element?.setAttribute('title', accessibleTitle);
      element?.setAttribute('alt', accessibleTitle);
      element?.setAttribute('aria-label', accessibleTitle);
      marker.setZIndexOffset(isCurrent ? 1000 : 0);
      marker.getTooltip()?.setContent(title);
    }

    containerRef.current?.querySelector<HTMLImageElement>('.leaflet-image-layer')
      ?.setAttribute('alt', message(locale, 'mapImageAlt'));
  }, [content, currentSceneId, locale]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      coverMapRef.current?.();
      if (followingRef.current) mapRef.current?.panTo(toLatLngTuple(getScene(currentSceneIdRef.current).mapPosition), { animate: false });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

  useEffect(() => {
    if (!controlsOpen) return;
    const closeControls = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setControlsOpen(false);
    };
    window.addEventListener('keydown', closeControls);
    return () => window.removeEventListener('keydown', closeControls);
  }, [controlsOpen]);

  const resetMap = (): void => {
    const map = mapRef.current;
    if (!map) return;
    setFollowMode(false);
    map.setView([tourMap.height / 2, tourMap.width / 2], map.getMinZoom(), { animate: false });
  };

  const followCurrentScene = (): void => {
    setFollowMode(true);
    mapRef.current?.panTo(toLatLngTuple(getScene(currentSceneIdRef.current).mapPosition), {
      animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      duration: 0.35
    });
  };

  const copyCalibrationPoint = async (): Promise<void> => {
    if (!calibrationPoint) return;
    const value = `{ x: ${calibrationPoint.x}, y: ${calibrationPoint.y} }`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="route-map tour-map-panel">
      <div id="tour-map-canvas" ref={containerRef} className="leaflet-tour-map" role="application" aria-label={message(locale, 'mapTitle')} />
      <div className={`map-controls${controlsOpen ? ' is-open' : ''}`}>
        <button
          className="map-controls__toggle"
          type="button"
          aria-expanded={controlsOpen}
          aria-controls="map-extra-controls"
          aria-label={message(locale, controlsOpen ? 'mapCloseControls' : 'mapMore')}
          onClick={() => setControlsOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
        </button>
        <div id="map-extra-controls" className="map-toolbar" hidden={!controlsOpen}>
          <button className={following ? 'is-active' : ''} type="button" aria-pressed={following} onClick={() => { followCurrentScene(); setControlsOpen(false); }}>
            {message(locale, 'mapFollow')}
          </button>
          <button type="button" onClick={() => { resetMap(); setControlsOpen(false); }}>{message(locale, 'mapShowAll')}</button>
          <button type="button" aria-expanded={expanded} aria-controls="tour-map-canvas" onClick={() => { onExpandedChange(!expanded); setControlsOpen(false); }}>
            {message(locale, expanded ? 'mapCollapse' : 'mapExpand')}
          </button>
        </div>
      </div>
      {isDevelopment ? (
        <div className="map-calibration" aria-live="polite">
          <strong>{message(locale, 'mapCalibration')}</strong>
          <span>{calibrationPoint ? `{ x: ${calibrationPoint.x}, y: ${calibrationPoint.y} }` : message(locale, 'mapClickCoordinates')}</span>
          <button type="button" disabled={!calibrationPoint} onClick={() => void copyCalibrationPoint()}>
            {message(locale, copied ? 'mapCopied' : 'mapCopyCoordinates')}
          </button>
        </div>
      ) : null}
      <div className="sr-only">
        {landmarkScenes.map((scene) => (
          <button key={scene.id} type="button" onClick={() => onNavigate(scene.id)}>
            {goToScene(locale, localize(resolveTourScene(scene, content).title, locale))}
          </button>
        ))}
      </div>
    </div>
  );
}
