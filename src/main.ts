import { Viewer, events as viewerEvents } from '@photo-sphere-viewer/core';
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
  type VirtualTourLink,
  type VirtualTourNode
} from '@photo-sphere-viewer/virtual-tour-plugin';
import { registerSW } from 'virtual:pwa-register';
import {
  currentScene,
  goToScene,
  loadingProgress,
  message,
  sceneChanged,
  sceneCounter,
  type MessageKey
} from './i18n';
import {
  getInfoHotspots,
  getNavigationHotspots,
  getScene,
  getSceneEdges,
  localize,
  tourScenes,
  validateTour,
  type InfoHotspot,
  type Locale,
  type SceneId,
  type TourScene
} from './tour-data';
import './styles.css';

const validationErrors = validateTour();
if (validationErrors.length > 0) {
  throw new Error(`Invalid tour configuration:\n${validationErrors.join('\n')}`);
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element #${id}`);
  return element as T;
}

function escapeHtml(value: string): string {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

const app = byId<HTMLDivElement>('app');
const viewerElement = byId<HTMLDivElement>('tour-viewer');
const scenePanel = byId<HTMLElement>('scene-panel');
const sceneCounterElement = byId<HTMLParagraphElement>('scene-counter');
const sceneTitle = byId<HTMLHeadingElement>('scene-title');
const sceneAltTitle = byId<HTMLParagraphElement>('scene-alt-title');
const sceneDescription = byId<HTMLParagraphElement>('scene-description');
const sceneTags = byId<HTMLDivElement>('scene-tags');
const sceneLinks = byId<HTMLDivElement>('scene-links');
const infoLinks = byId<HTMLDivElement>('info-links');
const infoActionsGroup = byId<HTMLDivElement>('info-actions-group');
const destinationsHeading = byId<HTMLHeadingElement>('destinations-heading');
const informationHeading = byId<HTMLHeadingElement>('information-heading');
const viewerHelp = byId<HTMLParagraphElement>('viewer-help');
const sceneList = byId<HTMLDivElement>('scene-list');
const sceneSelector = byId<HTMLElement>('scene-selector');
const sceneLoader = byId<HTMLDivElement>('scene-loader');
const sceneLoaderText = byId<HTMLSpanElement>('scene-loader-text');
const intro = byId<HTMLElement>('intro');
const introEyebrow = byId<HTMLParagraphElement>('intro-eyebrow');
const introTitle = byId<HTMLHeadingElement>('intro-title');
const introDescription = byId<HTMLParagraphElement>('intro-description');
const initialLoading = byId<HTMLDivElement>('initial-loading');
const loadProgressElement = byId<HTMLProgressElement>('load-progress');
const loadStatus = byId<HTMLSpanElement>('load-status');
const loadError = byId<HTMLDivElement>('load-error');
const loadErrorTitle = byId<HTMLElement>('load-error-title');
const loadErrorDescription = byId<HTMLSpanElement>('load-error-description');
const startButton = byId<HTMLButtonElement>('start-button');
const retryButton = byId<HTMLButtonElement>('retry-button');
const textTourButton = byId<HTMLButtonElement>('text-tour-button');
const textTourSecondaryButton = byId<HTMLButtonElement>('text-tour-secondary-button');
const liveStatus = byId<HTMLDivElement>('live-status');
const brandSubtitle = byId<HTMLSpanElement>('brand-subtitle');

const aboutButton = byId<HTMLButtonElement>('about-button');
const langThButton = byId<HTMLButtonElement>('lang-th');
const langEnButton = byId<HTMLButtonElement>('lang-en');
const rotateButton = byId<HTMLButtonElement>('rotate-button');
const zoomInButton = byId<HTMLButtonElement>('zoom-in-button');
const zoomOutButton = byId<HTMLButtonElement>('zoom-out-button');
const resetButton = byId<HTMLButtonElement>('reset-button');
const fullscreenButton = byId<HTMLButtonElement>('fullscreen-button');
const mapButton = byId<HTMLButtonElement>('map-button');
const showInfoButton = byId<HTMLButtonElement>('show-info-button');
const hideInfoButton = byId<HTMLButtonElement>('hide-info-button');

const infoDialog = byId<HTMLDialogElement>('info-dialog');
const infoDialogKicker = byId<HTMLParagraphElement>('info-dialog-kicker');
const infoDialogTitle = byId<HTMLHeadingElement>('info-dialog-title');
const infoDialogAltTitle = byId<HTMLParagraphElement>('info-dialog-alt-title');
const infoDialogDescription = byId<HTMLParagraphElement>('info-dialog-description');
const mapDialog = byId<HTMLDialogElement>('map-dialog');
const mapDialogTitle = byId<HTMLHeadingElement>('map-dialog-title');
const mapDescription = byId<HTMLParagraphElement>('map-description');
const routeMap = byId<HTMLDivElement>('route-map');
const aboutDialog = byId<HTMLDialogElement>('about-dialog');
const aboutDialogTitle = byId<HTMLHeadingElement>('about-dialog-title');
const aboutDescription = byId<HTMLParagraphElement>('about-description');
const projectFacts = byId<HTMLDListElement>('project-facts');
const objectivesTitle = byId<HTMLHeadingElement>('objectives-title');
const objectivesList = byId<HTMLUListElement>('objectives-list');
const privacyNote = byId<HTMLParagraphElement>('privacy-note');
const textTourDialog = byId<HTMLDialogElement>('text-tour-dialog');
const textTourTitle = byId<HTMLHeadingElement>('text-tour-title');
const textTourDescription = byId<HTMLParagraphElement>('text-tour-description');
const textTourContent = byId<HTMLDivElement>('text-tour-content');

const dialogOpeners = new WeakMap<HTMLDialogElement, HTMLElement>();
const allDialogs = [infoDialog, mapDialog, aboutDialog, textTourDialog];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let locale: Locale = 'th';
let currentSceneId: SceneId = 'entrance';
let initialReady = false;
let lastProgress = 0;
let sceneInfoVisible = true;

function announce(text: string): void {
  liveStatus.textContent = '';
  window.setTimeout(() => {
    liveStatus.textContent = text;
  }, 30);
}

function openDialog(dialog: HTMLDialogElement, opener?: HTMLElement): void {
  if (dialog.open) return;
  const activeElement = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
  if (activeElement) dialogOpeners.set(dialog, activeElement);
  dialog.showModal();
  dialog.querySelector<HTMLElement>('.dialog-close')?.focus();
}

for (const dialog of allDialogs) {
  dialog.querySelector<HTMLButtonElement>('.dialog-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const opener = dialogOpeners.get(dialog);
    if (opener?.isConnected) opener.focus();
  });
}

