'use client';

import { useActionState } from 'react';
import { changeUserRoleAction, inviteUserAction, type AdminActionState } from '../../app/admin/actions';
import { useAdminActionRefresh } from './useAdminActionRefresh';

const initialState: AdminActionState = { status: 'idle', message: '' };

function RoleForm({ profile }: { readonly profile: { userId: string; email: string; displayName: string; role: 'admin' | 'editor' } }) {
  const [state, action, pending] = useActionState(changeUserRoleAction, initialState);
  useAdminActionRefresh(state, { scope: 'draft', kind: 'media', id: profile.userId });
  return <article><div><strong>{profile.displayName || profile.email || 'ไม่ระบุชื่อ'}</strong><span>{profile.email}</span></div><form action={action}>
    <input type="hidden" name="userId" value={profile.userId} /><select name="role" defaultValue={profile.role} aria-label={`บทบาท ${profile.email}`}><option value="editor">Editor</option><option value="admin">Admin</option></select>
    <button className="admin-button admin-button--secondary" type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึกสิทธิ์'}</button>
    {state.message ? <p className={`admin-action-message is-${state.status}`}>{state.message}</p> : null}
  </form></article>;
}

export default function AdminUserManagement({ profiles }: { readonly profiles: readonly { userId: string; email: string; displayName: string; role: 'admin' | 'editor' }[] }) {
  const [state, action, pending] = useActionState(inviteUserAction, initialState);
  useAdminActionRefresh(state, { scope: 'draft', kind: 'media' });
  return <><form action={action} className="admin-invite"><label><span>ชื่อที่แสดง</span><input name="displayName" required /></label><label><span>อีเมล</span><input name="email" type="email" required /></label><label><span>บทบาท</span><select name="role" defaultValue="editor"><option value="editor">Editor</option><option value="admin">Admin</option></select></label><button className="admin-button" type="submit" disabled={pending}>{pending ? 'กำลังส่ง…' : 'ส่งคำเชิญ'}</button>{state.message ? <p className={`admin-action-message is-${state.status}`}>{state.message}</p> : null}</form>
    <div className="admin-user-list">{profiles.map((profile) => <RoleForm profile={profile} key={profile.userId} />)}</div></>;
}
