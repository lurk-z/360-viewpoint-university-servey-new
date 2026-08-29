import { createServerSupabaseClient } from '../../lib/supabase/server';
import type { ContentKind } from '../content';
import { activityDataSchema, facultyDataSchema, hotspotDataSchema, programDataSchema } from '../content';
import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../lib/supabase/env';
import { createBootstrapTourStructureData, tourStructureDataSchema } from '../tour-structure';

export interface AdminContentRow {
  readonly id: string;
  readonly slug?: string;
  readonly sceneId?: string;
  readonly hotspotId?: string;
  readonly facultyId?: string;
  readonly draftData: Record<string, unknown>;
  readonly publishedData: Record<string, unknown> | null;
  readonly archivedAt: string | null;
  readonly updatedAt: string;
}

interface RawAdminRow {
  readonly id: string;
  readonly slug?: string;
  readonly scene_id?: string;
  readonly hotspot_id?: string;
  readonly faculty_id?: string;
  readonly draft_data: Record<string, unknown>;
  readonly published_data: Record<string, unknown> | null;
  readonly archived_at: string | null;
  readonly updated_at: string;
}

export interface AdminDashboardSummary {
  readonly collectionCounts: {
    readonly faculties: number;
    readonly programs: number;
    readonly activities: number;
    readonly places: number;
  };
  readonly publishedContentCount: number;
  readonly publishedFaculties: number;
  readonly publishedPrograms: number;
  readonly hotspotLinks: readonly { id: string; sceneId?: string }[];
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const supabase = await createServerSupabaseClient();
  const [
    facultyLinksResult,
    hotspotLinksResult,
    facultyCountResult,
    programCountResult,
    activityCountResult,
    publishedFacultyResult,
    publishedProgramResult,
    publishedActivityResult,
    publishedHotspotResult
  ] = await Promise.all([
    supabase.from('faculties').select('id,hotspot_id'),
    supabase.from('hotspot_contents').select('id,scene_id'),
    supabase.from('faculties').select('id', { count: 'exact', head: true }),
    supabase.from('programs').select('id', { count: 'exact', head: true }),
    supabase.from('activities').select('id', { count: 'exact', head: true }),
    supabase.from('faculties').select('id', { count: 'exact', head: true })
      .is('archived_at', null).not('published_data', 'is', null),
    supabase.from('programs').select('id', { count: 'exact', head: true })
      .is('archived_at', null).not('published_data', 'is', null),
    supabase.from('activities').select('id', { count: 'exact', head: true })
      .is('archived_at', null).not('published_data', 'is', null),
    supabase.from('hotspot_contents').select('id', { count: 'exact', head: true })
      .is('archived_at', null).not('published_data', 'is', null)
  ]);

  const firstError = [
    facultyLinksResult.error,
    hotspotLinksResult.error,
    facultyCountResult.error,
    programCountResult.error,
    activityCountResult.error,
    publishedFacultyResult.error,
    publishedProgramResult.error,
    publishedActivityResult.error,
    publishedHotspotResult.error
  ].find(Boolean);
  if (firstError) throw firstError;

  const facultyLinks = (facultyLinksResult.data ?? []) as readonly {
    id: string;
    hotspot_id: string | null;
  }[];
  const hotspotLinks = ((hotspotLinksResult.data ?? []) as readonly {
    id: string;
    scene_id: string | null;
  }[]).map((row) => ({
    id: row.id,
    ...(row.scene_id ? { sceneId: row.scene_id } : {})
  }));
  const facultyManagedHotspots = new Set(
    facultyLinks.flatMap((row) => row.hotspot_id ? [row.hotspot_id] : [])
  );
  const publishedFaculties = publishedFacultyResult.count ?? 0;
  const publishedPrograms = publishedProgramResult.count ?? 0;

  return {
    collectionCounts: {
      faculties: facultyCountResult.count ?? 0,
      programs: programCountResult.count ?? 0,
      activities: activityCountResult.count ?? 0,
      places: hotspotLinks.filter((row) => !facultyManagedHotspots.has(row.id)).length
    },
    publishedContentCount: publishedFaculties
      + publishedPrograms
      + (publishedActivityResult.count ?? 0)
      + (publishedHotspotResult.count ?? 0),
    publishedFaculties,
    publishedPrograms,
    hotspotLinks
  };
}

