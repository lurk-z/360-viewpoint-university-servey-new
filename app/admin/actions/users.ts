'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminSupabaseClient } from '../../../lib/supabase/admin';
import { requireAdmin } from '../../../src/server/auth';
import { writeAdminAuditLog } from '../../../src/server/tour-structure-repository';
import {
  AdminActionError,
  actionFailure,
  actionSuccess,
  formText,
  type AdminActionState
} from '../../../src/server/admin-action-shared';

export async function inviteUserAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const email = z.email().parse(formText(formData, 'email'));
    const role = z.enum(['admin', 'editor']).parse(formText(formData, 'role'));
    const displayName = formText(formData, 'displayName');
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error || !data.user) throw error ?? new Error('Unable to invite user');
    const { error: profileError } = await admin.from('admin_profiles').upsert({ user_id: data.user.id, display_name: displayName, role });
    if (profileError) throw profileError;
    await writeAdminAuditLog({ actorId: session.userId, action: 'invite-user', entityKind: 'user', entityId: data.user.id, summary: { role } });
    revalidatePath('/admin/users');
    return actionSuccess('ส่งคำเชิญผู้ใช้งานแล้ว');
  } catch (error) {
    return actionFailure(error, 'ส่งคำเชิญไม่สำเร็จ กรุณาตรวจอีเมลและลองอีกครั้ง');
  }
}

export async function changeUserRoleAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const userId = z.uuid().parse(formText(formData, 'userId'));
    const role = z.enum(['admin', 'editor']).parse(formText(formData, 'role'));
    if (userId === session.userId && role !== 'admin') throw new AdminActionError('ไม่สามารถลดสิทธิ์ Admin ของบัญชีที่กำลังใช้งานอยู่ได้');
    const { error } = await createAdminSupabaseClient().from('admin_profiles').update({ role }).eq('user_id', userId);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'change-user-role', entityKind: 'user', entityId: userId, summary: { role } });
    revalidatePath('/admin/users');
    return actionSuccess('บันทึกสิทธิ์ผู้ใช้งานแล้ว');
  } catch (error) {
    return actionFailure(error, 'บันทึกสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง');
  }
}
