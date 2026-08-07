import { createServerSupabaseClient } from '../../lib/supabase/server';
import type { ContentKind } from '../content';

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
