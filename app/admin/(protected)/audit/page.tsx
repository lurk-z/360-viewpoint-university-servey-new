import { redirect } from 'next/navigation';
import { listAdminAuditLog } from '../../../../src/server/admin-repository';
import { requireStaff } from '../../../../src/server/auth';

export default async function AdminAuditPage() {
  const session = await requireStaff();
  if (session.role !== 'admin') redirect('/admin');
  const rows = await listAdminAuditLog();
  return <section className="admin-page"><header className="admin-page__header"><div><p>AUDIT LOG</p><h1>ประวัติการทำงานของระบบ</h1><span>แสดงชนิดงาน เวลา และรายการที่เกี่ยวข้อง โดยไม่เก็บข้อความสนทนาหรือ Secret</span></div></header>
    <div className="admin-audit-list">{rows.length ? rows.map((row) => <article key={row.id}><time>{new Date(row.createdAt).toLocaleString('th-TH')}</time><strong>{row.action}</strong><span>{row.entityKind}{row.entityId ? ` · ${row.entityId}` : ''}</span><details><summary>รายละเอียด</summary><pre>{JSON.stringify(row.summary, null, 2)}</pre></details></article>) : <p>ยังไม่มีประวัติ หรือยังไม่ได้รัน Migration ล่าสุด</p>}</div>
  </section>;
}
