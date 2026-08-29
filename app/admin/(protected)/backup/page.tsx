import AdminBackupManager from '../../../../components/admin/AdminBackupManager';
import { requireAdmin } from '../../../../src/server/auth';

export default async function AdminBackupPage() {
  await requireAdmin();
  return <section className="admin-page"><header className="admin-page__header"><div><p>BACKUP & IMPORT</p><h1>สำรองและนำเข้าข้อมูล</h1><span>สำรองข้อมูลก่อนแก้ชุดใหญ่ และตรวจรายการชนก่อนนำเข้าเสมอ</span></div></header><AdminBackupManager /></section>;
}
