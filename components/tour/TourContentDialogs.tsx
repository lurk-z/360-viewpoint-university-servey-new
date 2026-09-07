'use client';

import { goToScene, imageCounter, message } from '../../src/i18n';
import { resolveInfoHotspot, resolveTourScene, type PublicContentSnapshot } from '../../src/content';
import {
  getInfoHotspots,
  localize,
  tourScenes,
  type InfoHotspot,
  type InfoImage,
  type Locale,
  type SceneId
} from '../../src/tour-data';
import { ModalDialog } from '../ModalDialog';
import TourIcon from './TourIcon';

function ReferenceLine({ hotspot, locale }: { readonly hotspot: InfoHotspot; readonly locale: Locale }) {
  const label = localize(hotspot.reference.label, locale);
  return (
    <p className="info-reference">
      <strong>{message(locale, 'sourceLabel')}:</strong>
      {hotspot.reference.url ? (
        <a href={hotspot.reference.url} target="_blank" rel="noopener noreferrer">{label}</a>
      ) : <span>{label}</span>}
    </p>
  );
}

export function TourInfoDialog({
  open,
  locale,
  hotspot,
  onClose,
  onOpenImage
}: {
  readonly open: boolean;
  readonly locale: Locale;
  readonly hotspot?: InfoHotspot;
  readonly onClose: () => void;
  readonly onOpenImage: (images: readonly InfoImage[], index: number) => void;
}) {
  const alternativeLocale = locale === 'th' ? 'en' : 'th';
  return (
    <ModalDialog open={open} titleId="info-dialog-title" wide closeLabel={message(locale, 'close')} onClose={onClose}>
      {hotspot ? <>
        <p className="eyebrow">{message(locale, 'infoPoint')}</p>
        <h2 id="info-dialog-title">{localize(hotspot.title, locale)}</h2>
        <p className="scene-alt-title">{localize(hotspot.title, alternativeLocale)}</p>
        <p className="dialog-description">{localize(hotspot.description, locale)}</p>
        <ReferenceLine hotspot={hotspot} locale={locale} />
        {hotspot.images?.length ? (
          <div className="info-gallery">
            {hotspot.images.map((image, index) => (
              <figure key={`${image.src}-${index}`}>
                <button className="info-gallery__button" type="button" aria-haspopup="dialog" aria-label={`${message(locale, 'openImage')}: ${localize(image.alt, locale)}`} onClick={() => onOpenImage(hotspot.images ?? [], index)}>
                  <img src={image.src} alt={localize(image.alt, locale)} loading="lazy" />
                  <span className="info-gallery__zoom" aria-hidden="true">
                    <TourIcon><path d="m15 15 5 5M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13ZM8 10.5h5M10.5 8v5" /></TourIcon>
                  </span>
                </button>
                {image.caption ? <figcaption>{localize(image.caption, locale)}</figcaption> : null}
              </figure>
            ))}
          </div>
        ) : null}
      </> : null}
    </ModalDialog>
  );
}

export function TourImageDialog({
  locale,
  images,
  index,
  onClose,
  onMove
}: {
  readonly locale: Locale;
  readonly images?: readonly InfoImage[];
  readonly index: number;
  readonly onClose: () => void;
  readonly onMove: (direction: -1 | 1) => void;
}) {
  const activeImage = images?.[index];
  return (
    <ModalDialog open={Boolean(images && activeImage)} titleId="info-lightbox-title" media closeLabel={message(locale, 'close')} onClose={onClose}>
      {images && activeImage ? (
        <div className="info-lightbox">
          <h2 className="sr-only" id="info-lightbox-title">{message(locale, 'imageViewerTitle')}</h2>
          <div className="info-lightbox__stage">
            {images.length > 1 ? (
              <button className="info-lightbox__nav info-lightbox__nav--previous" type="button" aria-label={message(locale, 'previousImage')} onClick={() => onMove(-1)}>
                <TourIcon><path d="m15 18-6-6 6-6" /></TourIcon>
              </button>
            ) : null}
            <img src={activeImage.src} alt={localize(activeImage.alt, locale)} />
            {images.length > 1 ? (
              <button className="info-lightbox__nav info-lightbox__nav--next" type="button" aria-label={message(locale, 'nextImage')} onClick={() => onMove(1)}>
                <TourIcon><path d="m9 18 6-6-6-6" /></TourIcon>
              </button>
            ) : null}
          </div>
          <div className="info-lightbox__meta" aria-live="polite">
            <span>{imageCounter(locale, index + 1, images.length)}</span>
            {activeImage.caption ? <strong>{localize(activeImage.caption, locale)}</strong> : null}
          </div>
        </div>
      ) : null}
    </ModalDialog>
  );
}

