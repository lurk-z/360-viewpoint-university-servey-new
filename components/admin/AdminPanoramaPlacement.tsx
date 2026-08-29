'use client';

import { useEffect, useRef } from 'react';
import { Viewer, events } from '@photo-sphere-viewer/core';

export default function AdminPanoramaPlacement({
  panorama,
  onPosition
}: {
  readonly panorama: string;
  readonly onPosition: (position: { yaw: number; pitch: number }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onPosition);
  callbackRef.current = onPosition;

  useEffect(() => {
    if (!hostRef.current || !panorama) return;
    const viewer = new Viewer({
      container: hostRef.current,
      panorama,
      navbar: ['zoom', 'fullscreen'],
      mousewheelCtrlKey: false,
      touchmoveTwoFingers: false
    });
    const click = (event: events.ClickEvent): void => {
      if (!event.data.rightclick) callbackRef.current({
        yaw: Math.round((event.data.yaw * 180 / Math.PI) * 10) / 10,
        pitch: Math.round((event.data.pitch * 180 / Math.PI) * 10) / 10
      });
    };
    viewer.addEventListener(events.ClickEvent.type, click);
    return () => {
      viewer.removeEventListener(events.ClickEvent.type, click);
      viewer.destroy();
    };
  }, [panorama]);

  return <div className="admin-panorama-placement" ref={hostRef} aria-label="ภาพพาโนรามาสำหรับวางตำแหน่ง" />;
}
