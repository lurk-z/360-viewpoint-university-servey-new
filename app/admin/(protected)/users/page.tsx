import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '../../../../lib/supabase/admin';
import { requireStaff } from '../../../../src/server/auth';
import { changeUserRoleAction, inviteUserAction } from '../../actions';

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
      <form action={inviteUserAction} className="admin-invite">
        <label><span>ชื่อที่แสดง</span><input name="displayName" required /></label>
        <label><span>อีเมล</span><input name="email" type="email" required /></label>
        <label><span>บทบาท</span><select name="role" defaultValue="editor"><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
        <button className="admin-button" type="submit">ส่งคำเชิญ</button>
      </form>
      <div className="admin-user-list">
        {profileRows.map((profile) => {
          const authUser = authData.users.find((user) => user.id === profile.user_id);
          return (
            <article key={profile.user_id}>
              <div><strong>{profile.display_name || authUser?.email || 'ไม่ระบุชื่อ'}</strong><span>{authUser?.email}</span></div>
              <form action={changeUserRoleAction}>
                <input type="hidden" name="userId" value={profile.user_id} />
                <select name="role" defaultValue={profile.role} aria-label={`บทบาท ${authUser?.email ?? profile.user_id}`}>
                  <option value="editor">Editor</option><option value="admin">Admin</option>
                </select>
                <button className="admin-button admin-button--secondary" type="submit">บันทึกสิทธิ์</button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
