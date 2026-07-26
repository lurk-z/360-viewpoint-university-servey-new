import type { VirtualTourTransitionOptions } from '@photo-sphere-viewer/virtual-tour-plugin';

export const ARROW_TRANSITION_ZOOM = 70;
export const SCENE_TRANSITION_DURATION = 650;
export const ARROW_SETTLE_DURATION = 450;

/** Builds a motion-safe transition for arrow and non-arrow scene navigation. */
export function getSceneTransitionOptions(
  fromArrow: boolean,
  reducedMotion: boolean
): VirtualTourTransitionOptions {
  if (reducedMotion) {
    return {
      showLoader: false,
      effect: 'none',
      speed: 0,
      rotation: false
    };
  }

  return {
    showLoader: false,
    effect: 'fade',
    speed: SCENE_TRANSITION_DURATION,
    rotation: fromArrow,
    ...(fromArrow ? { zoomTo: ARROW_TRANSITION_ZOOM } : {})
  };
}
