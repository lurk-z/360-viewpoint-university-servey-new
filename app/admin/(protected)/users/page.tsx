import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '../../../../lib/supabase/admin';
import { requireStaff } from '../../../../src/server/auth';
import AdminUserManagement from '../../../../components/admin/AdminUserManagement';

interface ProfileRow {
  readonly user_id: string;
  readonly display_name: string;
  readonly role: 'admin' | 'editor';
}

export default async function AdminUsersPage() {
  const session = await requireStaff();
  if (session.role !== 'admin') redirect('/admin');
  const supabase = createAdminSupabaseClient();
  const [{ data: authData }, { data: profiles }] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
    supabase.from('admin_profiles').select('user_id,display_name,role').order('created_at')
  ]);
  const profileRows = (profiles ?? []) as ProfileRow[];

  return (
    <section className="admin-page">
      <header className="admin-page__header"><div><p>ACCESS CONTROL</p><h1>ผู้ใช้งานระบบ</h1><span>เฉพาะบัญชีที่ได้รับคำเชิญและมี role เท่านั้นที่เข้า Admin ได้</span></div></header>
      <AdminUserManagement profiles={profileRows.map((profile) => {
        const authUser = authData.users.find((user) => user.id === profile.user_id);
        return { userId: profile.user_id, displayName: profile.display_name, email: authUser?.email ?? '', role: profile.role };
      })} />
    </section>
  );
}
