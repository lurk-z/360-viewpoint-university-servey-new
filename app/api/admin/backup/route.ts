import { createAdminSupabaseClient } from '../../../../lib/supabase/admin';
import { requireAdmin } from '../../../../src/server/auth';
import { writeAdminAuditLog } from '../../../../src/server/tour-structure-repository';

const tables = ['faculties', 'programs', 'activities', 'hotspot_contents'] as const;

function csvCell(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const search = new URL(request.url).searchParams;
  const format = search.get('format') === 'csv' ? 'csv' : 'json';
  const [faculties, programs, activities, hotspots, tour, assets] = await Promise.all([
    admin.from('faculties').select('*').order('created_at'),
    admin.from('programs').select('*').order('created_at'),
    admin.from('activities').select('*').order('created_at'),
    admin.from('hotspot_contents').select('*').order('created_at'),
    admin.from('tour_projects').select('*').eq('id', 'main').maybeSingle(),
    admin.from('tour_assets').select('*').order('created_at')
  ]);
  const firstError = [faculties.error, programs.error, activities.error, hotspots.error].find(Boolean);
  if (firstError) return Response.json({ error: 'ไม่สามารถอ่านข้อมูลสำรองได้' }, { status: 500 });
  await writeAdminAuditLog({ actorId: session.userId, action: 'export-backup', entityKind: 'backup', summary: { format } });

  if (format === 'csv') {
    const rows = tables.flatMap((table) => {
      const result = { faculties, programs, activities, hotspot_contents: hotspots }[table];
      return (result.data ?? []).map((row) => [
        table,
        String(row.id),
        'slug' in row ? String(row.slug ?? '') : '',
        'scene_id' in row ? String(row.scene_id ?? '') : '',
        row.archived_at ? 'archived' : row.published_data ? 'published' : 'draft',
        row.draft_data
      ]);
    });
    const csv = [['type', 'id', 'slug', 'scene_id', 'status', 'draft_data'], ...rows]
      .map((row) => row.map(csvCell).join(',')).join('\r\n');
    return new Response(`\uFEFF${csv}`, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fitm-tour-report-${new Date().toISOString().slice(0, 10)}.csv"`
    } });
  }

  return Response.json({
    format: 'fitm-tour-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    content: {
      faculties: faculties.data ?? [], programs: programs.data ?? [],
      activities: activities.data ?? [], hotspot_contents: hotspots.data ?? []
    },
    tourProject: tour.error ? null : tour.data,
    tourAssets: assets.error ? [] : assets.data ?? []
  }, { headers: {
    'Content-Disposition': `attachment; filename="fitm-tour-backup-${new Date().toISOString().slice(0, 10)}.json"`
  } });
}
