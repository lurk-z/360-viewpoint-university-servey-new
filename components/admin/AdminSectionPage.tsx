import AdminContentEditor from './AdminContentEditor';
import AdminProgramTagDrafting from './AdminProgramTagDrafting';
import type { AdminMediaOption } from './AdminImageGalleryFields';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import { hotspotDataSchema, programDataSchema, type ContentKind } from '../../src/content';
import { listAdminContent } from '../../src/server/admin-repository';
import { requireStaff } from '../../src/server/auth';
import { isTourPlaceLink } from '../../src/tour-places';
import { hasMissingProgramRecommendationData } from '../../src/program-recommendation-data';

const sections = {
  faculties: {
    kind: 'faculties',
    title: 'ข้อมูลคณะ',
    description: 'จัดการข้อมูลประชาสัมพันธ์ของคณะทั้งภาษาไทยและอังกฤษ'
  },
  programs: {
    kind: 'programs',
    title: 'ข้อมูลหลักสูตร',
    description: 'จัดการระดับการศึกษา รายละเอียด และข้อมูลการรับสมัคร'
  },
  activities: {
    kind: 'activities',
    title: 'กิจกรรม',
    description: 'จัดการกิจกรรม วันที่จัด และฉากที่เกี่ยวข้อง'
  },
  places: {
    kind: 'hotspot_contents',
    title: 'สถานที่สำคัญ',
    description: 'แก้ข้อมูลปุ่ม Info รูป อ้างอิง และสถานะเผยแพร่ ส่วนตำแหน่งปุ่มจัดการจากหน้าโครงสร้างทัวร์'
  }
} as const satisfies Record<string, { kind: ContentKind; title: string; description: string }>;

export type AdminSection = keyof typeof sections;

interface AdminSectionPageProps {
  readonly section: AdminSection;
  readonly requestedFacultyId?: string;
  readonly requestedStatus?: string;
  readonly requestedQuery?: string;
}

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
  section,
  requestedFacultyId,
  requestedStatus,
  requestedQuery
}: AdminSectionPageProps) {
  const config = sections[section];
  const session = await requireStaff();
  const [allRows, relatedFacultyRows, relatedProgramRows, media] = await Promise.all([
    listAdminContent(config.kind),
    config.kind === 'programs' || config.kind === 'hotspot_contents'
      ? listAdminContent('faculties')
      : Promise.resolve([]),
    config.kind === 'faculties'
      ? listAdminContent('programs')
      : Promise.resolve([]),
    listMediaOptions()
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
  const missingProgramTagCount = config.kind === 'programs'
    ? allRows.filter((row) => {
      if (!row.publishedData || row.archivedAt) return false;
      const draft = programDataSchema.safeParse(row.draftData);
      const published = programDataSchema.safeParse(row.publishedData);
      return draft.success && published.success && (
        hasMissingProgramRecommendationData(draft.data)
        || hasMissingProgramRecommendationData(published.data)
      );
    }).length
    : 0;

  return (
    <>
      {config.kind === 'programs' && session.role === 'admin' ? (
        <AdminProgramTagDrafting missingCount={missingProgramTagCount} />
      ) : null}
      <AdminContentEditor
        {...config}
        rows={rows}
        role={session.role}
        faculties={faculties}
        facultyProgramStats={facultyProgramStats}
        facultyFilter={facultyFilter}
        media={media}
        placeStatuses={placeStatuses}
        initialStatusFilter={requestedStatus}
        initialQuery={requestedQuery}
      />
    </>
  );
}
