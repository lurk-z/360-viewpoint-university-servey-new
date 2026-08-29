import { z } from 'zod';
import { updateTag } from 'next/cache';
import { createAdminSupabaseClient } from '../../../../../lib/supabase/admin';
import {
  activityDataSchema, facultyDataSchema, hotspotDataSchema, programDataSchema
} from '../../../../../src/content';
import { requireAdmin } from '../../../../../src/server/auth';
import { TOUR_STRUCTURE_CACHE_TAG, writeAdminAuditLog } from '../../../../../src/server/tour-structure-repository';
import { tourStructureDataSchema } from '../../../../../src/tour-structure';

const rowSchema = z.object({
  id: z.string().min(1).max(150),
  slug: z.string().nullish(),
  scene_id: z.string().nullish(),
  hotspot_id: z.string().nullish(),
  faculty_id: z.string().nullish(),
  draft_data: z.unknown()
}).passthrough();
const backupSchema = z.object({
  format: z.literal('fitm-tour-backup'),
  schemaVersion: z.literal(1),
  content: z.object({
    faculties: z.array(rowSchema).max(5_000),
    programs: z.array(rowSchema).max(5_000),
    activities: z.array(rowSchema).max(5_000),
    hotspot_contents: z.array(rowSchema).max(5_000)
  }),
  tourProject: z.object({ draft_data: z.unknown() }).passthrough().nullable().optional()
});

const contentSchemas = {
  faculties: facultyDataSchema,
  programs: programDataSchema,
  activities: activityDataSchema,
  hotspot_contents: hotspotDataSchema
} as const;

export async function POST(request: Request) {
  const session = await requireAdmin();
  const url = new URL(request.url);
  const commit = url.searchParams.get('commit') === '1';
  const replaceTourDraft = url.searchParams.get('replaceTourDraft') === '1';
  const parsed = backupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'ไฟล์ไม่ใช่ข้อมูลสำรอง FITM Tour ที่รองรับ' }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const result: Record<string, { ready: number; conflicts: number; invalid: number; inserted: number }> = {};
  for (const table of Object.keys(contentSchemas) as Array<keyof typeof contentSchemas>) {
    const rows = parsed.data.content[table];
    const { data: existing, error } = await admin.from(table).select(table === 'hotspot_contents' ? 'id' : 'id,slug');
    if (error) return Response.json({ error: `ตรวจข้อมูล ${table} ไม่สำเร็จ` }, { status: 500 });
    const existingRows = (existing ?? []) as unknown as Array<{ id: string; slug?: string | null }>;
    const ids = new Set(existingRows.map((row) => String(row.id)));
    const slugs = new Set(existingRows.flatMap((row) => row.slug ? [String(row.slug)] : []));
    const valid = rows.filter((row) => contentSchemas[table].safeParse(row.draft_data).success);
    const ready = valid.filter((row) => !ids.has(row.id) && (!row.slug || !slugs.has(row.slug)));
    result[table] = {
      ready: ready.length,
      conflicts: valid.length - ready.length,
      invalid: rows.length - valid.length,
      inserted: 0
    };
    if (commit && ready.length) {
      const payload = ready.map((row) => ({
        id: row.id,
        ...(table !== 'hotspot_contents' ? { slug: row.slug } : {}),
        ...(table === 'faculties' ? { scene_id: row.scene_id, hotspot_id: row.hotspot_id } : {}),
        ...(table === 'programs' ? { faculty_id: row.faculty_id } : {}),
        ...(table === 'hotspot_contents' ? { scene_id: row.scene_id } : {}),
        draft_data: row.draft_data,
        published_data: null,
        archived_at: null,
        created_by: session.userId,
        updated_by: session.userId
      }));
      const { error: insertError } = await admin.from(table).insert(payload);
      if (insertError) return Response.json({ error: `นำเข้า ${table} ไม่สำเร็จ: ตรวจความสัมพันธ์ของข้อมูลอีกครั้ง` }, { status: 409 });
      result[table]!.inserted = ready.length;
    }
  }

  const tourDraft = parsed.data.tourProject?.draft_data;
  const parsedTour = tourStructureDataSchema.safeParse(tourDraft);
  let tourResult: 'none' | 'ready' | 'conflict' | 'imported' | 'invalid' = tourDraft === undefined ? 'none' : parsedTour.success ? 'ready' : 'invalid';
  if (parsedTour.success) {
    const { data: current } = await admin.from('tour_projects').select('id,draft_version').eq('id', 'main').maybeSingle();
    if (current && !replaceTourDraft) tourResult = 'conflict';
    else if (commit && replaceTourDraft) {
      const version = Number(current?.draft_version ?? 0) + 1;
      const { error } = await admin.from('tour_projects').upsert({
        id: 'main', draft_data: parsedTour.data, draft_version: version,
        published_data: null, published_version: null,
        created_by: session.userId, updated_by: session.userId
      });
      if (error) return Response.json({ error: 'นำเข้าโครงสร้างทัวร์ไม่สำเร็จ' }, { status: 500 });
      tourResult = 'imported';
      updateTag(TOUR_STRUCTURE_CACHE_TAG);
    }
  }
  await writeAdminAuditLog({ actorId: session.userId, action: commit ? 'import-backup' : 'preview-import', entityKind: 'backup', summary: { result, tourResult } });
  return Response.json({ result, tourResult });
}
