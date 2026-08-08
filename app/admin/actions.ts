'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../lib/supabase/env';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import {
  activityDataSchema,
  facultyDataSchema,
  hotspotDataSchema,
  programDataSchema,
  type ContentKind
} from '../../src/content';
import { requireAdmin, requireStaff } from '../../src/server/auth';
import { syncTourPlaces } from '../../src/server/tour-place-sync';
import { isTourPlaceLink } from '../../src/tour-places';
import { getMediaUsageIndex } from '../../src/server/media-usage';

const contentKindSchema = z.enum(['faculties', 'programs', 'activities', 'hotspot_contents']);
const slugSchema = z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export interface AdminActionState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
}

class AdminActionError extends Error {}

function actionSuccess(message: string): AdminActionState {
  return { status: 'success', message };
}

function actionFailure(error: unknown, fallback: string): AdminActionState {
  if (error instanceof AdminActionError) return { status: 'error', message: error.message };
  if (error instanceof z.ZodError) {
    return { status: 'error', message: 'กรุณาตรวจสอบข้อมูลบังคับภาษาไทยและอังกฤษ รูปภาพ แหล่งอ้างอิง รูปแบบ URL และ Slug ให้ครบถ้วน' };
  }
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === '23505') return { status: 'error', message: 'Slug นี้ถูกใช้งานแล้ว กรุณาใช้ Slug อื่น' };
  console.error('Admin content action failed', error);
  return { status: 'error', message: fallback };
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function sourceFromForm(formData: FormData) {
  return {
    label: { th: text(formData, 'sourceLabelTh'), en: text(formData, 'sourceLabelEn') },
    url: text(formData, 'sourceUrl')
  };
}

function imagesFromForm(formData: FormData) {
  const sources = formData.getAll('imageSrc').map((value) => String(value).trim());
  const altTh = formData.getAll('imageAltTh').map((value) => String(value).trim());
  const altEn = formData.getAll('imageAltEn').map((value) => String(value).trim());
  const captionTh = formData.getAll('imageCaptionTh').map((value) => String(value).trim());
  const captionEn = formData.getAll('imageCaptionEn').map((value) => String(value).trim());
  return sources.map((src, index) => ({
    src,
    alt: { th: altTh[index] ?? '', en: altEn[index] ?? '' },
    ...((captionTh[index] || captionEn[index]) ? {
      caption: { th: captionTh[index] ?? '', en: captionEn[index] ?? '' }
    } : {})
  }));
}

function parseDraftData(kind: ContentKind, formData: FormData): Record<string, unknown> {
  if (kind === 'faculties') {
    return facultyDataSchema.parse({
      name: { th: text(formData, 'nameTh'), en: text(formData, 'nameEn') },
      summary: { th: text(formData, 'summaryTh'), en: text(formData, 'summaryEn') },
      description: { th: text(formData, 'descriptionTh'), en: text(formData, 'descriptionEn') },
      images: imagesFromForm(formData),
      source: sourceFromForm(formData)
    });
  }
  if (kind === 'programs') {
    return programDataSchema.parse({
      name: { th: text(formData, 'nameTh'), en: text(formData, 'nameEn') },
      level: { th: text(formData, 'levelTh'), en: text(formData, 'levelEn') },
      summary: { th: text(formData, 'summaryTh'), en: text(formData, 'summaryEn') },
      description: { th: text(formData, 'descriptionTh'), en: text(formData, 'descriptionEn') },
      admission: { th: text(formData, 'admissionTh'), en: text(formData, 'admissionEn') },
      imageUrl: text(formData, 'imageUrl'),
      source: sourceFromForm(formData)
    });
  }
  if (kind === 'activities') {
    return activityDataSchema.parse({
      title: { th: text(formData, 'nameTh'), en: text(formData, 'nameEn') },
      summary: { th: text(formData, 'summaryTh'), en: text(formData, 'summaryEn') },
      description: { th: text(formData, 'descriptionTh'), en: text(formData, 'descriptionEn') },
      startDate: text(formData, 'startDate'),
      endDate: text(formData, 'endDate'),
      sceneId: text(formData, 'sceneId'),
      imageUrl: text(formData, 'imageUrl'),
      source: sourceFromForm(formData)
    });
  }

  return hotspotDataSchema.parse({
    title: { th: text(formData, 'nameTh'), en: text(formData, 'nameEn') },
    description: { th: text(formData, 'descriptionTh'), en: text(formData, 'descriptionEn') },
    sceneTitle: { th: text(formData, 'sceneTitleTh'), en: text(formData, 'sceneTitleEn') },
    sceneDescription: { th: text(formData, 'sceneDescriptionTh'), en: text(formData, 'sceneDescriptionEn') },
    reference: sourceFromForm(formData),
    images: imagesFromForm(formData)
  });
}

