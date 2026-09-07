'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { createAdminSupabaseClient } from '../../../lib/supabase/admin';
import { PUBLIC_CONTENT_CACHE_TAG } from '../../../src/server/content-repository';
import { requireAdmin, requireStaff } from '../../../src/server/auth';
import {
  bootstrapTourProject,
  getAdminTourProject,
  TOUR_PROJECT_ID,
  TOUR_STRUCTURE_CACHE_TAG,
  writeAdminAuditLog
} from '../../../src/server/tour-structure-repository';
import { preserveCurrentNavigation } from '../../../src/tour-navigation-sync';
import { analyzeTourStructure, tourStructureDataSchema } from '../../../src/tour-structure';
import {
  AdminActionError,
  actionFailure,
  actionSuccess,
  formText,
  type AdminActionState
} from '../../../src/server/admin-action-shared';

export async function bootstrapTourStructureAction(_previousState: AdminActionState, _formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const result = await bootstrapTourProject(session.userId);
    updateTag(TOUR_STRUCTURE_CACHE_TAG);
    revalidatePath('/admin');
    revalidatePath('/admin/system');
    revalidatePath('/admin/tour');
    await writeAdminAuditLog({ actorId: session.userId, action: 'bootstrap-tour-structure', entityKind: 'tour', entityId: 'main' });
    return actionSuccess(result.created
      ? 'นำ 130 ฉากเข้า Visual Tour Editor แล้ว โดยไม่เปลี่ยนหน้า Tour สาธารณะ'
      : 'โครงสร้างทัวร์ถูกนำเข้าไว้แล้ว ไม่มีข้อมูลถูกเขียนทับ');
  } catch (error) {
    return actionFailure(error, 'ยังนำเข้าโครงสร้างทัวร์ไม่ได้ กรุณารัน Migration 202608290001 ก่อน');
  }
}

async function syncInfoGeometryFromStructure(structure: z.infer<typeof tourStructureDataSchema>, userId: string): Promise<number> {
  const admin = createAdminSupabaseClient();
  const definitions = structure.scenes.filter((scene) => !scene.archived).flatMap((scene) => scene.hotspots
    .filter((hotspot) => hotspot.type === 'info')
    .map((hotspot) => ({ id: hotspot.id, sceneId: scene.id, scene })));
  if (!definitions.length) return 0;
  const { data, error } = await admin.from('hotspot_contents').select('id,scene_id').in('id', definitions.map((definition) => definition.id));
  if (error) throw error;
  const existing = new Map((data ?? []).map((row) => [String(row.id), String(row.scene_id)]));
  const missing = definitions.filter((definition) => !existing.has(definition.id));
  if (missing.length) {
    const { error: insertError } = await admin.from('hotspot_contents').insert(missing.map((definition) => ({
      id: definition.id,
      scene_id: definition.sceneId,
      draft_data: {
        title: { th: 'ข้อมูลสถานที่', en: 'Place information' },
        description: { th: 'กรุณากรอกรายละเอียดของสถานที่นี้ก่อนเผยแพร่', en: 'Please complete this place information before publishing.' },
        sceneTitle: definition.scene.title,
        sceneDescription: definition.scene.description,
        reference: { label: { th: '', en: '' } },
        images: []
      },
      published_data: null,
      created_by: userId,
      updated_by: userId
    })));
    if (insertError) throw insertError;
  }
  for (const definition of definitions) {
    const previousSceneId = existing.get(definition.id);
    if (previousSceneId && previousSceneId !== definition.sceneId) {
      const { error: updateError } = await admin.from('hotspot_contents').update({ scene_id: definition.sceneId, updated_by: userId }).eq('id', definition.id);
      if (updateError) throw updateError;
    }
  }
  return missing.length;
}

