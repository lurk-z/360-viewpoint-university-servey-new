import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTourPlaceDraft,
  getTourPlaceSyncStatus,
  type TourPlaceSyncStatus
} from '../tour-places.ts';

export interface TourPlaceSyncResult extends TourPlaceSyncStatus {
  readonly inserted: number;
  readonly relinked: number;
}

export interface InitialTourPlaceContent {
  readonly draftData: Record<string, unknown>;
  readonly publishOnInsert?: boolean;
}

export class DuplicateTourPlaceIdError extends Error {
  readonly duplicateIds: readonly string[];

  constructor(duplicateIds: readonly string[]) {
    super(`พบ Hotspot ID ซ้ำในโครงสร้างทัวร์: ${duplicateIds.join(', ')}`);
    this.name = 'DuplicateTourPlaceIdError';
    this.duplicateIds = duplicateIds;
  }
}

export async function syncTourPlaces(
  supabase: SupabaseClient,
  userId?: string,
  initialContentById?: ReadonlyMap<string, InitialTourPlaceContent>
): Promise<TourPlaceSyncResult> {
  const { data, error: readError } = await supabase.from('hotspot_contents').select('id,scene_id');
  if (readError) throw readError;
  const rows = (data ?? []).map((row) => ({ id: String(row.id), sceneId: String(row.scene_id) }));
  const before = getTourPlaceSyncStatus(rows);
  if (before.duplicates.length > 0) {
    throw new DuplicateTourPlaceIdError(before.duplicates.map((duplicate) => duplicate.id));
  }

  if (before.missing.length > 0) {
    const { error } = await supabase.from('hotspot_contents').upsert(
      before.missing.map((definition) => {
        const initial = initialContentById?.get(definition.id);
        const draftData = initial?.draftData ?? getTourPlaceDraft(definition);
        return {
          id: definition.id,
          scene_id: definition.sceneId,
          draft_data: draftData,
          published_data: initial?.publishOnInsert ? draftData : null,
          ...(userId ? { created_by: userId, updated_by: userId } : {})
        };
      }),
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  for (const definition of before.moved) {
    const { error } = await supabase.from('hotspot_contents').update({
      scene_id: definition.sceneId,
      ...(userId ? { updated_by: userId } : {})
    }).eq('id', definition.id);
    if (error) throw error;
  }

  const { data: updatedData, error: updatedReadError } = await supabase
    .from('hotspot_contents')
    .select('id,scene_id');
  if (updatedReadError) throw updatedReadError;
  const after = getTourPlaceSyncStatus((updatedData ?? []).map((row) => ({
    id: String(row.id),
    sceneId: String(row.scene_id)
  })));

  return {
    ...after,
    inserted: before.missing.length - after.missing.length,
    relinked: before.moved.length - after.moved.length
  };
}