function validatePublishData(kind: ContentKind, value: unknown): Record<string, unknown> {
  if (kind === 'faculties') return facultyDataSchema.parse(value);
  if (kind === 'programs') return programDataSchema.parse(value);
  if (kind === 'activities') return activityDataSchema.parse(value);
  return hotspotDataSchema.parse(value);
}

function revalidateAdmin(kind?: ContentKind): void {
  revalidatePath('/');
  revalidatePath('/admin');
  if (kind) revalidatePath(`/admin/${kind === 'hotspot_contents' ? 'places' : kind}`);
}

async function assertPublishedFaculty(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  facultyId: string
): Promise<void> {
  const { data, error } = await supabase.from('faculties')
    .select('id')
    .eq('id', facultyId)
    .is('archived_at', null)
    .not('published_data', 'is', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AdminActionError('ต้องเผยแพร่คณะที่สังกัดก่อน จึงจะเผยแพร่หลักสูตรนี้ได้');
}

export async function loginAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect('/admin/login?error=configuration');
  const email = text(formData, 'email');
  const password = text(formData, 'password');
  const nextPath = text(formData, 'next');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/admin/login?error=credentials');
  redirect(nextPath.startsWith('/admin') && !nextPath.startsWith('//') ? nextPath : '/admin');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function saveContentAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireStaff();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const id = text(formData, 'id');
    const draftData = parseDraftData(kind, formData);
    const supabase = await createServerSupabaseClient();

    if (id) {
      const updatePayload = kind === 'programs'
        ? {
          draft_data: draftData,
          faculty_id: z.uuid().parse(text(formData, 'facultyId')),
          updated_by: session.userId
        }
        : {
          draft_data: draftData,
          updated_by: session.userId
        };
      const { error } = await supabase.from(kind).update(updatePayload).eq('id', id);
      if (error) throw error;
    } else {
      if (kind === 'hotspot_contents') throw new AdminActionError('ไม่สามารถเพิ่มตำแหน่งสถานที่สำคัญจาก Admin ได้');
      const slug = slugSchema.parse(text(formData, 'slug'));
      const base = {
        slug,
        draft_data: draftData,
        created_by: session.userId,
        updated_by: session.userId
      };
      const payload = kind === 'programs'
        ? { ...base, faculty_id: z.uuid().parse(text(formData, 'facultyId')) }
        : base;
      const { error } = await supabase.from(kind).insert(payload);
      if (error) throw error;
    }
    revalidateAdmin(kind);
    return actionSuccess(id ? 'บันทึกการแก้ไขเป็นฉบับร่างแล้ว ข้อมูลหน้า Tour ยังไม่เปลี่ยนจนกว่าจะกดอัปเดตข้อมูลที่เผยแพร่' : 'สร้างฉบับร่างใหม่แล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถบันทึกฉบับร่างได้ กรุณาลองอีกครั้ง');
  }
}

export async function publishContentAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const id = text(formData, 'id');
    const supabase = await createServerSupabaseClient();
    let draftData: unknown;
    if (kind === 'programs') {
      const { data, error } = await supabase.from('programs')
        .select('draft_data,faculty_id')
        .eq('id', id)
        .single();
      if (error) throw error;
      await assertPublishedFaculty(supabase, data.faculty_id);
      draftData = data.draft_data;
    } else if (kind === 'hotspot_contents') {
      const { data, error } = await supabase.from('hotspot_contents')
        .select('draft_data,scene_id')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!isTourPlaceLink(id, data.scene_id)) {
        throw new AdminActionError('เผยแพร่ไม่ได้ เพราะไม่พบ Scene ID และ Hotspot ID คู่นี้ในโครงสร้างทัวร์');
      }
      draftData = data.draft_data;
    } else {
      const { data, error } = await supabase.from(kind).select('draft_data').eq('id', id).single();
      if (error) throw error;
      draftData = data.draft_data;
    }
    draftData = validatePublishData(kind, draftData);
    const { error } = await supabase.from(kind).update({
      published_data: draftData,
      archived_at: null,
      updated_by: session.userId
    }).eq('id', id);
    if (error) throw error;
    revalidateAdmin(kind);
    return actionSuccess('อัปเดตข้อมูลที่เผยแพร่แล้ว หน้า Tour จะใช้ข้อมูลฉบับล่าสุด');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถเผยแพร่ข้อมูลได้ กรุณาลองอีกครั้ง');
  }
}

export async function syncTourPlacesAction(
  _previousState: AdminActionState,
  _formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const result = await syncTourPlaces(await createServerSupabaseClient(), session.userId);
    revalidateAdmin('hotspot_contents');
    return actionSuccess(
      result.inserted || result.relinked
        ? `ซิงก์สำเร็จ: เพิ่มสถานที่ใหม่ ${result.inserted} รายการ และอัปเดต Scene ID ${result.relinked} รายการ`
        : 'ข้อมูลสถานที่ตรงกับโครงสร้างทัวร์ล่าสุดแล้ว ไม่มีรายการใหม่'
    );
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถซิงก์สถานที่ได้ กรุณาตรวจการเชื่อมต่อ Supabase แล้วลองอีกครั้ง');
  }
}

