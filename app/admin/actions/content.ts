'use server';

import { z } from 'zod';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { isTourPlaceLink } from '../../../src/tour-places';
import { requireAdmin, requireStaff } from '../../../src/server/auth';
import { syncTourPlaces } from '../../../src/server/tour-place-sync';
import { writeAdminAuditLog } from '../../../src/server/tour-structure-repository';
import {
  AdminActionError,
  actionFailure,
  actionSuccess,
  assertPublishedFaculty,
  contentKindSchema,
  createUniqueSlug,
  formText,
  parseDraftData,
  revalidateAdmin,
  revalidatePublicContent,
  validatePublishData,
  type AdminActionState
} from '../../../src/server/admin-action-shared';

export async function saveContentAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireStaff();
  try {
    const kind = contentKindSchema.parse(formText(formData, 'kind'));
    const id = formText(formData, 'id');
    const supabase = await createServerSupabaseClient();
    let existingDraftData: Record<string, unknown> = {};
    if (kind === 'hotspot_contents') {
      if (!id) throw new AdminActionError('ไม่สามารถเพิ่มตำแหน่งสถานที่สำคัญจาก Admin ได้');
      const { data, error } = await supabase.from('hotspot_contents').select('draft_data').eq('id', id).single();
      if (error) throw error;
      existingDraftData = data.draft_data as Record<string, unknown>;
    }
    const draftData = parseDraftData(kind, formData, existingDraftData);
    if (id) {
      const updatePayload = kind === 'programs'
        ? { draft_data: draftData, faculty_id: z.uuid().parse(formText(formData, 'facultyId')), updated_by: session.userId }
        : { draft_data: draftData, updated_by: session.userId };
      const { error } = await supabase.from(kind).update(updatePayload).eq('id', id);
      if (error) throw error;
    } else {
      if (kind === 'hotspot_contents') throw new AdminActionError('ไม่สามารถเพิ่มตำแหน่งสถานที่สำคัญจาก Admin ได้');
      const slug = await createUniqueSlug(kind, formText(formData, 'slug'), formText(formData, 'nameEn'));
      const base = { slug, draft_data: draftData, created_by: session.userId, updated_by: session.userId };
      const payload = kind === 'programs'
        ? { ...base, faculty_id: z.uuid().parse(formText(formData, 'facultyId')) }
        : base;
      const { error } = await supabase.from(kind).insert(payload);
      if (error) throw error;
    }
    await writeAdminAuditLog({ actorId: session.userId, action: id ? 'save-draft' : 'create-draft', entityKind: kind, entityId: id || undefined });
    revalidateAdmin(kind);
    return actionSuccess(id ? 'บันทึกการแก้ไขเป็นฉบับร่างแล้ว ข้อมูลหน้า Tour ยังไม่เปลี่ยนจนกว่าจะกดอัปเดตข้อมูลที่เผยแพร่' : 'สร้างฉบับร่างใหม่แล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถบันทึกฉบับร่างได้ กรุณาลองอีกครั้ง');
  }
}

export async function publishContentAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(formText(formData, 'kind'));
    const id = formText(formData, 'id');
    const supabase = await createServerSupabaseClient();
    let draftData: unknown;
    if (kind === 'programs') {
      const { data, error } = await supabase.from('programs').select('draft_data,faculty_id').eq('id', id).single();
      if (error) throw error;
      await assertPublishedFaculty(supabase, data.faculty_id);
      draftData = data.draft_data;
    } else if (kind === 'hotspot_contents') {
      const { data, error } = await supabase.from('hotspot_contents').select('draft_data,scene_id').eq('id', id).single();
      if (error) throw error;
      if (!isTourPlaceLink(id, data.scene_id)) throw new AdminActionError('เผยแพร่ไม่ได้ เพราะไม่พบ Scene ID และ Hotspot ID คู่นี้ในโครงสร้างทัวร์');
      draftData = data.draft_data;
    } else {
      const { data, error } = await supabase.from(kind).select('draft_data').eq('id', id).single();
      if (error) throw error;
      draftData = data.draft_data;
    }
    draftData = validatePublishData(kind, draftData);
    const { error } = await supabase.from(kind).update({ published_data: draftData, archived_at: null, updated_by: session.userId }).eq('id', id);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'publish', entityKind: kind, entityId: id });
    revalidateAdmin(kind);
    revalidatePublicContent();
    return actionSuccess('อัปเดตข้อมูลที่เผยแพร่แล้ว หน้า Tour จะใช้ข้อมูลฉบับล่าสุด');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถเผยแพร่ข้อมูลได้ กรุณาลองอีกครั้ง');
  }
}

