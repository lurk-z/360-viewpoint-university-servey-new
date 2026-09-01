import { unstable_cache } from 'next/cache';
import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../lib/supabase/env';
import {
  createBootstrapTourStructureData,
  createFallbackTourStructureSnapshot,
  tourStructureDataSchema,
  type TourStructureData,
  type TourStructureSnapshot
} from '../tour-structure';
import { overlayCodeNavigation } from '../tour-navigation-sync';

export const TOUR_STRUCTURE_CACHE_TAG = 'tour-structure';
export const TOUR_PROJECT_ID = 'main';

interface TourProjectRow {
  readonly id: string;
  readonly draft_data: unknown;
  readonly published_data: unknown;
  readonly draft_version: number;
  readonly published_version: number | null;
  readonly updated_at: string;
}

export interface AdminTourProject {
  readonly installed: boolean;
  readonly draft: TourStructureData;
  readonly published: TourStructureData | null;
  readonly draftVersion: number;
  readonly publishedVersion: number | null;
  readonly updatedAt: string | null;
}

export interface AdminTourRevision {
  readonly id: string;
  readonly action: string;
  readonly version: number;
  readonly createdAt: string;
}

export interface AdminTourAsset {
  readonly id: string;
  readonly publicUrl: string;
  readonly fileName: string;
  readonly width: number;
  readonly height: number;
  readonly byteSize: number;
  readonly createdAt: string;
}

async function readPublishedTourStructure(): Promise<TourStructureSnapshot> {
  if (!isSupabaseConfigured()) return createFallbackTourStructureSnapshot();
  try {
    const { data, error } = await createAdminSupabaseClient()
      .from('tour_projects')
      .select('published_data,published_version,updated_at')
      .eq('id', TOUR_PROJECT_ID)
      .maybeSingle();
    if (error || !data?.published_data) return createFallbackTourStructureSnapshot();
    const parsed = tourStructureDataSchema.safeParse(data.published_data);
    if (!parsed.success) return createFallbackTourStructureSnapshot();
    let structure = parsed.data;
    if (process.env.NODE_ENV === 'development') {
      try {
        structure = overlayCodeNavigation(structure, createBootstrapTourStructureData());
      } catch (error) {
        console.warn(
          '[tour-navigation-dev-overlay] Navigation from tour-data.ts could not be applied:',
          error instanceof Error ? error.message : 'unknown validation error'
        );
      }
    }
    return {
      version: Number(data.published_version ?? 1),
      generatedAt: String(data.updated_at ?? new Date().toISOString()),
      source: 'database',
      data: structure
    };
  } catch {
    return createFallbackTourStructureSnapshot();
  }
}

const readCachedPublishedTourStructure = unstable_cache(
  readPublishedTourStructure,
  ['published-tour-structure-v1'],
  { revalidate: 15, tags: [TOUR_STRUCTURE_CACHE_TAG] }
);

export async function getPublishedTourStructureSnapshot(): Promise<TourStructureSnapshot> {
  return process.env.NODE_ENV === 'production'
    ? readCachedPublishedTourStructure()
    : readPublishedTourStructure();
}

/** Bypasses the page cache for lightweight signature checks and live updates. */
export async function getFreshPublishedTourStructureSnapshot(): Promise<TourStructureSnapshot> {
  return readPublishedTourStructure();
}

export async function getAdminTourProject(): Promise<AdminTourProject> {
  const fallback = createBootstrapTourStructureData();
  if (!isSupabaseConfigured()) {
    return { installed: false, draft: fallback, published: null, draftVersion: 1, publishedVersion: null, updatedAt: null };
  }
  const { data, error } = await createAdminSupabaseClient()
    .from('tour_projects')
    .select('id,draft_data,published_data,draft_version,published_version,updated_at')
    .eq('id', TOUR_PROJECT_ID)
    .maybeSingle();
  if (error || !data) {
    return { installed: false, draft: fallback, published: null, draftVersion: 1, publishedVersion: null, updatedAt: null };
  }
  const row = data as TourProjectRow;
  const draft = tourStructureDataSchema.safeParse(row.draft_data);
  const published = tourStructureDataSchema.safeParse(row.published_data);
  return {
    installed: draft.success,
    draft: draft.success ? draft.data : fallback,
    published: published.success ? published.data : null,
    draftVersion: Number(row.draft_version || 1),
    publishedVersion: row.published_version === null ? null : Number(row.published_version),
    updatedAt: row.updated_at || null
  };
}

export async function listTourRevisions(): Promise<readonly AdminTourRevision[]> {
  try {
    const { data, error } = await createAdminSupabaseClient().from('tour_revisions')
      .select('id,action,version,created_at')
      .eq('project_id', TOUR_PROJECT_ID)
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) return [];
    return (data ?? []).map((row) => ({
      id: String(row.id),
      action: String(row.action),
      version: Number(row.version),
      createdAt: String(row.created_at)
    }));
  } catch {
    return [];
  }
}

export async function listTourAssets(): Promise<readonly AdminTourAsset[]> {
  try {
    const { data, error } = await createAdminSupabaseClient().from('tour_assets')
      .select('id,public_url,file_name,width,height,byte_size,created_at')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => ({
      id: String(row.id),
      publicUrl: String(row.public_url),
      fileName: String(row.file_name),
      width: Number(row.width),
      height: Number(row.height),
      byteSize: Number(row.byte_size),
      createdAt: String(row.created_at)
    }));
  } catch {
    return [];
  }
}

export async function bootstrapTourProject(userId?: string): Promise<{ readonly created: boolean }> {
  const admin = createAdminSupabaseClient();
  const current = await admin.from('tour_projects').select('id').eq('id', TOUR_PROJECT_ID).maybeSingle();
  if (current.error) throw current.error;
  if (current.data) return { created: false };
  const structure = createBootstrapTourStructureData();
  const { error } = await admin.from('tour_projects').insert({
    id: TOUR_PROJECT_ID,
    draft_data: structure,
    published_data: structure,
    draft_version: 1,
    published_version: 1,
    ...(userId ? { created_by: userId, updated_by: userId } : {})
  });
  if (error) throw error;
  await admin.from('tour_revisions').insert({
    project_id: TOUR_PROJECT_ID,
    action: 'create',
    snapshot: structure,
    version: 1,
    ...(userId ? { created_by: userId } : {})
  });
  return { created: true };
}

export async function writeAdminAuditLog(entry: {
  readonly actorId?: string;
  readonly action: string;
  readonly entityKind: string;
  readonly entityId?: string;
  readonly summary?: Record<string, unknown>;
}): Promise<void> {
  try {
    await createAdminSupabaseClient().from('admin_audit_logs').insert({
      actor_id: entry.actorId ?? null,
      action: entry.action,
      entity_kind: entry.entityKind,
      entity_id: entry.entityId ?? null,
      summary: entry.summary ?? {}
    });
  } catch {
    // Audit availability must never make the original admin action fail.
  }
}
