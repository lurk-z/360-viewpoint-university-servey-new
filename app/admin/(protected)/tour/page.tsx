import AdminTourEditor from '../../../../components/admin/AdminTourEditor';
import { requireStaff } from '../../../../src/server/auth';
import {
  getAdminTourProject,
  listTourAssets,
  listTourRevisions
} from '../../../../src/server/tour-structure-repository';

export default async function AdminTourPage() {
  const session = await requireStaff();
  const [project, revisions, assets] = await Promise.all([
    getAdminTourProject(), listTourRevisions(), listTourAssets()
  ]);
  return <section className="admin-page admin-page--tour">
    <header className="admin-page__header"><div><p>VISUAL TOUR EDITOR</p><h1>โครงสร้างทัวร์ 360</h1><span>จัดการฉาก ปุ่ม Info และพิกัดแผนที่ ส่วนลูกศรนำทางแก้จาก VS Code</span></div></header>
    {!project.installed ? <div className="admin-warning-card"><h2>ยังไม่ได้นำโครงสร้างทัวร์เข้าฐานข้อมูล</h2><p>ไปหน้า “สถานะระบบ” แล้วกดนำ 123 ฉากเข้าระบบก่อน</p><a href="/admin/system">เปิดสถานะระบบ →</a></div> : <AdminTourEditor initialData={project.draft} draftVersion={project.draftVersion} publishedVersion={project.publishedVersion} role={session.role} revisions={revisions} initialAssets={assets} />}
  </section>;
}