function createArrowElement(link: VirtualTourLink): HTMLElement {
  const target = getScene(link.nodeId as SceneId);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tour-arrow';
  button.dataset.target = target.id;
  button.setAttribute('aria-label', goToScene(locale, localize(target.title, locale)));

  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '➜';
  button.append(icon);
  return button;
}

function buildTourNodes(): VirtualTourNode[] {
  return tourScenes.map((scene) => ({
    id: scene.id,
    panorama: scene.panorama,
    thumbnail: scene.thumbnail,
    name: `${scene.title.th} · ${scene.title.en}`,
    data: { sceneId: scene.id },
    links: getNavigationHotspots(scene).map((hotspot) => ({
      nodeId: hotspot.target,
      position: { yaw: `${hotspot.yaw}deg`, pitch: `${hotspot.pitch}deg` },
      data: { hotspotId: hotspot.id }
    }))
  }));
}

const viewer = new Viewer({
  container: viewerElement,
  navbar: false,
  defaultZoomLvl: 22,
  minFov: 35,
  maxFov: 100,
  canvasBackground: '#431407',
  defaultTransition: {
    effect: 'fade',
    speed: reducedMotion.matches ? 0 : 650,
    rotation: false
  },
  plugins: [
    MarkersPlugin.withConfig({
      defaultHoverScale: reducedMotion.matches ? false : { amount: 1.12, duration: 130 },
      gotoMarkerSpeed: reducedMotion.matches ? 0 : '6rpm'
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
      preload: true,
      transitionOptions: () => ({
        showLoader: false,
        effect: reducedMotion.matches ? 'none' : 'fade',
        speed: reducedMotion.matches ? 0 : 650,
        rotation: false
      }),
      arrowStyle: {
        element: createArrowElement,
        className: 'tour-arrow-marker',
        size: { width: 54, height: 54 }
      },
      getLinkTooltip: (_content, link) => {
        const target = getScene(link.nodeId as SceneId);
        return escapeHtml(goToScene(locale, localize(target.title, locale)));
      }
    })
  ]
});

const markersPlugin = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
const autorotatePlugin = viewer.getPlugin<AutorotatePlugin>(AutorotatePlugin);
const virtualTourPlugin = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);

