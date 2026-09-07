'use client';

import { loadingProgress, message } from '../../src/i18n';
import type { Locale } from '../../src/tour-data';
import TourIcon from './TourIcon';

const FITM_LOGO_URL = '/mainimages/Logo_FitM/FITM_LOGO.png';

interface TourIntroProps {
  readonly locale: Locale;
  readonly open: boolean;
  readonly ready: boolean;
  readonly progress: number;
  readonly error: string | null;
  readonly onStart: () => void;
  readonly onOpenTextTour: () => void;
}

export default function TourIntro({ locale, open, ready, progress, error, onStart, onOpenTextTour }: TourIntroProps) {
  return (
    <section id="intro" className={`intro${open ? '' : ' is-closing'}`} aria-labelledby="intro-title" hidden={!open}>
      <div className="intro__card">
        <div className="intro__brand" aria-hidden="true">
          <span className="brand__mark brand__mark--fitm brand__mark--large">
            <img src={FITM_LOGO_URL} alt="" width={200} height={117} />
          </span>
        </div>
        <p className="eyebrow">{message(locale, 'introEyebrow')}</p>
        <h2 id="intro-title">{message(locale, 'introTitle')}</h2>
        <p>{message(locale, 'introDescription')}</p>
        <div className="initial-loading" role="status" aria-live="polite">
          <progress max={100} value={progress} />
          <span>{ready ? message(locale, 'initialReady') : progress > 0 ? loadingProgress(locale, progress) : message(locale, 'initialLoading')}</span>
        </div>
        {error ? (
          <div className="load-error" role="alert">
            <strong>{message(locale, 'loadErrorTitle')}</strong>
            <span>{error}</span>
            <button className="secondary-button" type="button" onClick={() => window.location.reload()}>{message(locale, 'retry')}</button>
          </div>
        ) : null}
        <div className="intro__actions">
          <button className="primary-button" type="button" disabled={!ready} onClick={onStart}>
            <span>{message(locale, 'start')}</span>
            <TourIcon><path d="M5 12h14M13 6l6 6-6 6" /></TourIcon>
          </button>
          <button className="secondary-button" type="button" onClick={onOpenTextTour}>{message(locale, 'textTour')}</button>
        </div>
      </div>
    </section>
  );
}
