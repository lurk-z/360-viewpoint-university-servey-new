import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { hotspotDataSchema } from './content';
import { syncTourPlaces } from './server/tour-place-sync';
import {
  getTourPlaceDraft,
  getTourPlaceSyncStatus,
  isTourPlaceLink,
  tourPlaceDefinitions
} from './tour-places';

interface FakeRow {
  id: string;
  scene_id: string;
  draft_data?: unknown;
  published_data?: unknown;
  created_by?: string;
  updated_by?: string;
}

function fakeSupabase(initialRows: readonly FakeRow[]): { client: SupabaseClient; rows: Map<string, FakeRow> } {
  const rows = new Map(initialRows.map((row) => [row.id, { ...row }]));
  const table = {
    select: async () => ({ data: [...rows.values()].map((row) => ({ id: row.id, scene_id: row.scene_id })), error: null }),
    upsert: async (payload: readonly FakeRow[]) => {
      for (const row of payload) if (!rows.has(row.id)) rows.set(row.id, { ...row });
      return { error: null };
    },
    update: (payload: Partial<FakeRow>) => ({
      eq: async (_column: string, id: string) => {
        const current = rows.get(id);
        if (current) rows.set(id, { ...current, ...payload });
        return { error: null };
      }
    })
  };
  return {
    client: { from: () => table } as unknown as SupabaseClient,
    rows
  };
}

describe('tour place content synchronization', () => {
  it('detects missing, moved and orphaned records using stable hotspot IDs', () => {
    const [first, second] = tourPlaceDefinitions;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const status = getTourPlaceSyncStatus([
      { id: first!.id, sceneId: first!.sceneId },
      { id: second!.id, sceneId: first!.sceneId },
      { id: 'removed-hotspot', sceneId: first!.sceneId }
    ]);
    expect(status.synced).toBe(1);
    expect(status.missing).toHaveLength(tourPlaceDefinitions.length - 2);
    expect(status.moved).toEqual([second]);
    expect(status.orphaned).toEqual([{ id: 'removed-hotspot', sceneId: first!.sceneId }]);
    expect(isTourPlaceLink(first!.id, first!.sceneId)).toBe(true);
    expect(isTourPlaceLink(first!.id, second!.sceneId)).toBe(false);
  });

  it('creates an unpublished-ready draft that still requires an explicit Admin image', () => {
    const draft = getTourPlaceDraft(tourPlaceDefinitions[0]!);
    expect(draft.images).toEqual([]);
    expect(draft.reference.label).toEqual({ th: '', en: '' });
    expect(hotspotDataSchema.safeParse(draft).success).toBe(false);
  });

  it('is idempotent and relinks only scene metadata without overwriting Admin content', async () => {
    const definition = tourPlaceDefinitions[0]!;
    const customDraft = { custom: 'admin draft' };
    const customPublished = { custom: 'admin published' };
    const database = fakeSupabase([{
      id: definition.id,
      scene_id: 'old-scene',
      draft_data: customDraft,
      published_data: customPublished
    }]);

    const first = await syncTourPlaces(database.client, 'admin-user');
    expect(first.inserted).toBe(tourPlaceDefinitions.length - 1);
    expect(first.relinked).toBe(1);
    expect(database.rows.get(definition.id)).toMatchObject({
      scene_id: definition.sceneId,
      draft_data: customDraft,
      published_data: customPublished,
      updated_by: 'admin-user'
    });

    const second = await syncTourPlaces(database.client, 'admin-user');
    expect(second.inserted).toBe(0);
    expect(second.relinked).toBe(0);
  });
});
