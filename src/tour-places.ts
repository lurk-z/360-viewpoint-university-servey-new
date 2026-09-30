import { createFallbackHotspotContent, type HotspotData } from './content.ts';
import {
  tourScenes,
  type InfoHotspotDefinition,
  type SceneId,
  type TourScene
} from './tour-data.ts';

export interface TourPlaceScene extends TourScene {
  readonly archived?: boolean;
}

export interface TourPlaceDefinition {
  readonly id: string;
  readonly sceneId: SceneId;
}

export interface StoredTourPlaceLink {
  readonly id: string;
  readonly sceneId?: string;
}

export interface TourPlaceSyncStatus {
  readonly total: number;
  readonly synced: number;
  readonly missing: readonly TourPlaceDefinition[];
  readonly moved: readonly TourPlaceDefinition[];
  readonly orphaned: readonly StoredTourPlaceLink[];
  readonly duplicates: readonly DuplicateTourPlaceDefinition[];
}

export interface DuplicateTourPlaceDefinition {
  readonly id: string;
  readonly sceneIds: readonly SceneId[];
}

export function getTourPlaceDefinitions(
  scenes: readonly TourPlaceScene[] = tourScenes
): readonly TourPlaceDefinition[] {
  return scenes.filter((scene) => !scene.archived).flatMap((scene) => (
    scene.hotspots
      .filter((hotspot) => hotspot.type === 'info')
      .map((hotspot) => ({ id: hotspot.id, sceneId: scene.id }))
  ));
}

/** @deprecated Use getTourPlaceDefinitions() when runtime tour data may change. */
export const tourPlaceDefinitions: readonly TourPlaceDefinition[] = getTourPlaceDefinitions();

export function getDuplicateTourPlaceDefinitions(
  definitions: readonly TourPlaceDefinition[] = getTourPlaceDefinitions()
): readonly DuplicateTourPlaceDefinition[] {
  const scenesById = new Map<string, SceneId[]>();
  for (const definition of definitions) {
    const sceneIds = scenesById.get(definition.id) ?? [];
    sceneIds.push(definition.sceneId);
    scenesById.set(definition.id, sceneIds);
  }
  return [...scenesById.entries()]
    .filter(([, sceneIds]) => sceneIds.length > 1)
    .map(([id, sceneIds]) => ({ id, sceneIds }));
}

export function isTourPlaceLink(
  id: string,
  sceneId: string,
  scenes: readonly TourPlaceScene[] = tourScenes
): boolean {
  return getTourPlaceDefinitions(scenes).find((definition) => definition.id === id)?.sceneId === sceneId;
}

export function getTourPlaceDraft(
  definition: TourPlaceDefinition,
  scenes: readonly TourPlaceScene[] = tourScenes
): HotspotData {
  const scene = scenes.find((item) => item.id === definition.sceneId);
  const hotspot = scene?.hotspots.find((item): item is InfoHotspotDefinition => (
    item.type === 'info' && item.id === definition.id
  ));
  if (!scene || !hotspot) throw new Error(`Unknown tour place definition: ${definition.id}`);
  const fallback = createFallbackHotspotContent(scene, hotspot);
  return {
    title: fallback.title,
    description: fallback.description,
    sceneTitle: fallback.sceneTitle,
    sceneDescription: fallback.sceneDescription,
    reference: { label: { th: '', en: '' }, url: undefined },
    // A synced place must be reviewed in Admin and receive at least one explicit image before publishing.
    images: []
  };
}

export function getTourPlaceSyncStatus(
  rows: readonly StoredTourPlaceLink[],
  scenes: readonly TourPlaceScene[] = tourScenes
): TourPlaceSyncStatus {
  const definitions = getTourPlaceDefinitions(scenes);
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const duplicates = getDuplicateTourPlaceDefinitions(definitions);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const missing = definitions.filter((definition) => !rowById.has(definition.id));
  const moved = definitions.filter((definition) => {
    const row = rowById.get(definition.id);
    return Boolean(row && row.sceneId !== definition.sceneId);
  });
  const orphaned = rows.filter((row) => !definitionById.has(row.id));
  return {
    total: definitions.length,
    synced: definitions.length - missing.length - moved.length,
    missing,
    moved,
    orphaned,
    duplicates
  };
}
