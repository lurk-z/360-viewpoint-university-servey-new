'use client';

import { useEffect, useRef } from 'react';
import { Viewer, events } from '@photo-sphere-viewer/core';
import { MarkersPlugin, type MarkerConfig } from '@photo-sphere-viewer/markers-plugin';

export interface AdminInfoMarker {
  readonly id: string;
  readonly yaw: number;
  readonly pitch: number;
}

function buildMarkers(
  hotspots: readonly AdminInfoMarker[],
  selectedHotspotId: string | undefined,
  onSelect: ((hotspotId: string) => void) | undefined
): MarkerConfig[] {
  return hotspots.map((hotspot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `info-hotspot admin-info-hotspot${hotspot.id === selectedHotspotId ? ' is-selected' : ''}`;
    button.textContent = 'i';
    button.title = hotspot.id;
    button.setAttribute('aria-label', `เลือกปุ่ม Info ${hotspot.id}`);
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect?.(hotspot.id);
    });
    return {
      id: hotspot.id,
      element: button,
      position: { yaw: `${hotspot.yaw}deg`, pitch: `${hotspot.pitch}deg` },
      size: { width: 48, height: 48 },
      anchor: 'center center',
      tooltip: hotspot.id,
      hideList: true
    };
  });
}

export default function AdminPanoramaPlacement({
  panorama,
  hotspots,
  selectedHotspotId,
  onPosition,
  onSelect
}: {
  readonly panorama: string;
  readonly hotspots: readonly AdminInfoMarker[];
  readonly selectedHotspotId?: string;
  readonly onPosition: (position: { yaw: number; pitch: number }) => void;
  readonly onSelect?: (hotspotId: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<MarkersPlugin | null>(null);
  const callbackRef = useRef(onPosition);
  const selectRef = useRef(onSelect);
  callbackRef.current = onPosition;
  selectRef.current = onSelect;

  useEffect(() => {
    if (!hostRef.current || !panorama) return;
    const viewer = new Viewer({
      container: hostRef.current,
      panorama,
      navbar: ['zoom', 'fullscreen'],
      mousewheelCtrlKey: false,
      touchmoveTwoFingers: false,
      plugins: [MarkersPlugin]
    });
    const markers = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
    markersRef.current = markers;
    markers.setMarkers(buildMarkers(hotspots, selectedHotspotId, (id) => selectRef.current?.(id)));
    const click = (event: events.ClickEvent): void => {
      if (event.data.rightclick) return;
      const clickedElement = document.elementFromPoint(event.data.clientX, event.data.clientY);
      if (clickedElement?.closest('.admin-info-hotspot')) return;
      callbackRef.current({
          yaw: Math.round((event.data.yaw * 180 / Math.PI) * 10) / 10,
          pitch: Math.round((event.data.pitch * 180 / Math.PI) * 10) / 10
        });
    };
    viewer.addEventListener(events.ClickEvent.type, click);
    return () => {
      viewer.removeEventListener(events.ClickEvent.type, click);
      markersRef.current = null;
      viewer.destroy();
    };
    // Panorama changes rebuild the viewer; marker edits are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panorama]);

  useEffect(() => {
    markersRef.current?.setMarkers(buildMarkers(
      hotspots,
      selectedHotspotId,
      (id) => selectRef.current?.(id)
    ));
  }, [hotspots, selectedHotspotId]);

  return <div className="admin-panorama-placement" ref={hostRef} aria-label="ภาพพาโนรามาสำหรับวางตำแหน่ง" />;
}
