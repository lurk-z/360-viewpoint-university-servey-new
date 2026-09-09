import { resolveInfoHotspot, type PublicContentSnapshot } from '../../src/content';
import type {
  InfoHotspot,
  InfoHotspotDefinition,
  SceneId
} from '../../src/tour-data';

export interface TourInfoSelection {
  readonly sceneId: SceneId;
  readonly hotspotId: string;
  /** Resolved content captured at activation time for lazy-loading and live-update safety. */
  readonly snapshot: InfoHotspot;
}

export function createTourInfoSelection(sceneId: SceneId, hotspot: InfoHotspot): TourInfoSelection {
  return { sceneId, hotspotId: hotspot.id, snapshot: hotspot };
}

export function resolveTourInfoSelection(
  selection: TourInfoSelection | null,
  currentDefinition: InfoHotspotDefinition | undefined,
  content: PublicContentSnapshot
): InfoHotspot | undefined {
  if (!selection) return undefined;
  return currentDefinition
    ? resolveInfoHotspot(currentDefinition, content)
    : selection.snapshot;
}
