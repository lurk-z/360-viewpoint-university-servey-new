'use server';

import { revalidatePath } from 'next/cache';
import { createAdminSupabaseClient } from '../../../lib/supabase/admin';
import { requireAdmin } from '../../../src/server/auth';
import { getMediaUsageIndex } from '../../../src/server/media-usage';
import { writeAdminAuditLog } from '../../../src/server/tour-structure-repository';
import {
  AdminActionError,
  actionFailure,
  actionSuccess,
  formText,
  type AdminActionState
} from '../../../src/server/admin-action-shared';

export async function deleteMediaAction(formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const path = formText(formData, 'path');
    if (!path || path.includes('..')) throw new AdminActionError('ชื่อไฟล์ไม่ถูกต้อง');
    const admin = createAdminSupabaseClient();
    const publicUrl = admin.storage.from('content-media').getPublicUrl(path).data.publicUrl;
    const usage = (await getMediaUsageIndex([{ path, publicUrl }]))[path] ?? [];
    if (usage.length) throw new AdminActionError(`ยังลบรูปไม่ได้ เนื่องจากมีข้อมูลอ้างอิงรูปนี้อยู่ ${usage.length} รายการ`);
    const { error } = await admin.storage.from('content-media').remove([path]);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'delete-media', entityKind: 'media', entityId: path });
    revalidatePath('/admin/media');
    return actionSuccess('ลบรูปแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถลบรูปได้ กรุณาลองอีกครั้ง');
  }
}