function buildInfoMarkers(scene: TourScene): MarkerConfig[] {
  return getInfoHotspots(scene).map((hotspot) => {
    const button = document.createElement('button') as HTMLButtonElement & MarkerElement;
    const title = localize(hotspot.title, locale);
    button.type = 'button';
    button.className = 'info-hotspot';
    button.setAttribute('aria-label', `${message(locale, 'infoPoint')}: ${title}`);
    button.textContent = 'i';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openInfoHotspot(hotspot, button);
    });

    return {
      id: hotspot.id,
      element: button,
      position: { yaw: `${hotspot.yaw}deg`, pitch: `${hotspot.pitch}deg` },
      size: { width: 48, height: 48 },
      anchor: 'center center',
      tooltip: escapeHtml(title),
      hideList: true,
      data: { type: 'info', hotspotId: hotspot.id }
    };
  });
}

function openInfoHotspot(hotspot: InfoHotspot, opener?: HTMLElement): void {
  const alternativeLocale: Locale = locale === 'th' ? 'en' : 'th';
  infoDialogKicker.textContent = message(locale, 'infoPoint');
  infoDialogTitle.textContent = localize(hotspot.title, locale);
  infoDialogAltTitle.textContent = localize(hotspot.title, alternativeLocale);
  infoDialogDescription.textContent = localize(hotspot.description, locale);
  openDialog(infoDialog, opener);
}

function setInitialView(scene: TourScene, animate = false): void {
  if (animate && !reducedMotion.matches) {
    void viewer.animate({
      yaw: `${scene.initialView.yaw}deg`,
      pitch: `${scene.initialView.pitch}deg`,
      zoom: scene.initialView.zoom,
      speed: 550
    });
  } else {
    viewer.rotate({ yaw: `${scene.initialView.yaw}deg`, pitch: `${scene.initialView.pitch}deg` });
    viewer.zoom(scene.initialView.zoom);
  }
}

function setSceneInfoVisible(visible: boolean): void {
  sceneInfoVisible = visible;
  scenePanel.classList.toggle('is-hidden', !visible);
  scenePanel.toggleAttribute('inert', !visible);
  scenePanel.setAttribute('aria-hidden', String(!visible));
  showInfoButton.setAttribute('aria-pressed', String(visible));
  showInfoButton.setAttribute('aria-label', message(locale, visible ? 'hideInfo' : 'showInfo'));
  showInfoButton.dataset.tooltip = message(locale, visible ? 'hideInfo' : 'showInfo');
}

function renderTags(scene: TourScene): void {
  sceneTags.replaceChildren(
    ...scene.tags[locale].map((value) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = value;
      return tag;
    })
  );
}

function createCompactButton(label: string, onClick: (button: HTMLButtonElement) => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'compact-action';
  button.textContent = label;
  button.addEventListener('click', () => onClick(button));
  return button;
}

function renderSceneActions(scene: TourScene): void {
  sceneLinks.replaceChildren(
    ...getNavigationHotspots(scene).map((hotspot) => {
      const target = getScene(hotspot.target);
      return createCompactButton(localize(target.title, locale), () => {
        void navigateToScene(target.id);
      });
    })
  );

  const infoHotspots = getInfoHotspots(scene);
  infoActionsGroup.hidden = infoHotspots.length === 0;
  infoLinks.replaceChildren(
    ...infoHotspots.map((hotspot) =>
      createCompactButton(localize(hotspot.title, locale), (button) => openInfoHotspot(hotspot, button))
    )
  );
}

function renderCurrentScene(shouldAnnounce = false): void {
  const scene = getScene(currentSceneId);
  const sceneIndex = tourScenes.findIndex((item) => item.id === scene.id);
  const alternativeLocale: Locale = locale === 'th' ? 'en' : 'th';

  sceneCounterElement.textContent = sceneCounter(locale, sceneIndex + 1, tourScenes.length);
  sceneTitle.textContent = localize(scene.title, locale);
  sceneAltTitle.textContent = localize(scene.title, alternativeLocale);
  sceneDescription.textContent = localize(scene.description, locale);
  renderTags(scene);
  renderSceneActions(scene);
  markersPlugin.setMarkers(buildInfoMarkers(scene));

  document.querySelectorAll<HTMLButtonElement>('.scene-card').forEach((button) => {
    const active = button.dataset.scene === scene.id;
    button.setAttribute('aria-current', String(active));
    if (active) button.setAttribute('aria-label', currentScene(locale, localize(scene.title, locale)));
  });
  document.querySelectorAll<HTMLButtonElement>('.map-node').forEach((button) => {
    button.setAttribute('aria-current', String(button.dataset.scene === scene.id));
  });

  if (shouldAnnounce) {
    announce(sceneChanged(locale, sceneIndex + 1, tourScenes.length, localize(scene.title, locale)));
  }
}