export async function syncTourPlacesAction(_previousState: AdminActionState, _formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const result = await syncTourPlaces(await createServerSupabaseClient(), session.userId);
    await writeAdminAuditLog({ actorId: session.userId, action: 'sync-tour-places', entityKind: 'tour', summary: { inserted: result.inserted, relinked: result.relinked } });
    revalidateAdmin('hotspot_contents');
    return actionSuccess(result.inserted || result.relinked
      ? `ซิงก์สำเร็จ: เพิ่มสถานที่ใหม่ ${result.inserted} รายการ และอัปเดต Scene ID ${result.relinked} รายการ`
      : 'ข้อมูลสถานที่ตรงกับโครงสร้างทัวร์ล่าสุดแล้ว ไม่มีรายการใหม่');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถซิงก์สถานที่ได้ กรุณาตรวจการเชื่อมต่อ Supabase แล้วลองอีกครั้ง');
  }
}

export async function unpublishContentAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(formText(formData, 'kind'));
    const id = formText(formData, 'id');
    const { error } = await (await createServerSupabaseClient()).from(kind).update({ published_data: null, updated_by: session.userId }).eq('id', id);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'unpublish', entityKind: kind, entityId: id });
    revalidateAdmin(kind);
    revalidatePublicContent();
    return actionSuccess(kind === 'faculties'
      ? 'นำคณะออกจากหน้าเว็บแล้ว หลักสูตรของคณะถูกซ่อนชั่วคราวและจะกลับมาเมื่อเผยแพร่คณะอีกครั้ง'
      : 'นำรายการออกจากหน้าเว็บแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถนำรายการออกจากหน้าเว็บได้ กรุณาลองอีกครั้ง');
  }
}

export async function archiveContentAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(formText(formData, 'kind'));
    const id = formText(formData, 'id');
    const { error } = await (await createServerSupabaseClient()).from(kind).update({ archived_at: new Date().toISOString(), published_data: null, updated_by: session.userId }).eq('id', id);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'archive', entityKind: kind, entityId: id });
    revalidateAdmin(kind);
    revalidatePublicContent();
    return actionSuccess(kind === 'faculties' ? 'เก็บคณะเข้าคลังแล้ว หลักสูตรของคณะถูกซ่อนชั่วคราว' : 'เก็บรายการเข้าคลังแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถเก็บรายการเข้าคลังได้ กรุณาลองอีกครั้ง');
  }
}

export async function restoreContentAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(formText(formData, 'kind'));
    const id = formText(formData, 'id');
    const { error } = await (await createServerSupabaseClient()).from(kind).update({ archived_at: null, updated_by: session.userId }).eq('id', id);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'restore-archive', entityKind: kind, entityId: id });
    revalidateAdmin(kind);
    return actionSuccess('คืนข้อมูลจากคลังแล้ว กรุณากดเผยแพร่เมื่อตรวจสอบฉบับร่างเรียบร้อย');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถคืนข้อมูลจากคลังได้ กรุณาลองอีกครั้ง');
  }
}

export async function deleteContentAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(formText(formData, 'kind'));
    const supabase = await createServerSupabaseClient();
    const id = formText(formData, 'id');
    const { data, error: readError } = await supabase.from(kind).select('archived_at').eq('id', id).single();
    if (readError) throw readError;
    if (!data.archived_at) throw new AdminActionError('ต้องเก็บรายการเข้าคลังก่อนจึงจะลบถาวรได้');
    if (kind === 'faculties') {
      const { count, error: countError } = await supabase.from('programs').select('id', { count: 'exact', head: true }).eq('faculty_id', id);
      if (countError) throw countError;
      if ((count ?? 0) > 0) throw new AdminActionError(`ยังลบคณะไม่ได้ เนื่องจากมีหลักสูตรอ้างอิงอยู่ ${count} รายการ กรุณาย้ายหรือลบหลักสูตรก่อน`);
    }
    const { error } = await supabase.from(kind).delete().eq('id', id);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'delete', entityKind: kind, entityId: id });
    revalidateAdmin(kind);
    revalidatePublicContent();
    return actionSuccess('ลบรายการถาวรแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถลบรายการได้ กรุณาลองอีกครั้ง');
  }
}

export async function restoreContentRevisionAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireStaff();
  try {
    const kind = contentKindSchema.parse(formText(formData, 'kind'));
    const id = formText(formData, 'id');
    const revisionId = z.uuid().parse(formText(formData, 'revisionId'));
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('content_revisions').select('snapshot').eq('id', revisionId).eq('entity_kind', kind).eq('entity_id', id).single();
    if (error) throw error;
    const snapshot = data.snapshot as Record<string, unknown>;
    const draftData = validatePublishData(kind, snapshot.draft_data);
    const payload: Record<string, unknown> = { draft_data: draftData, updated_by: session.userId };
    if (kind === 'programs' && typeof snapshot.faculty_id === 'string') payload.faculty_id = snapshot.faculty_id;
    const result = await supabase.from(kind).update(payload).eq('id', id);
    if (result.error) throw result.error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'restore-revision-to-draft', entityKind: kind, entityId: id, summary: { revisionId } });
    revalidateAdmin(kind);
    return actionSuccess('กู้คืนเวอร์ชันนี้เป็นฉบับร่างแล้ว ข้อมูลที่เผยแพร่ยังไม่เปลี่ยน');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถกู้คืนประวัติได้ กรุณารัน Migration ล่าสุดและลองอีกครั้ง');
  }
}
