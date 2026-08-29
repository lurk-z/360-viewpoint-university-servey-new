import { listAdminContent } from '../../../../src/server/admin-repository';
import { requireStaff } from '../../../../src/server/auth';
import { getTourPlaceDefinitions } from '../../../../src/tour-places';

function label(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return value && typeof value === 'object' ? String((value as { th?: unknown }).th ?? '') : '';
}

export default async function AdminRelationshipsPage() {
  await requireStaff();
  const [faculties, programs, places] = await Promise.all([
    listAdminContent('faculties'), listAdminContent('programs'), listAdminContent('hotspot_contents')
  ]);
  const infoById = new Map(getTourPlaceDefinitions().map((item) => [item.id, item.sceneId]));
  return <section className="admin-page"><header className="admin-page__header"><div><p>RELATIONSHIPS</p><h1>ความสัมพันธ์ของข้อมูล</h1><span>ดูว่าคณะ หลักสูตร ฉาก และ Info เชื่อมกันอย่างไร</span></div></header>
    <div className="admin-relationship-grid">
      <section><h2>คณะ → หลักสูตร</h2>{faculties.map((faculty) => { const children = programs.filter((program) => program.facultyId === faculty.id); return <article key={faculty.id}><strong>{label(faculty.draftData, 'name') || faculty.slug}</strong><span>{children.length} หลักสูตร</span><a href={`/admin/programs?faculty=${encodeURIComponent(faculty.id)}`}>เปิดรายการ →</a></article>; })}</section>
      <section><h2>ฉาก → Info</h2>{places.map((place) => <article key={place.id}><strong>{label(place.draftData, 'title') || place.id}</strong><code>{place.id}</code><span>ฉาก: {infoById.get(place.id) ?? 'ไม่พบในทัวร์'}</span><a href="/admin/places">เปิดสถานที่ →</a></article>)}</section>
    </div>
  </section>;
}
