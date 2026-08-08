import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import {
  contentReferencesMedia,
  getContentLabel,
  type MediaDescriptor,
  type MediaUsage,
  type MediaUsageKind
} from '../media-usage';

interface ContentRow {
  readonly id: string;
  readonly draft_data: unknown;
  readonly published_data: unknown;
  readonly archived_at?: string | null;
}

const tableRoutes: Record<MediaUsageKind, string> = {
  faculties: '/admin/faculties',
  programs: '/admin/programs',
  activities: '/admin/activities',
  hotspot_contents: '/admin/places'
};

export async function getMediaUsageIndex(
  media: readonly MediaDescriptor[]
): Promise<Record<string, readonly MediaUsage[]>> {
  const supabase = createAdminSupabaseClient();
  const tables: readonly MediaUsageKind[] = ['faculties', 'programs', 'activities', 'hotspot_contents'];
  const results = await Promise.all(tables.map(async (kind) => {
    const { data, error } = await supabase.from(kind)
      .select('id,draft_data,published_data,archived_at');
    if (error) throw error;
    return { kind, rows: (data ?? []) as unknown as ContentRow[] };
  }));

  return Object.fromEntries(media.map((descriptor) => {
    const usages: MediaUsage[] = [];
    for (const { kind, rows } of results) {
      for (const row of rows) {
        const scopes: ('draft' | 'published')[] = [];
        if (contentReferencesMedia(row.draft_data, descriptor)) scopes.push('draft');
        if (contentReferencesMedia(row.published_data, descriptor)) scopes.push('published');
        if (!scopes.length) continue;
        usages.push({
          kind,
          id: row.id,
          label: getContentLabel(row.draft_data) ?? getContentLabel(row.published_data) ?? row.id,
          href: tableRoutes[kind],
          scopes,
          archived: Boolean(row.archived_at)
        });
      }
    }
    return [descriptor.path, usages] as const;
  }));
}
