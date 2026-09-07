import type { ReactNode } from 'react';
import { requireStaff } from '../../../src/server/auth';
import { logoutAction } from '../actions/auth';
import AdminLiveRefresh from '../../../components/admin/AdminLiveRefresh';
import AdminNavigation from '../../../components/admin/AdminNavigation';
import AdminToastRegion from '../../../components/admin/AdminToastRegion';

export const dynamic = 'force-dynamic';

const links = [
  ['ภาพรวม', '/admin'],
  ['คณะ', '/admin/faculties'],
  ['หลักสูตร', '/admin/programs'],
  ['กิจกรรม', '/admin/activities'],
  ['สถานที่สำคัญ', '/admin/places'],
  ['โครงสร้างทัวร์', '/admin/tour'],
  ['Media', '/admin/media'],
  ['สถานะระบบ', '/admin/system'],
  ['ความสัมพันธ์', '/admin/relationships'],
  ['คู่มือ', '/admin/help']
] as const;

export default async function ProtectedAdminLayout({ children }: { readonly children: ReactNode }) {
  const session = await requireStaff();
  const navigationLinks = session.role === 'admin'
    ? [...links,
      ['สำรองข้อมูล', '/admin/backup'] as const,
      ['ประวัติระบบ', '/admin/audit'] as const,
      ['ผู้ใช้งาน', '/admin/users'] as const]
    : links;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin"><img src="/mainimages/Logo_FitM/FITM_LOGO.png" alt="FITM" width={200} height={117} /><span>Tour CMS</span></a>
        <AdminNavigation links={navigationLinks} />
        <footer>
          <span>{session.displayName || session.email}</span>
          <strong>{session.role === 'admin' ? 'Admin' : 'Editor'}</strong>
          <form action={logoutAction}><button type="submit">ออกจากระบบ</button></form>
          <a href="/?preview=admin" target="_blank">เปิดหน้าทัวร์แบบสด ↗</a>
        </footer>
      </aside>
      <main className="admin-main"><AdminLiveRefresh>{children}</AdminLiveRefresh><AdminToastRegion /></main>
    </div>
  );
}
