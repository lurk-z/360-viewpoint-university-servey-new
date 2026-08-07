import {
  activityDataSchema,
  createFallbackContentSnapshot,
  facultyDataSchema,
  hotspotDataSchema,
  isSceneId,
  programDataSchema,
  type ActivityContent,
  type FacultyContent,
  type HotspotContent,
  type ProgramContent,
  type PublicContentSnapshot
} from '../content';
import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../lib/supabase/env';

interface CmsRow {
  readonly id: string;
  readonly slug?: string;
  readonly scene_id?: string;
  readonly faculty_id?: string;
  readonly published_data: unknown;
  readonly updated_at?: string;
}

function mapFaculty(row: CmsRow): FacultyContent | null {
  const parsed = facultyDataSchema.safeParse(row.published_data);
  if (!parsed.success || !row.slug) return null;
  return { id: row.id, slug: row.slug, ...parsed.data };
}

function mapProgram(row: CmsRow): ProgramContent | null {
  const parsed = programDataSchema.safeParse(row.published_data);
  if (!parsed.success || !row.slug || !row.faculty_id) return null;
  return { id: row.id, facultyId: row.faculty_id, slug: row.slug, ...parsed.data };
}

function mapActivity(row: CmsRow): ActivityContent | null {
  const parsed = activityDataSchema.safeParse(row.published_data);
  if (!parsed.success || !row.slug) return null;
  const sceneId = parsed.data.sceneId && isSceneId(parsed.data.sceneId)
    ? parsed.data.sceneId
    : undefined;
  return { id: row.id, slug: row.slug, ...parsed.data, sceneId };
}

function mapHotspot(row: CmsRow): HotspotContent | null {
  const parsed = hotspotDataSchema.safeParse(row.published_data);
  if (!parsed.success || !row.scene_id || !isSceneId(row.scene_id)) return null;
  return {
    id: row.id,
    sceneId: row.scene_id,
    hotspotId: row.id,
    ...parsed.data
  };
}

function compact<T>(values: readonly (T | null)[]): T[] {
  return values.filter((value): value is T => value !== null);
}

export async function getPublicContentSnapshot(): Promise<PublicContentSnapshot> {
  if (!isSupabaseConfigured()) return createFallbackContentSnapshot();

  try {
    const supabase = createAdminSupabaseClient();
    const [facultiesResult, programsResult, activitiesResult, hotspotsResult] = await Promise.all([
      supabase.from('faculties').select('id,slug,published_data,updated_at')
        .is('archived_at', null).not('published_data', 'is', null).order('slug'),
      supabase.from('programs').select('id,slug,faculty_id,published_data,updated_at')
        .is('archived_at', null).not('published_data', 'is', null).order('slug'),
      supabase.from('activities').select('id,slug,published_data,updated_at')
        .is('archived_at', null).not('published_data', 'is', null).order('slug'),
      supabase.from('hotspot_contents').select('id,scene_id,published_data,updated_at')
        .is('archived_at', null).not('published_data', 'is', null).order('scene_id')
    ]);

    const firstError = [facultiesResult.error, programsResult.error, activitiesResult.error, hotspotsResult.error]
      .find(Boolean);
    if (firstError) throw firstError;

    const allRows = [
      ...(facultiesResult.data ?? []),
      ...(programsResult.data ?? []),
      ...(activitiesResult.data ?? []),
      ...(hotspotsResult.data ?? [])
    ] as CmsRow[];
    const latestUpdate = allRows.reduce((latest, row) => (
      Math.max(latest, row.updated_at ? Date.parse(row.updated_at) : 0)
    ), 0);

    return {
      version: latestUpdate || Date.now(),
      generatedAt: new Date().toISOString(),
      source: 'database',
      faculties: compact(((facultiesResult.data ?? []) as unknown as CmsRow[]).map(mapFaculty)),
      programs: compact(((programsResult.data ?? []) as unknown as CmsRow[]).map(mapProgram)),
      activities: compact(((activitiesResult.data ?? []) as unknown as CmsRow[]).map(mapActivity)),
      hotspots: compact(((hotspotsResult.data ?? []) as unknown as CmsRow[]).map(mapHotspot))
    };
  } catch {
    return createFallbackContentSnapshot();
  }
}
