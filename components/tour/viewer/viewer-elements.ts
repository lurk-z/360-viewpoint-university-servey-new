import type { MarkerConfig, MarkerElement } from '@photo-sphere-viewer/markers-plugin';
import type { VirtualTourLink } from '@photo-sphere-viewer/virtual-tour-plugin';
import { resolveInfoHotspot, resolveTourScene } from '../../../src/content';
import { goDownToScene, goToScene, message } from '../../../src/i18n';
import { getInfoHotspots, getScene, localize, toDegrees, type SceneId } from '../../../src/tour-data';
import type { ViewerCallbacks } from './types';

export function createNavigationArrowElement(link: VirtualTourLink, callbacks: ViewerCallbacks): HTMLElement {
  const target = resolveTourScene(getScene(link.nodeId as SceneId), callbacks.content);
  const targetTitle = localize(target.title, callbacks.locale);
  const direction = link.data?.direction === 'down' ? 'down' : 'standard';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tour-arrow${direction === 'down' ? ' is-stairs-down' : ''}`;
  button.dataset.target = target.id;
  if (typeof link.data?.hotspotId === 'string') {
    button.dataset.hotspotId = link.data.hotspotId;
    button.classList.toggle('is-dev-selected', callbacks.navigationPlacementHotspotId === link.data.hotspotId);
  }
  button.setAttribute(
    'aria-label',
    direction === 'down'
      ? goDownToScene(callbacks.locale, targetTitle)
      : goToScene(callbacks.locale, targetTitle)
  );

  const icon = document.createElement('span');
  icon.className = 'tour-arrow__icon';
  icon.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 72 42');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'tour-arrow__chevron');
  path.setAttribute(
    'd',
    direction === 'down'
      ? 'M10 11 36 30 62 11 69 20 36 40 3 20Z'
      : 'M6 27 36 7 66 27 58 37 36 22 14 37Z'
  );
  svg.append(path);
  icon.append(svg);
  button.append(icon);
  return button;
}

export function buildInfoMarkers(sceneId: SceneId, callbacks: ViewerCallbacks): MarkerConfig[] {
  return getInfoHotspots(getScene(sceneId)).map((baseHotspot) => {
    const hotspot = resolveInfoHotspot(baseHotspot, callbacks.content);
    const element = document.createElement('button') as HTMLButtonElement & MarkerElement;
    const title = localize(hotspot.title, callbacks.locale);
    const tapMovementThreshold = 10;
    let touchPointer: { pointerId: number; x: number; y: number } | null = null;
    let suppressClickUntil = 0;
    const openHotspot = (): void => callbacks.onInfo(hotspot);
    element.type = 'button';
    element.className = 'info-hotspot';
    element.textContent = 'i';
    element.setAttribute('aria-label', `${message(callbacks.locale, 'infoPoint')}: ${title}`);
    element.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' || !event.isPrimary) return;
      touchPointer = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    });
    element.addEventListener('pointermove', (event) => {
      if (!touchPointer || event.pointerId !== touchPointer.pointerId) return;
      if (Math.hypot(event.clientX - touchPointer.x, event.clientY - touchPointer.y) > tapMovementThreshold) touchPointer = null;
    });
    element.addEventListener('pointercancel', () => { touchPointer = null; });
    element.addEventListener('pointerup', (event) => {
      if (!touchPointer || event.pointerId !== touchPointer.pointerId) return;
      const moved = Math.hypot(event.clientX - touchPointer.x, event.clientY - touchPointer.y);
      touchPointer = null;
      if (moved > tapMovementThreshold) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClickUntil = performance.now() + 750;
      openHotspot();
    });
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      if (performance.now() < suppressClickUntil) return;
      openHotspot();
    });
    return {
      id: hotspot.id,
      element,
      position: { yaw: toDegrees(hotspot.yaw), pitch: toDegrees(hotspot.pitch) },
      size: { width: 48, height: 48 },
      anchor: 'center center',
      tooltip: title,
      hideList: true,
      data: { type: 'info', hotspotId: hotspot.id }
    };
  });
}
