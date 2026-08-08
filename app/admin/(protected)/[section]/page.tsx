import { notFound, redirect } from 'next/navigation';
import AdminContentEditor from '../../../../components/admin/AdminContentEditor';
import type { AdminMediaOption } from '../../../../components/admin/AdminImageGalleryFields';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { hotspotDataSchema, type ContentKind } from '../../../../src/content';
import { listAdminContent } from '../../../../src/server/admin-repository';
import { requireStaff } from '../../../../src/server/auth';
import { isTourPlaceLink } from '../../../../src/tour-places';

const sections = {
  faculties: { kind: 'faculties', title: 'ข้อมูลคณะ', description: 'จัดการข้อมูลประชาสัมพันธ์ของคณะทั้งภาษาไทยและอังกฤษ' },
  programs: { kind: 'programs', title: 'ข้อมูลหลักสูตร', description: 'จัดการระดับการศึกษา รายละเอียด และข้อมูลการรับสมัคร' },
  activities: { kind: 'activities', title: 'กิจกรรม', description: 'จัดการกิจกรรม วันที่จัด และฉากที่เกี่ยวข้อง' },
  places: { kind: 'hotspot_contents', title: 'สถานที่สำคัญ', description: 'แก้ข้อมูลบนการ์ดฉาก ปุ่ม Info รูป และอ้างอิง โดยตำแหน่ง yaw/pitch ยังคงอยู่ในโค้ด' }
} as const satisfies Record<string, { kind: ContentKind; title: string; description: string }>;

async function listMediaOptions(): Promise<AdminMediaOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage.from('content-media').list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' }
  });
  if (error) return [];
  return (data ?? []).filter((item) => item.id).map((item) => ({
    name: item.name,
    url: supabase.storage.from('content-media').getPublicUrl(item.name).data.publicUrl
  }));
}

export default async function AdminSectionPage({
  params,
  searchParams
}: {
  readonly params: Promise<{ section: string }>;
  readonly searchParams: Promise<{ faculty?: string }>;
}) {
  const { section } = await params;
  const { faculty: requestedFacultyId } = await searchParams;
  if (section === 'hotspots') redirect('/admin/places');
  const config = sections[section as keyof typeof sections];
  if (!config) notFound();
  const session = await requireStaff();
  const [allRows, relatedFacultyRows, relatedProgramRows, media] = await Promise.all([
    listAdminContent(config.kind),
    config.kind === 'programs' || config.kind === 'hotspot_contents'
      ? listAdminContent('faculties')
      : Promise.resolve([]),
    config.kind === 'faculties'
      ? listAdminContent('programs')
      : Promise.resolve([]),
    config.kind === 'faculties' || config.kind === 'hotspot_contents'
      ? listMediaOptions()
      : Promise.resolve([])
  ]);
  const facultyRows = config.kind === 'faculties' ? allRows : relatedFacultyRows;
  const managedHotspotIds = new Set(facultyRows.flatMap((row) => row.hotspotId ? [row.hotspotId] : []));
  const unfilteredRows = config.kind === 'hotspot_contents'
    ? allRows.filter((row) => !managedHotspotIds.has(row.id))
    : allRows;
  const allFacultyOptions = facultyRows.map((row) => ({
    id: row.id,
    label: `${String((row.draftData.name as { th?: string } | undefined)?.th ?? row.slug ?? row.id)}${row.archivedAt ? ' (อยู่ในคลัง)' : row.publishedData ? '' : ' (ฉบับร่าง)'}`
  }));
  const faculties = allFacultyOptions.filter((option) => !facultyRows.find((row) => row.id === option.id)?.archivedAt);
  const facultyFilter = config.kind === 'programs' && requestedFacultyId
    ? allFacultyOptions.find((option) => option.id === requestedFacultyId)
    : undefined;
  const rows = facultyFilter
    ? unfilteredRows.filter((row) => row.facultyId === facultyFilter.id)
    : unfilteredRows;
  const facultyProgramStats = config.kind === 'faculties'
    ? relatedProgramRows.reduce<Record<string, { total: number; published: number }>>((stats, program) => {
        if (!program.facultyId) return stats;
        const current = stats[program.facultyId] ?? { total: 0, published: 0 };
        stats[program.facultyId] = {
          total: current.total + 1,
          published: current.published + (program.publishedData && !program.archivedAt ? 1 : 0)
        };
        return stats;
      }, {})
    : undefined;
  const placeStatuses = config.kind === 'hotspot_contents'
    ? Object.fromEntries(allRows.map((row) => [row.id, {
        orphaned: !row.sceneId || !isTourPlaceLink(row.id, row.sceneId),
        draftReady: hotspotDataSchema.safeParse(row.draftData).success
      }]))
    : undefined;

  return (
    <AdminContentEditor
      {...config}
      rows={rows}
      role={session.role}
      faculties={faculties}
      facultyProgramStats={facultyProgramStats}
      facultyFilter={facultyFilter}
      media={media}
      placeStatuses={placeStatuses}
    />
  );
}