export async function listAdminContent(kind: ContentKind): Promise<AdminContentRow[]> {
  const supabase = await createServerSupabaseClient();
  const columns = kind === 'programs'
    ? 'id,slug,faculty_id,draft_data,published_data,archived_at,updated_at'
    : kind === 'faculties'
      ? 'id,slug,scene_id,hotspot_id,draft_data,published_data,archived_at,updated_at'
    : kind === 'hotspot_contents'
      ? 'id,scene_id,draft_data,published_data,archived_at,updated_at'
      : 'id,slug,draft_data,published_data,archived_at,updated_at';
  let { data, error } = await supabase.from(kind).select(columns).order('updated_at', { ascending: false });
  if (kind === 'faculties' && error?.code === '42703') {
    const legacyResult = await supabase.from('faculties')
      .select('id,slug,draft_data,published_data,archived_at,updated_at')
      .order('updated_at', { ascending: false });
    data = legacyResult.data as typeof data;
    error = legacyResult.error;
  }
  if (error) throw error;
  return ((data ?? []) as unknown as RawAdminRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    sceneId: row.scene_id,
    hotspotId: row.hotspot_id,
    facultyId: row.faculty_id,
    draftData: row.draft_data,
    publishedData: row.published_data,
    archivedAt: row.archived_at,
    updatedAt: row.updated_at
  }));
}

export interface AdminTaskSummary {
  readonly draftOnly: number;
  readonly incomplete: number;
  readonly archived: number;
  readonly missingImages: number;
  readonly missingSources: number;
}

function schemaFor(kind: ContentKind) {
  if (kind === 'faculties') return facultyDataSchema;
  if (kind === 'programs') return programDataSchema;
  if (kind === 'activities') return activityDataSchema;
  return hotspotDataSchema;
}

function hasImages(kind: ContentKind, data: Record<string, unknown>): boolean {
  if (kind === 'programs' || kind === 'activities') {
    return Boolean(data.imageUrl) || (Array.isArray(data.images) && data.images.length > 0);
  }
  return Array.isArray(data.images) && data.images.length > 0;
}

function hasSource(kind: ContentKind, data: Record<string, unknown>): boolean {
  const value = kind === 'hotspot_contents' ? data.reference : data.source;
  if (!value || typeof value !== 'object') return false;
  const label = (value as { label?: unknown }).label;
  return Boolean(label && typeof label === 'object'
    && String((label as { th?: unknown }).th ?? '').trim()
    && String((label as { en?: unknown }).en ?? '').trim());
}

export async function getAdminTaskSummary(): Promise<AdminTaskSummary> {
  const kinds: readonly ContentKind[] = ['faculties', 'programs', 'activities', 'hotspot_contents'];
  const supabase = await createServerSupabaseClient();
  const results = await Promise.all(kinds.map((kind) => supabase.from(kind)
    .select('draft_data,published_data,archived_at')));
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
  let draftOnly = 0;
  let incomplete = 0;
  let archived = 0;
  let missingImages = 0;
  let missingSources = 0;
  results.forEach((result, index) => {
    const kind = kinds[index]!;
    (result.data ?? []).forEach((raw) => {
      const row = raw as { draft_data: Record<string, unknown>; published_data: unknown; archived_at: string | null };
      if (row.archived_at) archived += 1;
      else if (!row.published_data) draftOnly += 1;
      if (!schemaFor(kind).safeParse(row.draft_data).success) incomplete += 1;
      if (!hasImages(kind, row.draft_data)) missingImages += 1;
      if (!hasSource(kind, row.draft_data)) missingSources += 1;
    });
  });
  return { draftOnly, incomplete, archived, missingImages, missingSources };
}

export interface AdminSystemStatus {
  readonly supabaseConfigured: boolean;
  readonly migrations: readonly string[];
  readonly missingMigrations: readonly string[];
  readonly contentMediaReady: boolean;
  readonly panoramaStorageReady: boolean;
  readonly dynamicTourReady: boolean;
  readonly tourStructureMatchesBootstrap: boolean;
  readonly uploadedPanoramas: number;
}

const REQUIRED_MIGRATIONS = ['202608070001', '202608070002', '202608240001', '202608290001'] as const;

