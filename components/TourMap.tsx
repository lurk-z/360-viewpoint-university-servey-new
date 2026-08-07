'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import {
  getSceneEdges,
  localize,
  tourMap,
  tourScenes,
  type Locale,
  type SceneId
} from '../src/tour-data';
import { goToScene, message } from '../src/i18n';

interface TourMapProps {
  readonly locale: Locale;
  readonly currentSceneId: SceneId;
  readonly onNavigate: (sceneId: SceneId) => void;
}

interface CalibrationPoint {
  readonly x: number;
  readonly y: number;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export default function TourMap({ locale, currentSceneId, onNavigate }: TourMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef(new Map<SceneId, LeafletMarker>());
  const onNavigateRef = useRef(onNavigate);
  const localeRef = useRef(locale);
  const currentSceneIdRef = useRef(currentSceneId);
  const [calibrationPoint, setCalibrationPoint] = useState<CalibrationPoint | null>(null);
  const [copied, setCopied] = useState(false);
  onNavigateRef.current = onNavigate;
  localeRef.current = locale;
  currentSceneIdRef.current = currentSceneId;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;

    void import('leaflet').then((leaflet) => {
      if (cancelled || mapRef.current) return;

      const imageBounds = leaflet.latLngBounds(
        leaflet.latLng(0, 0),
        leaflet.latLng(tourMap.height, tourMap.width)
      );
      const map = leaflet.map(container, {
        crs: leaflet.CRS.Simple,
        minZoom: -2,
        maxZoom: 2,
        zoomSnap: 0.25,
        maxBounds: imageBounds.pad(0.18),
        maxBoundsViscosity: 0.8,
        attributionControl: false
      });

      const toLatLng = ({ x, y }: CalibrationPoint) => leaflet.latLng(tourMap.height - y, x);
      const routeBounds = leaflet.latLngBounds(tourScenes.map((scene) => toLatLng(scene.mapPosition))).pad(0.22);

      leaflet.imageOverlay(tourMap.image, imageBounds, {
        alt: message(localeRef.current, 'mapImageAlt')
      }).addTo(map);

      leaflet.polyline(
        getSceneEdges().map((edge) => [
          toLatLng(tourScenes.find((scene) => scene.id === edge.from)?.mapPosition ?? { x: 0, y: 0 }),
          toLatLng(tourScenes.find((scene) => scene.id === edge.to)?.mapPosition ?? { x: 0, y: 0 })
        ]),
        { color: '#0ea5e9', weight: 3, opacity: 0.82, dashArray: '8 6' }
      ).addTo(map);

      for (const [index, scene] of tourScenes.entries()) {
        const isCurrent = scene.id === currentSceneIdRef.current;
        const title = localize(scene.title, localeRef.current);
        const icon = leaflet.divIcon({
          className: 'tour-map-marker-shell',
          html: `<span class="tour-map-marker${isCurrent ? ' is-current' : ''}">${index + 1}</span>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
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
        marker.on('click', () => onNavigateRef.current(scene.id));
        marker.addTo(map);
        markerRefs.current.set(scene.id, marker);
      }

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
      window.requestAnimationFrame(() => {
        map.invalidateSize();
        const routeZoom = container.clientHeight <= 145
          ? -0.25
          : container.clientWidth <= 300 ? 0 : 0.25;
        map.setView(routeBounds.getCenter(), routeZoom, { animate: false });
      });
    });

    const resizeObserver = new ResizeObserver(() => mapRef.current?.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      markerRefs.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    for (const [sceneId, marker] of markerRefs.current) {
      const scene = tourScenes.find((item) => item.id === sceneId);
      if (!scene) continue;
      const isCurrent = sceneId === currentSceneId;
      const title = localize(scene.title, locale);
      const accessibleTitle = goToScene(locale, title);
      const element = marker.getElement();
      element?.querySelector('.tour-map-marker')?.classList.toggle('is-current', isCurrent);
      element?.setAttribute('title', accessibleTitle);
      element?.setAttribute('alt', accessibleTitle);
      element?.setAttribute('aria-label', accessibleTitle);
      marker.setZIndexOffset(isCurrent ? 1000 : 0);
      marker.getTooltip()?.setContent(title);
    }

    containerRef.current
      ?.querySelector<HTMLImageElement>('.leaflet-image-layer')
      ?.setAttribute('alt', message(locale, 'mapImageAlt'));
  }, [currentSceneId, locale]);

  const resetMap = (): void => {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds([[0, 0], [tourMap.height, tourMap.width]], { padding: [8, 8] });
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
      <div
        ref={containerRef}
        className="leaflet-tour-map"
        role="application"
        aria-label={message(locale, 'mapTitle')}
      />
      <button className="map-reset" type="button" onClick={resetMap}>
        {message(locale, 'mapShowAll')}
      </button>
      {isDevelopment ? (
        <div className="map-calibration" aria-live="polite">
          <strong>{message(locale, 'mapCalibration')}</strong>
          <span>
            {calibrationPoint
              ? `{ x: ${calibrationPoint.x}, y: ${calibrationPoint.y} }`
                : message(locale, 'mapClickCoordinates')}
          </span>
          <button type="button" disabled={!calibrationPoint} onClick={() => void copyCalibrationPoint()}>
              {message(locale, copied ? 'mapCopied' : 'mapCopyCoordinates')}
          </button>
        </div>
      ) : null}
      <div className="sr-only">
        {tourScenes.map((scene) => (
          <button key={scene.id} type="button" onClick={() => onNavigate(scene.id)}>
            {goToScene(locale, localize(scene.title, locale))}
          </button>
        ))}
      </div>
    </div>
  );
}