function renderSceneList(): void {
  sceneList.replaceChildren(
    ...tourScenes.map((scene, index) => {
      const button = document.createElement('button');
      const active = scene.id === currentSceneId;
      button.type = 'button';
      button.className = 'scene-card';
      button.dataset.scene = scene.id;
      button.setAttribute('aria-current', String(active));
      button.setAttribute(
        'aria-label',
        active
          ? currentScene(locale, localize(scene.title, locale))
          : goToScene(locale, localize(scene.title, locale))
      );

      const image = document.createElement('img');
      image.src = scene.thumbnail;
      image.alt = '';
      image.loading = 'lazy';

      const number = document.createElement('span');
      number.className = 'scene-card__number';
      number.textContent = String(index + 1);

      const title = document.createElement('strong');
      title.textContent = localize(scene.title, locale);

      const alternativeTitle = document.createElement('small');
      alternativeTitle.textContent = localize(scene.title, locale === 'th' ? 'en' : 'th');

      button.append(image, number, title, alternativeTitle);
      button.addEventListener('click', () => void navigateToScene(scene.id));
      return button;
    })
  );
}

function renderRouteMap(): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  for (const edge of getSceneEdges()) {
    const from = getScene(edge.from).mapPosition;
    const to = getScene(edge.to).mapPosition;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(from.x));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x));
    line.setAttribute('y2', String(to.y));
    svg.append(line);
  }

  const nodes = tourScenes.map((scene) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-node';
    button.dataset.scene = scene.id;
    button.style.setProperty('--map-x', `${scene.mapPosition.x}%`);
    button.style.setProperty('--map-y', `${scene.mapPosition.y}%`);
    button.textContent = localize(scene.title, locale);
    button.setAttribute('aria-current', String(scene.id === currentSceneId));
    button.setAttribute('aria-label', goToScene(locale, localize(scene.title, locale)));
    button.addEventListener('click', () => {
      mapDialog.close();
      void navigateToScene(scene.id);
    });
    return button;
  });

  routeMap.replaceChildren(svg, ...nodes);
}

function renderAbout(): void {
  aboutDialogTitle.textContent = message(locale, 'aboutTitle');
  aboutDescription.textContent = message(locale, 'aboutDescription');
  objectivesTitle.textContent = message(locale, 'objectivesTitle');
  privacyNote.textContent = message(locale, 'privacyNote');

  const facts: Array<[MessageKey, MessageKey]> = [
    ['faculty', 'facultyValue'],
    ['campus', 'campusValue'],
    ['creator', 'creatorValue'],
    ['advisor', 'advisorValue']
  ];
  projectFacts.replaceChildren(
    ...facts.flatMap(([labelKey, valueKey]) => {
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = message(locale, labelKey);
      description.textContent = message(locale, valueKey);
      return [term, description];
    })
  );

  objectivesList.replaceChildren(
    ...(['objective1', 'objective2', 'objective3', 'objective4'] as const).map((key) => {
      const item = document.createElement('li');
      item.textContent = message(locale, key);
      return item;
    })
  );
}

function renderTextTour(): void {
  textTourContent.replaceChildren(
    ...tourScenes.map((scene, index) => {
      const article = document.createElement('article');
      article.className = 'text-scene';

      const heading = document.createElement('h3');
      heading.textContent = `${index + 1}. ${localize(scene.title, locale)}`;
      const alternative = document.createElement('p');
      alternative.className = 'scene-alt-title';
      alternative.textContent = localize(scene.title, locale === 'th' ? 'en' : 'th');
      const description = document.createElement('p');
      description.textContent = localize(scene.description, locale);
      const visit = createCompactButton(goToScene(locale, localize(scene.title, locale)), () => {
        textTourDialog.close();
        void navigateToScene(scene.id);
      });
      article.append(heading, alternative, description, visit);

      for (const hotspot of getInfoHotspots(scene)) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        const infoDescription = document.createElement('p');
        summary.textContent = localize(hotspot.title, locale);
        infoDescription.textContent = localize(hotspot.description, locale);
        details.append(summary, infoDescription);
        article.append(details);
      }
      return article;
    })
  );
}