export async function unpublishContentAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const { error } = await (await createServerSupabaseClient()).from(kind).update({
      published_data: null,
      updated_by: session.userId
    }).eq('id', text(formData, 'id'));
    if (error) throw error;
    revalidateAdmin(kind);
    return actionSuccess(kind === 'faculties'
      ? 'นำคณะออกจากหน้าเว็บแล้ว หลักสูตรของคณะถูกซ่อนชั่วคราวและจะกลับมาเมื่อเผยแพร่คณะอีกครั้ง'
      : 'นำรายการออกจากหน้าเว็บแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถนำรายการออกจากหน้าเว็บได้ กรุณาลองอีกครั้ง');
  }
}

export async function archiveContentAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const { error } = await (await createServerSupabaseClient()).from(kind).update({
      archived_at: new Date().toISOString(),
      published_data: null,
      updated_by: session.userId
    }).eq('id', text(formData, 'id'));
    if (error) throw error;
    revalidateAdmin(kind);
    return actionSuccess(kind === 'faculties'
      ? 'เก็บคณะเข้าคลังแล้ว หลักสูตรของคณะถูกซ่อนชั่วคราว'
      : 'เก็บรายการเข้าคลังแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถเก็บรายการเข้าคลังได้ กรุณาลองอีกครั้ง');
  }
}

export async function restoreContentAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const { error } = await (await createServerSupabaseClient()).from(kind).update({
      archived_at: null,
      updated_by: session.userId
    }).eq('id', text(formData, 'id'));
    if (error) throw error;
    revalidateAdmin(kind);
    return actionSuccess('คืนข้อมูลจากคลังแล้ว กรุณากดเผยแพร่เมื่อตรวจสอบฉบับร่างเรียบร้อย');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถคืนข้อมูลจากคลังได้ กรุณาลองอีกครั้ง');
  }
}

export async function deleteContentAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const supabase = await createServerSupabaseClient();
    const id = text(formData, 'id');
    const { data, error: readError } = await supabase.from(kind).select('archived_at').eq('id', id).single();
    if (readError) throw readError;
    if (!data.archived_at) throw new AdminActionError('ต้องเก็บรายการเข้าคลังก่อนจึงจะลบถาวรได้');
    if (kind === 'faculties') {
      const { count, error: countError } = await supabase.from('programs')
        .select('id', { count: 'exact', head: true })
        .eq('faculty_id', id);
      if (countError) throw countError;
      if ((count ?? 0) > 0) throw new AdminActionError(`ยังลบคณะไม่ได้ เนื่องจากมีหลักสูตรอ้างอิงอยู่ ${count} รายการ กรุณาย้ายหรือลบหลักสูตรก่อน`);
    }
    const { error } = await supabase.from(kind).delete().eq('id', id);
    if (error) throw error;
    revalidateAdmin(kind);
    return actionSuccess('ลบรายการถาวรแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถลบรายการได้ กรุณาลองอีกครั้ง');
  }
}

export async function inviteUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = z.email().parse(text(formData, 'email'));
  const role = z.enum(['admin', 'editor']).parse(text(formData, 'role'));
  const displayName = text(formData, 'displayName');
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) throw error ?? new Error('Unable to invite user');
  const { error: profileError } = await admin.from('admin_profiles').upsert({
    user_id: data.user.id,
    display_name: displayName,
    role
  });
  if (profileError) throw profileError;
  revalidatePath('/admin/users');
}

export async function changeUserRoleAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = z.uuid().parse(text(formData, 'userId'));
  const role = z.enum(['admin', 'editor']).parse(text(formData, 'role'));
  if (userId === session.userId && role !== 'admin') throw new Error('You cannot remove your own admin role');
  const { error } = await createAdminSupabaseClient().from('admin_profiles').update({ role }).eq('user_id', userId);
  if (error) throw error;
  revalidatePath('/admin/users');
}

export async function deleteMediaAction(formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  try {
    const path = text(formData, 'path');
    if (!path || path.includes('..')) throw new AdminActionError('ชื่อไฟล์ไม่ถูกต้อง');
    const admin = createAdminSupabaseClient();
    const publicUrl = admin.storage.from('content-media').getPublicUrl(path).data.publicUrl;
    const usage = (await getMediaUsageIndex([{ path, publicUrl }]))[path] ?? [];
    if (usage.length) throw new AdminActionError(`ยังลบรูปไม่ได้ เนื่องจากมีข้อมูลอ้างอิงรูปนี้อยู่ ${usage.length} รายการ`);
    const { error } = await admin.storage.from('content-media').remove([path]);
    if (error) throw error;
    revalidatePath('/admin/media');
    return actionSuccess('ลบรูปแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถลบรูปได้ กรุณาลองอีกครั้ง');
  }
}