export function TourAboutDialog({ open, locale, onClose }: { readonly open: boolean; readonly locale: Locale; readonly onClose: () => void }) {
  return (
    <ModalDialog open={open} titleId="about-dialog-title" closeLabel={message(locale, 'close')} onClose={onClose}>
      <p className="eyebrow">{message(locale, 'aboutEyebrow')}</p>
      <h2 id="about-dialog-title">{message(locale, 'aboutTitle')}</h2>
      <p className="dialog-description">{message(locale, 'aboutDescription')}</p>
      <dl className="project-facts">
        <dt>{message(locale, 'faculty')}</dt><dd>{message(locale, 'facultyValue')}</dd>
        <dt>{message(locale, 'campus')}</dt><dd>{message(locale, 'campusValue')}</dd>
        <dt>{message(locale, 'creator')}</dt><dd>{message(locale, 'creatorValue')}</dd>
        <dt>{message(locale, 'advisor')}</dt><dd>{message(locale, 'advisorValue')}</dd>
      </dl>
      <h3>{message(locale, 'objectivesTitle')}</h3>
      <ul className="objective-list">
        {(['objective1', 'objective2', 'objective3', 'objective4'] as const).map((key) => <li key={key}>{message(locale, key)}</li>)}
      </ul>
      <p className="privacy-note">{message(locale, 'privacyNote')}</p>
    </ModalDialog>
  );
}

export function TourTextDialog({
  open,
  locale,
  content,
  onClose,
  onNavigate
}: {
  readonly open: boolean;
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly onClose: () => void;
  readonly onNavigate: (sceneId: SceneId) => void;
}) {
  const alternativeLocale = locale === 'th' ? 'en' : 'th';
  return (
    <ModalDialog open={open} titleId="text-tour-title" wide closeLabel={message(locale, 'close')} onClose={onClose}>
      <p className="eyebrow">{message(locale, 'textTourEyebrow')}</p>
      <h2 id="text-tour-title">{message(locale, 'textTourTitle')}</h2>
      <p className="dialog-description">{message(locale, 'textTourDescription')}</p>
      <div className="text-tour-content">
        {tourScenes.map((baseItem, index) => {
          const item = resolveTourScene(baseItem, content);
          return (
            <article className="text-scene" key={item.id}>
              <h3>{index + 1}. {localize(item.title, locale)}</h3>
              <p className="scene-alt-title">{localize(item.title, alternativeLocale)}</p>
              <p>{localize(item.description, locale)}</p>
              <button className="compact-action" type="button" onClick={() => { onClose(); onNavigate(item.id); }}>{goToScene(locale, localize(item.title, locale))}</button>
              {getInfoHotspots(baseItem).map((hotspot) => resolveInfoHotspot(hotspot, content)).map((hotspot) => (
                <details key={hotspot.id}>
                  <summary>{localize(hotspot.title, locale)}</summary>
                  <p>{localize(hotspot.description, locale)}</p>
                  <ReferenceLine hotspot={hotspot} locale={locale} />
                </details>
              ))}
            </article>
          );
        })}
      </div>
    </ModalDialog>
  );
}