export async function saveTourStructureAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireStaff();
  try {
    const submittedStructure = tourStructureDataSchema.parse(JSON.parse(formText(formData, 'structure')));
    const expectedVersion = z.coerce.number().int().positive().parse(formText(formData, 'draftVersion'));
    const current = await getAdminTourProject();
    if (!current.installed) throw new AdminActionError('กรุณานำโครงสร้างเดิมเข้าระบบก่อน');
    if (current.draftVersion !== expectedVersion) throw new AdminActionError('มีผู้ใช้อื่นบันทึกโครงสร้างหลังจากคุณเปิดหน้านี้ กรุณาโหลดข้อมูลล่าสุดแล้วตรวจอีกครั้ง');
    const structure = preserveCurrentNavigation(submittedStructure, current.draft);
    const nextVersion = current.draftVersion + 1;
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from('tour_projects').update({
      draft_data: structure, draft_version: nextVersion, updated_by: session.userId
    }).eq('id', TOUR_PROJECT_ID).eq('draft_version', expectedVersion).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new AdminActionError('ไม่สามารถบันทึกได้เพราะเวอร์ชันเปลี่ยน กรุณาโหลดข้อมูลล่าสุด');
    await admin.from('tour_revisions').insert({
      project_id: TOUR_PROJECT_ID, action: 'save', snapshot: structure, version: nextVersion, created_by: session.userId
    });
    const insertedPlaces = await syncInfoGeometryFromStructure(structure, session.userId);
    await writeAdminAuditLog({
      actorId: session.userId, action: 'save-tour-draft', entityKind: 'tour', entityId: TOUR_PROJECT_ID,
      summary: { version: nextVersion, scenes: structure.scenes.length, insertedPlaces }
    });
    revalidatePath('/admin/tour');
    revalidatePath('/admin/places');
    return actionSuccess(`บันทึกโครงสร้างฉบับร่างเวอร์ชัน ${nextVersion} แล้ว${insertedPlaces ? ` และสร้างสถานที่รอกรอก ${insertedPlaces} รายการ` : ''}`);
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถบันทึกโครงสร้างทัวร์ได้ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง');
  }
}

export async function publishTourStructureAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const expectedVersion = z.coerce.number().int().positive().parse(formText(formData, 'draftVersion'));
    const current = await getAdminTourProject();
    if (!current.installed || current.draftVersion !== expectedVersion) throw new AdminActionError('โครงสร้างในหน้าจอไม่ใช่เวอร์ชันล่าสุด กรุณาโหลดข้อมูลล่าสุด');
    const structure = tourStructureDataSchema.parse(current.draft);
    const blocking = analyzeTourStructure(structure).filter((issue) => issue.severity === 'error');
    if (blocking.length) throw new AdminActionError(`ยังเผยแพร่ไม่ได้: ${blocking.slice(0, 3).map((issue) => issue.message).join(' · ')}`);
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from('tour_projects').update({
      published_data: structure, published_version: current.draftVersion, updated_by: session.userId
    }).eq('id', TOUR_PROJECT_ID).eq('draft_version', expectedVersion);
    if (error) throw error;
    await admin.from('tour_revisions').insert({
      project_id: TOUR_PROJECT_ID, action: 'publish', snapshot: structure, version: current.draftVersion, created_by: session.userId
    });
    await writeAdminAuditLog({
      actorId: session.userId, action: 'publish-tour', entityKind: 'tour', entityId: TOUR_PROJECT_ID,
      summary: { version: current.draftVersion, scenes: structure.scenes.length }
    });
    updateTag(TOUR_STRUCTURE_CACHE_TAG);
    updateTag(PUBLIC_CONTENT_CACHE_TAG);
    revalidatePath('/');
    revalidatePath('/admin/tour');
    return actionSuccess(`เผยแพร่โครงสร้างทัวร์เวอร์ชัน ${current.draftVersion} แล้ว`);
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถเผยแพร่โครงสร้างทัวร์ได้ กรุณาตรวจรายการปัญหาแล้วลองอีกครั้ง');
  }
}

export async function restoreTourRevisionAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const revisionId = z.uuid().parse(formText(formData, 'revisionId'));
    const admin = createAdminSupabaseClient();
    const [{ data: revision, error }, current] = await Promise.all([
      admin.from('tour_revisions').select('snapshot').eq('id', revisionId).eq('project_id', TOUR_PROJECT_ID).single(),
      getAdminTourProject()
    ]);
    if (error) throw error;
    const restoredStructure = tourStructureDataSchema.parse(revision.snapshot);
    const structure = preserveCurrentNavigation(restoredStructure, current.draft);
    const nextVersion = current.draftVersion + 1;
    const { error: updateError } = await admin.from('tour_projects').update({
      draft_data: structure, draft_version: nextVersion, updated_by: session.userId
    }).eq('id', TOUR_PROJECT_ID);
    if (updateError) throw updateError;
    await admin.from('tour_revisions').insert({
      project_id: TOUR_PROJECT_ID, action: 'restore', snapshot: structure, version: nextVersion, created_by: session.userId
    });
    await writeAdminAuditLog({
      actorId: session.userId, action: 'restore-tour-revision', entityKind: 'tour', entityId: TOUR_PROJECT_ID,
      summary: { revisionId, version: nextVersion }
    });
    revalidatePath('/admin/tour');
    return actionSuccess(`กู้คืนเป็นฉบับร่างเวอร์ชัน ${nextVersion} แล้ว หน้าเว็บสาธารณะยังไม่เปลี่ยน`);
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถกู้คืนเวอร์ชันโครงสร้างทัวร์ได้');
  }
}
