'use client';

import { message } from '../../src/i18n';
import type { Locale } from '../../src/tour-data';
import TourIcon from './TourIcon';

interface GuidedTourBarProps {
  readonly locale: Locale;
  readonly destinationLabel: string;
  readonly currentIndex: number;
  readonly sceneCount: number;
  readonly stopCount: number;
  readonly remainingStops: number;
  readonly canOpenPlace: boolean;
  readonly canOpenFaculty: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onOpenPlace: () => void;
  readonly onOpenFaculty: () => void;
  readonly onOpenMap: () => void;
  readonly onCancel: () => void;
}

export default function GuidedTourBar({
  locale,
  destinationLabel,
  currentIndex,
  sceneCount,
  stopCount,
  remainingStops,
  canOpenPlace,
  canOpenFaculty,
  onPrevious,
  onNext,
  onOpenPlace,
  onOpenFaculty,
  onOpenMap,
  onCancel
}: GuidedTourBarProps) {
  const arrived = currentIndex === sceneCount - 1;
  return (
    <section className={`guided-tour${arrived ? ' is-arrived' : ''}`} aria-live="polite">
      <div>
        <span>{message(locale, arrived ? 'guidedTourArrived' : 'guidedTourTitle')}</span>
        <strong>{destinationLabel}</strong>
        <small>{currentIndex + 1} / {sceneCount}</small>
        {stopCount > 1 ? (
          <small>{locale === 'th' ? `เหลือ ${remainingStops} จุดหมาย` : `${remainingStops} stops remaining`}</small>
        ) : null}
      </div>
      <div className="guided-tour__actions">
        <button type="button" aria-label={message(locale, 'guidedTourPrevious')} disabled={currentIndex === 0} onClick={onPrevious}>
          <TourIcon><path d="m15 18-6-6 6-6" /></TourIcon><span>{message(locale, 'guidedTourPrevious')}</span>
        </button>
        {!arrived ? (
          <button className="is-primary" type="button" aria-label={message(locale, 'guidedTourNext')} onClick={onNext}>
            <TourIcon><path d="m9 18 6-6-6-6" /></TourIcon><span>{message(locale, 'guidedTourNext')}</span>
          </button>
        ) : <>
          {canOpenPlace ? (
            <button className="is-primary" type="button" aria-label={message(locale, 'guidedTourOpenPlace')} onClick={onOpenPlace}>
              <TourIcon><path d="M4 5h16v14H4zM8 9h8M8 13h6" /></TourIcon><span>{message(locale, 'guidedTourOpenPlace')}</span>
            </button>
          ) : null}
          {canOpenFaculty ? (
            <button className="is-primary" type="button" aria-label={message(locale, 'guidedTourOpenFaculty')} onClick={onOpenFaculty}>
              <TourIcon><path d="m3 9 9-5 9 5-9 5-9-5ZM7 12v4c3 2 7 2 10 0v-4" /></TourIcon><span>{message(locale, 'guidedTourOpenFaculty')}</span>
            </button>
          ) : null}
        </>}
        <button type="button" aria-label={message(locale, 'guidedTourOpenMap')} onClick={onOpenMap}>
          <TourIcon><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15" /></TourIcon><span>{message(locale, 'guidedTourOpenMap')}</span>
        </button>
        <button type="button" aria-label={message(locale, 'guidedTourCancel')} onClick={onCancel}>
          <TourIcon><path d="m6 6 12 12M18 6 6 18" /></TourIcon><span>{message(locale, 'guidedTourCancel')}</span>
        </button>
      </div>
    </section>
  );
}
