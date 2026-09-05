'use client';

import { EquirectangularAdapter, Viewer, events as viewerEvents } from '@photo-sphere-viewer/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { localize, type Locale } from '../src/tour-data';
import type {
  TourSupplementalMediaGroup,
  TourSupplementalMediaItem
} from '../src/tour-supplemental-media';
import { installPanoramaEnhancement } from '../src/panorama-enhancement';
import { ModalDialog } from './ModalDialog';

interface TourSupplementalMediaDialogProps {
  readonly locale: Locale;
  readonly group: TourSupplementalMediaGroup;
  readonly initialItemId?: string;
  readonly onClose: () => void;
}

function PanoramaPreview({ item, locale }: {
  readonly item: TourSupplementalMediaItem;
  readonly locale: Locale;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setProgress(0);
    setFailed(false);
    let viewer: Viewer;
    try {
      viewer = new Viewer({
        container,
        panorama: item.src,
        caption: localize(item.title, locale),
        navbar: ['zoom', 'move', 'fullscreen'],
        defaultZoomLvl: 24,
        minFov: 35,
        maxFov: 100,
        canvasBackground: '#082f49',
        adapter: EquirectangularAdapter.withConfig({ shader: true, useXmpData: false })
      });
    } catch {
      setFailed(true);
      return;
    }
    const disposeEnhancement = installPanoramaEnhancement(viewer.renderer);
    viewer.addEventListener(viewerEvents.LoadProgressEvent.type, ({ progress: nextProgress }) => {
      setProgress(Math.max(0, Math.min(100, Math.round(nextProgress))));
    });
    viewer.addEventListener(viewerEvents.PanoramaLoadedEvent.type, () => setProgress(100));
    viewer.addEventListener(viewerEvents.PanoramaErrorEvent.type, () => setFailed(true));
    return () => {
      disposeEnhancement();
      viewer.destroy();
    };
  }, [item.id, item.src, item.title, locale]);

  return (
    <div className="supplemental-panorama">
      <div
        ref={containerRef}
        className="supplemental-panorama__viewer"
        role="region"
        aria-label={localize(item.title, locale)}
      />
      {progress < 100 && !failed ? (
        <div className="supplemental-media__loading" role="status">
          <span>{locale === 'th' ? 'กำลังโหลดภาพ 360°' : 'Loading 360° panorama'}</span>
          <progress max={100} value={progress} />
        </div>
      ) : null}
      {failed ? (
        <p className="supplemental-media__error" role="alert">
          {locale === 'th' ? 'ไม่สามารถโหลดภาพตัวอย่างได้ กรุณาลองใหม่' : 'The preview could not be loaded. Please try again.'}
        </p>
      ) : null}
    </div>
  );
}

function FloorPlanPreview({ item, locale }: {
  readonly item: TourSupplementalMediaItem;
  readonly locale: Locale;
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => setZoom(1), [item.id]);

  return (
    <div className="supplemental-floor-plan">
      <div className="supplemental-floor-plan__tools" role="group" aria-label={locale === 'th' ? 'ควบคุมการซูมผัง' : 'Floor plan zoom controls'}>
        <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label={locale === 'th' ? 'ซูมเข้า' : 'Zoom in'}>+</button>
        <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))} aria-label={locale === 'th' ? 'ซูมออก' : 'Zoom out'}>−</button>
        <button type="button" onClick={() => setZoom(1)}>{locale === 'th' ? 'พอดีจอ' : 'Fit'}</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
      </div>
      <div className="supplemental-floor-plan__viewport" tabIndex={0}>
        <img
          src={item.src}
          alt={localize(item.title, locale)}
          style={{ width: `${zoom * 100}%` }}
          draggable={false}
        />
      </div>
    </div>
  );
}

export default function TourSupplementalMediaDialog({
  locale,
  group,
  initialItemId,
  onClose
}: TourSupplementalMediaDialogProps) {
  const initialItem = useMemo(() => (
    group.items.find((item) => item.id === initialItemId) ?? group.items[0]
  ), [group, initialItemId]);
  const [activeItemId, setActiveItemId] = useState(initialItem?.id);
  const activeItem = group.items.find((item) => item.id === activeItemId) ?? initialItem;

  useEffect(() => setActiveItemId(initialItem?.id), [group.id, initialItem?.id]);

  return (
    <ModalDialog
      open
      titleId="supplemental-media-title"
      wide
      closeLabel={locale === 'th' ? 'ปิด' : 'Close'}
      onClose={onClose}
    >
      <p className="eyebrow">{locale === 'th' ? 'สื่อภายในอาคาร' : 'Building media'}</p>
      <h2 id="supplemental-media-title">{localize(group.title, locale)}</h2>
      <p className="dialog-description">{localize(group.description, locale)}</p>
      <div className="supplemental-media__items" role="tablist" aria-label={localize(group.title, locale)}>
        {group.items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeItem?.id}
            className={item.id === activeItem?.id ? 'is-active' : ''}
            onClick={() => setActiveItemId(item.id)}
          >
            {localize(item.title, locale)}
          </button>
        ))}
      </div>
      {activeItem ? (
        <section className="supplemental-media__stage" role="tabpanel" aria-label={localize(activeItem.title, locale)}>
          <h3>{localize(activeItem.title, locale)}</h3>
          {activeItem.kind === 'panorama'
            ? <PanoramaPreview item={activeItem} locale={locale} />
            : <FloorPlanPreview item={activeItem} locale={locale} />}
        </section>
      ) : null}
    </ModalDialog>
  );
}
