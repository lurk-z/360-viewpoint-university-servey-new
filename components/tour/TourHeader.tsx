'use client';

import type { RefObject } from 'react';
import { message } from '../../src/i18n';
import type { Locale } from '../../src/tour-data';
import TourIcon from './TourIcon';

const FITM_LOGO_URL = '/mainimages/Logo_FitM/FITM_LOGO.png';

interface TourHeaderProps {
  readonly locale: Locale;
  readonly compact: boolean;
  readonly menuOpen: boolean;
  readonly menuRef: RefObject<HTMLDivElement | null>;
  readonly menuButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onMenuOpenChange: (open: boolean) => void;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly onOpenAcademics: () => void;
  readonly onOpenActivities: () => void;
  readonly onOpenAbout: () => void;
}

export default function TourHeader({
  locale,
  compact,
  menuOpen,
  menuRef,
  menuButtonRef,
  onMenuOpenChange,
  onLocaleChange,
  onOpenAcademics,
  onOpenActivities,
  onOpenAbout
}: TourHeaderProps) {
  const closeMenu = (): void => onMenuOpenChange(false);

  return (
    <header className="app-header">
      <a className="brand" href="#tour-viewer" aria-label="FITM 360° Virtual Tour">
        <span className="brand__mark brand__mark--fitm" aria-hidden="true">
          <img src={FITM_LOGO_URL} alt="" width={200} height={117} />
        </span>
        <span className="brand__copy">
          <strong>FITM 360° Virtual Tour</strong>
          <span>{message(locale, 'brandSubtitle')}</span>
        </span>
      </a>
      <div className="header-actions" ref={menuRef}>
        <nav
          id="tour-header-menu"
          className={`header-nav${menuOpen ? ' is-open' : ''}`}
          aria-label={message(locale, 'mainMenu')}
          aria-hidden={compact && !menuOpen}
          inert={compact && !menuOpen ? true : undefined}
        >
          <a className="header-button" href="/admin/login" aria-label={message(locale, 'adminLogin')} onClick={closeMenu}>
            <TourIcon><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></TourIcon>
            <span>{message(locale, 'adminLogin')}</span>
          </a>
          <button className="header-button" type="button" aria-label={message(locale, 'academicsButton')} onClick={() => { closeMenu(); onOpenAcademics(); }}>
            <TourIcon><path d="m3 9 9-5 9 5-9 5-9-5ZM7 12v4c3 2 7 2 10 0v-4M21 9v6" /></TourIcon>
            <span>{message(locale, 'academicsButton')}</span>
          </button>
          <button className="header-button" type="button" aria-label={message(locale, 'activitiesButton')} onClick={() => { closeMenu(); onOpenActivities(); }}>
            <TourIcon><path d="M5 5h14v15H5zM8 3v4M16 3v4M5 9h14M8 13h3M13 13h3M8 16h3" /></TourIcon>
            <span>{message(locale, 'activitiesButton')}</span>
          </button>
          <button className="header-button" type="button" onClick={() => { closeMenu(); onOpenAbout(); }}>
            <TourIcon><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></TourIcon>
            <span>{message(locale, 'aboutButton')}</span>
          </button>
        </nav>
        <div className="language-switch" role="group" aria-label={message(locale, 'languageLabel')}>
          <button type="button" aria-pressed={locale === 'th'} onClick={() => onLocaleChange('th')}>ไทย</button>
          <button type="button" aria-pressed={locale === 'en'} onClick={() => onLocaleChange('en')}>En</button>
        </div>
        <button
          ref={menuButtonRef}
          className="header-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="tour-header-menu"
          aria-label={message(locale, menuOpen ? 'closeMenu' : 'openMenu')}
          onClick={() => onMenuOpenChange(!menuOpen)}
        >
          <TourIcon>{menuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</TourIcon>
        </button>
      </div>
    </header>
  );
}
