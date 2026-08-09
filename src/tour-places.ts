import { createFallbackHotspotContent, type HotspotData } from './content.ts';
import { getInfoHotspots, tourScenes, type SceneId } from './tour-data.ts';

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

export const tourPlaceDefinitions: readonly TourPlaceDefinition[] = tourScenes.flatMap((scene) => (
  getInfoHotspots(scene).map((hotspot) => ({ id: hotspot.id, sceneId: scene.id }))
));

const definitionById = new Map(tourPlaceDefinitions.map((definition) => [definition.id, definition]));

export function getDuplicateTourPlaceDefinitions(
  definitions: readonly TourPlaceDefinition[] = tourPlaceDefinitions
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

export function isTourPlaceLink(id: string, sceneId: string): boolean {
  return definitionById.get(id)?.sceneId === sceneId;
}

export function getTourPlaceDraft(definition: TourPlaceDefinition): HotspotData {
  const scene = tourScenes.find((item) => item.id === definition.sceneId);
  const hotspot = scene && getInfoHotspots(scene).find((item) => item.id === definition.id);
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

export function getTourPlaceSyncStatus(rows: readonly StoredTourPlaceLink[]): TourPlaceSyncStatus {
  const duplicates = getDuplicateTourPlaceDefinitions();
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const missing = tourPlaceDefinitions.filter((definition) => !rowById.has(definition.id));
  const moved = tourPlaceDefinitions.filter((definition) => {
    const row = rowById.get(definition.id);
    return Boolean(row && row.sceneId !== definition.sceneId);
  });
  const orphaned = rows.filter((row) => !definitionById.has(row.id));
  return {
    total: tourPlaceDefinitions.length,
    synced: tourPlaceDefinitions.length - missing.length - moved.length,
    missing,
    moved,
    orphaned,
    duplicates
  };
}