function updateControlLabels(): void {
  const controls: Array<[HTMLButtonElement, MessageKey]> = [
    [rotateButton, 'rotate'],
    [zoomInButton, 'zoomIn'],
    [zoomOutButton, 'zoomOut'],
    [resetButton, 'reset'],
    [mapButton, 'mapButton']
  ];
  for (const [button, key] of controls) {
    const label = message(locale, key);
    button.setAttribute('aria-label', label);
    button.dataset.tooltip = label;
  }

  const fullscreenKey = viewer.isFullscreenEnabled() ? 'exitFullscreen' : 'enterFullscreen';
  fullscreenButton.setAttribute('aria-label', message(locale, fullscreenKey));
  fullscreenButton.dataset.tooltip = message(locale, fullscreenKey);
  hideInfoButton.setAttribute('aria-label', message(locale, 'hideInfo'));
  setSceneInfoVisible(sceneInfoVisible);
}

function renderStaticCopy(): void {
  document.documentElement.lang = locale;
  document.title = locale === 'th'
    ? 'Virtual Open House KMUTNB · วิทยาเขตปราจีนบุรี'
    : 'Virtual Open House KMUTNB · Prachinburi Campus';
  brandSubtitle.textContent = message(locale, 'brandSubtitle');
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n as MessageKey | undefined;
    if (key) element.textContent = message(locale, key);
  });

  document.querySelector<HTMLElement>('.language-switch')?.setAttribute('aria-label', message(locale, 'languageLabel'));
  viewerElement.setAttribute('aria-label', message(locale, 'viewerLabel'));
  document.querySelector<HTMLElement>('.control-rail')?.setAttribute('aria-label', message(locale, 'controlsLabel'));
  sceneSelector.setAttribute('aria-label', message(locale, 'selectScenes'));
  sceneTags.setAttribute('aria-label', message(locale, 'tagListLabel'));
  viewerHelp.querySelector('span')!.textContent = message(locale, 'viewerHelp');
  destinationsHeading.textContent = message(locale, 'destinations');
  informationHeading.textContent = message(locale, 'information');
  sceneLoaderText.textContent = message(locale, 'loadingScene');
  introEyebrow.textContent = message(locale, 'introEyebrow');
  introTitle.textContent = message(locale, 'introTitle');
  introDescription.textContent = message(locale, 'introDescription');
  if (!initialReady) loadStatus.textContent = lastProgress > 0
    ? loadingProgress(locale, lastProgress)
    : message(locale, 'initialLoading');
  loadErrorTitle.textContent = message(locale, 'loadErrorTitle');
  loadErrorDescription.textContent = message(locale, 'loadErrorDescription');
  retryButton.textContent = message(locale, 'retry');
  startButton.querySelector('span')!.textContent = message(locale, 'start');
  textTourButton.textContent = message(locale, 'textTour');
  textTourSecondaryButton.textContent = message(locale, 'viewAll');
  infoDialogKicker.textContent = message(locale, 'infoPoint');
  mapDialogTitle.textContent = message(locale, 'mapTitle');
  mapDescription.textContent = message(locale, 'mapDescription');
  textTourTitle.textContent = message(locale, 'textTourTitle');
  textTourDescription.textContent = message(locale, 'textTourDescription');
  document.querySelectorAll<HTMLButtonElement>('.dialog-close').forEach((button) => {
    button.setAttribute('aria-label', message(locale, 'close'));
  });
  updateControlLabels();
  document.querySelectorAll<HTMLButtonElement>('.tour-arrow').forEach((button) => {
    const targetId = button.dataset.target as SceneId | undefined;
    if (targetId) button.setAttribute('aria-label', goToScene(locale, localize(getScene(targetId).title, locale)));
  });
}

function setLocale(nextLocale: Locale): void {
  locale = nextLocale;
  langThButton.setAttribute('aria-pressed', String(locale === 'th'));
  langEnButton.setAttribute('aria-pressed', String(locale === 'en'));
  renderStaticCopy();
  renderSceneList();
  renderCurrentScene();
  renderRouteMap();
  renderAbout();
  renderTextTour();
}

async function navigateToScene(sceneId: SceneId): Promise<void> {
  if (sceneId === currentSceneId) {
    setInitialView(getScene(sceneId), true);
    return;
  }
  sceneLoader.hidden = false;
  try {
    await virtualTourPlugin.setCurrentNode(sceneId, {
      effect: reducedMotion.matches ? 'none' : 'fade',
      speed: reducedMotion.matches ? 0 : 650,
      rotation: false,
      showLoader: false
    });
  } catch {
    sceneLoader.hidden = true;
    viewer.showError(message(locale, 'loadErrorDescription'));
    announce(message(locale, 'loadErrorDescription'));
  }
}

