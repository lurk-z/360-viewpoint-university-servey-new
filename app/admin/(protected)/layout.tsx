import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireStaff } from '../../../src/server/auth';
import { logoutAction } from '../actions';

export const dynamic = 'force-dynamic';

const links = [
  ['ภาพรวม', '/admin'],
  ['คณะ', '/admin/faculties'],
  ['หลักสูตร', '/admin/programs'],
  ['กิจกรรม', '/admin/activities'],
  ['สถานที่สำคัญ', '/admin/places'],
  ['Media', '/admin/media']
] as const;

export default async function ProtectedAdminLayout({ children }: { readonly children: ReactNode }) {
  const session = await requireStaff();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin"><img src="/mainimages/Logo_FitM/FITM_LOGO.png" alt="FITM" width={200} height={117} /><span>Tour CMS</span></a>
        <nav aria-label="เมนูผู้ดูแล">
          {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          {session.role === 'admin' ? <Link href="/admin/users">ผู้ใช้งาน</Link> : null}
        </nav>
        <footer>
          <span>{session.displayName || session.email}</span>
          <strong>{session.role === 'admin' ? 'Admin' : 'Editor'}</strong>
          <form action={logoutAction}><button type="submit">ออกจากระบบ</button></form>
          <a href="/" target="_blank">เปิดหน้าทัวร์ ↗</a>
        </footer>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