export async function getAdminSystemStatus(): Promise<AdminSystemStatus> {
  if (!isSupabaseConfigured()) {
    return {
      supabaseConfigured: false,
      migrations: [],
      missingMigrations: [...REQUIRED_MIGRATIONS],
      contentMediaReady: false,
      panoramaStorageReady: false,
      dynamicTourReady: false,
      tourStructureMatchesBootstrap: false,
      uploadedPanoramas: 0
    };
  }
  const admin = createAdminSupabaseClient();
  const [versionsResult, bucketsResult, tourResult, assetsResult] = await Promise.all([
    admin.from('app_schema_versions').select('version'),
    admin.storage.listBuckets(),
    admin.from('tour_projects').select('id,published_data').eq('id', 'main').maybeSingle(),
    admin.from('tour_assets').select('id', { count: 'exact', head: true })
  ]);
  const migrations = versionsResult.error
    ? []
    : (versionsResult.data ?? []).map((row) => String(row.version));
  const buckets = new Set((bucketsResult.data ?? []).map((bucket) => bucket.id));
  const publishedStructure = tourStructureDataSchema.safeParse(tourResult.data?.published_data);
  const tourStructureMatchesBootstrap = publishedStructure.success
    && JSON.stringify(publishedStructure.data) === JSON.stringify(createBootstrapTourStructureData());
  return {
    supabaseConfigured: true,
    migrations,
    missingMigrations: REQUIRED_MIGRATIONS.filter((version) => !migrations.includes(version)),
    contentMediaReady: buckets.has('content-media'),
    panoramaStorageReady: buckets.has('tour-panoramas'),
    dynamicTourReady: !tourResult.error && Boolean(tourResult.data),
    tourStructureMatchesBootstrap,
    uploadedPanoramas: assetsResult.error ? 0 : (assetsResult.count ?? 0)
  };
}

export interface AdminContentRevision {
  readonly id: string;
  readonly action: string;
  readonly snapshot: Record<string, unknown>;
  readonly createdAt: string;
}

export async function listContentRevisions(kind: ContentKind, id: string): Promise<AdminContentRevision[]> {
  const { data, error } = await (await createServerSupabaseClient())
    .from('content_revisions')
    .select('id,action,snapshot,created_at')
    .eq('entity_kind', kind)
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: String(row.id),
    action: String(row.action),
    snapshot: row.snapshot as Record<string, unknown>,
    createdAt: String(row.created_at)
  }));
}

export interface AdminAuditEntry {
  readonly id: string;
  readonly action: string;
  readonly entityKind: string;
  readonly entityId?: string;
  readonly summary: Record<string, unknown>;
  readonly createdAt: string;
}

export async function listAdminAuditLog(): Promise<readonly AdminAuditEntry[]> {
  try {
    const { data, error } = await createAdminSupabaseClient().from('admin_audit_logs')
      .select('id,action,entity_kind,entity_id,summary,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return [];
    return (data ?? []).map((row) => ({
      id: String(row.id), action: String(row.action), entityKind: String(row.entity_kind),
      ...(row.entity_id ? { entityId: String(row.entity_id) } : {}),
      summary: (row.summary && typeof row.summary === 'object' ? row.summary : {}) as Record<string, unknown>,
      createdAt: String(row.created_at)
    }));
  } catch {
    return [];
  }
}

export interface VisitStatistics {
  readonly today: number;
  readonly total: number;
  readonly last7Days: readonly { date: string; count: number }[];
  readonly last30Days: readonly { date: string; count: number }[];
}

function bangkokDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function fillVisitSeries(
  rows: readonly { date: string; count: number }[],
  days: number,
  today = bangkokDate()
): { date: string; count: number }[] {
  const countByDate = new Map(rows.map((row) => [row.date, row.count]));
  const end = new Date(`${today}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - index - 1));
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: countByDate.get(key) ?? 0 };
  });
}

export async function getVisitStatistics(): Promise<VisitStatistics> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('daily_visit_counts')
    .select('visit_date,view_count')
    .order('visit_date');
  if (error) throw error;
  const rows = (data ?? []).map((row) => ({ date: String(row.visit_date), count: Number(row.view_count) }));
  const today = bangkokDate();
  const last30Days = fillVisitSeries(rows, 30, today);
  return {
    today: last30Days.at(-1)?.count ?? 0,
    total: rows.reduce((sum, row) => sum + row.count, 0),
    last7Days: last30Days.slice(-7),
    last30Days
  };
}
