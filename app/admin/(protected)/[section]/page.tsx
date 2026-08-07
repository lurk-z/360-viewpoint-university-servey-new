import { notFound, redirect } from 'next/navigation';
import AdminContentEditor from '../../../../components/admin/AdminContentEditor';
import type { ContentKind } from '../../../../src/content';
import { listAdminContent } from '../../../../src/server/admin-repository';
import { requireStaff } from '../../../../src/server/auth';

const sections = {
  faculties: { kind: 'faculties', title: 'ข้อมูลคณะ', description: 'จัดการข้อมูลประชาสัมพันธ์ของคณะทั้งภาษาไทยและอังกฤษ' },
  programs: { kind: 'programs', title: 'ข้อมูลหลักสูตร', description: 'จัดการระดับการศึกษา รายละเอียด และข้อมูลการรับสมัคร' },
  activities: { kind: 'activities', title: 'กิจกรรม', description: 'จัดการกิจกรรม วันที่จัด และฉากที่เกี่ยวข้อง' },
  places: { kind: 'hotspot_contents', title: 'สถานที่สำคัญ', description: 'แก้ข้อมูลบนการ์ดฉาก ปุ่ม Info รูป และอ้างอิง โดยตำแหน่ง yaw/pitch ยังคงอยู่ในโค้ด' }
} as const satisfies Record<string, { kind: ContentKind; title: string; description: string }>;

export default async function AdminSectionPage({ params }: { readonly params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === 'hotspots') redirect('/admin/places');
  const config = sections[section as keyof typeof sections];
  if (!config) notFound();
  const session = await requireStaff();
  const [allRows, facultyRows] = await Promise.all([
    listAdminContent(config.kind),
    config.kind === 'programs' || config.kind === 'hotspot_contents'
      ? listAdminContent('faculties')
      : Promise.resolve([])
  ]);
  const managedHotspotIds = new Set(facultyRows.flatMap((row) => row.hotspotId ? [row.hotspotId] : []));
  const rows = config.kind === 'hotspot_contents'
    ? allRows.filter((row) => !managedHotspotIds.has(row.id))
    : allRows;
  const faculties = facultyRows.filter((row) => !row.archivedAt).map((row) => ({
    id: row.id,
    label: `${String((row.draftData.name as { th?: string } | undefined)?.th ?? row.slug ?? row.id)}${row.publishedData ? '' : ' (ฉบับร่าง)'}`
  }));
  return <AdminContentEditor {...config} rows={rows} role={session.role} faculties={faculties} />;
}
