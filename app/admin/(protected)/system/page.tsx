import AdminSystemOnboarding from '../../../../components/admin/AdminSystemOnboarding';
import { getAdminSystemStatus, getAdminTaskSummary } from '../../../../src/server/admin-repository';
import { getAdminDashboardSummary } from '../../../../src/server/admin-repository';
import { getAiConfigurationStatus } from '../../../../src/server/ai-status';
import { requireStaff } from '../../../../src/server/auth';
import AdminAiStatus from '../../../../components/admin/AdminAiStatus';

export default async function AdminSystemPage() {
  const [session, status, tasks, aiStatus, summary] = await Promise.all([
    requireStaff(),
    getAdminSystemStatus(),
    getAdminTaskSummary(),
    getAiConfigurationStatus(),
    getAdminDashboardSummary()
  ]);
  return (
    <section className="admin-page">
      <header className="admin-page__header"><div><p>SYSTEM STATUS</p><h1>สถานะและการตั้งค่าระบบ</h1><span>ตรวจสิ่งที่ต้องเตรียมโดยไม่แสดงรหัสลับ</span></div></header>
      <AdminSystemOnboarding status={status} tasks={tasks} role={session.role} />
      <AdminAiStatus status={aiStatus} publishedFaculties={summary.publishedFaculties} publishedPrograms={summary.publishedPrograms} />
      <section className="admin-help-card">
        <h2>ตรวจจาก Terminal</h2>
        <p>หากเปิดโปรเจกต์ในเครื่อง ให้รัน <code>npm run doctor</code> เพื่อเช็ก Node.js, พอร์ต, ไฟล์ Panorama และฐานข้อมูลพร้อมกัน</p>
      </section>
    </section>
  );
}