viewer.addEventListener(viewerEvents.LoadProgressEvent.type, ({ progress }) => {
  lastProgress = Math.max(0, Math.min(100, Math.round(progress)));
  if (!initialReady) {
    loadProgressElement.value = lastProgress;
    loadStatus.textContent = loadingProgress(locale, lastProgress);
  }
});

viewer.addEventListener(viewerEvents.PanoramaLoadEvent.type, () => {
  if (initialReady) sceneLoader.hidden = false;
});

viewer.addEventListener(viewerEvents.PanoramaLoadedEvent.type, () => {
  sceneLoader.hidden = true;
  viewer.hideError();
});

viewer.addEventListener(viewerEvents.PanoramaErrorEvent.type, () => {
  sceneLoader.hidden = true;
  if (!initialReady) {
    initialLoading.hidden = true;
    loadError.hidden = false;
    app.dataset.status = 'error';
  } else {
    viewer.showError(message(locale, 'loadErrorDescription'));
    announce(message(locale, 'loadErrorDescription'));
  }
});

viewer.addEventListener(viewerEvents.FullscreenEvent.type, ({ fullscreenEnabled }) => {
  fullscreenButton.setAttribute('aria-pressed', String(fullscreenEnabled));
  updateControlLabels();
});

viewer.addEventListener(viewerEvents.ReadyEvent.type, () => {
  initialReady = true;
  app.dataset.status = 'ready';
  loadProgressElement.value = 100;
  loadStatus.textContent = message(locale, 'initialReady');
  startButton.disabled = false;
  const node = virtualTourPlugin.getCurrentNode();
  if (node?.id) currentSceneId = node.id as SceneId;
  renderCurrentScene();
  setInitialView(getScene(currentSceneId));
}, { once: true });

virtualTourPlugin.addEventListener(virtualTourEvents.NodeChangedEvent.type, ({ node }) => {
  currentSceneId = node.id as SceneId;
  renderCurrentScene(true);
  renderRouteMap();
  window.requestAnimationFrame(() => setInitialView(getScene(currentSceneId)));
  document.querySelector<HTMLButtonElement>(`.scene-card[data-scene="${currentSceneId}"]`)
    ?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
});

autorotatePlugin.addEventListener(autorotateEvents.AutorotateEvent.type, ({ autorotateEnabled }) => {
  rotateButton.setAttribute('aria-pressed', String(autorotateEnabled));
});

viewerElement.addEventListener('focus', () => viewer.startKeyboardControl());
viewerElement.addEventListener('blur', () => viewer.stopKeyboardControl());

startButton.addEventListener('click', () => {
  intro.classList.add('is-closing');
  window.setTimeout(() => {
    intro.hidden = true;
    viewerElement.focus();
  }, reducedMotion.matches ? 0 : 300);
});

retryButton.addEventListener('click', () => window.location.reload());
textTourButton.addEventListener('click', () => openDialog(textTourDialog, textTourButton));
textTourSecondaryButton.addEventListener('click', () => openDialog(textTourDialog, textTourSecondaryButton));
aboutButton.addEventListener('click', () => openDialog(aboutDialog, aboutButton));
mapButton.addEventListener('click', () => openDialog(mapDialog, mapButton));
langThButton.addEventListener('click', () => setLocale('th'));
langEnButton.addEventListener('click', () => setLocale('en'));
hideInfoButton.addEventListener('click', () => setSceneInfoVisible(false));
showInfoButton.addEventListener('click', () => setSceneInfoVisible(!sceneInfoVisible));
rotateButton.addEventListener('click', () => autorotatePlugin.toggle());
zoomInButton.addEventListener('click', () => viewer.zoomIn(8));
zoomOutButton.addEventListener('click', () => viewer.zoomOut(8));
resetButton.addEventListener('click', () => setInitialView(getScene(currentSceneId), true));
fullscreenButton.addEventListener('click', () => viewer.toggleFullscreen());

registerSW({
  immediate: true,
  onOfflineReady() {
    announce(message(locale, 'offlineReady'));
  },
  onRegisterError() {
    // The tour still works online / over localhost when service workers are unavailable.
  }
});

renderStaticCopy();
renderSceneList();
renderCurrentScene();
renderRouteMap();
renderAbout();
renderTextTour();
