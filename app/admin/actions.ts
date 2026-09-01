'use server';

import { revalidatePath, updateTag } from 'next/cache';
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
import { DuplicateTourPlaceIdError, syncTourPlaces } from '../../src/server/tour-place-sync';
import { isTourPlaceLink } from '../../src/tour-places';
import { getMediaUsageIndex } from '../../src/server/media-usage';
import { PUBLIC_CONTENT_CACHE_TAG } from '../../src/server/content-repository';
import {
  bootstrapTourProject,
  getAdminTourProject,
  TOUR_STRUCTURE_CACHE_TAG,
  TOUR_PROJECT_ID,
  writeAdminAuditLog
} from '../../src/server/tour-structure-repository';
import { analyzeTourStructure, tourStructureDataSchema } from '../../src/tour-structure';
import {
  NavigationPreservationError,
  preserveCurrentNavigation
} from '../../src/tour-navigation-sync';

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
  if (error instanceof NavigationPreservationError) {
    return {
      status: 'error',
      message: `รักษาลูกศรจาก VS Code ไม่ได้ เพราะไม่พบฉาก: ${error.missingSceneIds.join(', ')}`
    };
  }
  if (error instanceof DuplicateTourPlaceIdError) return { status: 'error', message: error.message };
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

function lines(formData: FormData, key: string): string[] {
  return [...new Set(text(formData, key).split(/\r?\n/u).map((value) => value.trim()).filter(Boolean))];
}

function slugify(value: string): string {
  return value.normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 84);
}

async function createUniqueSlug(
  kind: Exclude<ContentKind, 'hotspot_contents'>,
  requested: string,
  englishName: string
): Promise<string> {
  const base = slugSchema.safeParse(requested).success
    ? requested
    : slugify(englishName) || `${kind.replace(/s$/, '')}-${Date.now().toString(36)}`;
  const supabase = await createServerSupabaseClient();
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base.slice(0, 94)}-${suffix + 1}`;
    const { data, error } = await supabase.from(kind).select('id').eq('slug', candidate).maybeSingle();
    if (error) throw error;
    if (!data) return slugSchema.parse(candidate);
  }
  throw new AdminActionError('ไม่สามารถสร้าง Slug ที่ไม่ซ้ำได้ กรุณากำหนดในตั้งค่าขั้นสูง');
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
    const departmentTh = text(formData, 'departmentTh');
    const departmentEn = text(formData, 'departmentEn');
    const interestTagsTh = lines(formData, 'interestTagsTh');
    const interestTagsEn = lines(formData, 'interestTagsEn');
    const careerTagsTh = lines(formData, 'careerTagsTh');
    const careerTagsEn = lines(formData, 'careerTagsEn');
    const eligibleQualifications = formData.getAll('eligibleQualifications')
      .map((value) => String(value))
      .filter((value) => ['m3', 'm6-pvoc', 'high-vocational', 'bachelor', 'other'].includes(value));
    const studyLevel = text(formData, 'studyLevel');
    return programDataSchema.parse({
      name: { th: text(formData, 'nameTh'), en: text(formData, 'nameEn') },
      department: departmentTh || departmentEn ? { th: departmentTh, en: departmentEn } : undefined,
      level: { th: text(formData, 'levelTh'), en: text(formData, 'levelEn') },
      summary: { th: text(formData, 'summaryTh'), en: text(formData, 'summaryEn') },
      description: { th: text(formData, 'descriptionTh'), en: text(formData, 'descriptionEn') },
      admission: { th: text(formData, 'admissionTh'), en: text(formData, 'admissionEn') },
      interestTags: interestTagsTh.length || interestTagsEn.length
        ? { th: interestTagsTh, en: interestTagsEn }
        : undefined,
      careerTags: careerTagsTh.length || careerTagsEn.length
        ? { th: careerTagsTh, en: careerTagsEn }
        : undefined,
      eligibleQualifications: eligibleQualifications.length ? eligibleQualifications : undefined,
      studyLevel: studyLevel || undefined,
      images: imagesFromForm(formData).filter((image) => image.src),
      imageUrl: text(formData, 'imageUrl') || imagesFromForm(formData).find((image) => image.src)?.src,
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
      images: imagesFromForm(formData).filter((image) => image.src),
      imageUrl: text(formData, 'imageUrl') || imagesFromForm(formData).find((image) => image.src)?.src,
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
  revalidatePath('/admin');
  if (kind) revalidatePath(`/admin/${kind === 'hotspot_contents' ? 'places' : kind}`);
}

function revalidatePublicContent(): void {
  updateTag(PUBLIC_CONTENT_CACHE_TAG);
  revalidatePath('/');
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
      const slug = await createUniqueSlug(
        kind,
        text(formData, 'slug'),
        text(formData, 'nameEn')
      );
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
    await writeAdminAuditLog({ actorId: session.userId, action: id ? 'save-draft' : 'create-draft', entityKind: kind, entityId: id || undefined });
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
    await writeAdminAuditLog({ actorId: session.userId, action: 'publish', entityKind: kind, entityId: id });
    revalidateAdmin(kind);
    revalidatePublicContent();
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
    await writeAdminAuditLog({ actorId: session.userId, action: 'sync-tour-places', entityKind: 'tour', summary: { inserted: result.inserted, relinked: result.relinked } });
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

export async function bootstrapTourStructureAction(
  _previousState: AdminActionState,
  _formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const result = await bootstrapTourProject(session.userId);
    updateTag(TOUR_STRUCTURE_CACHE_TAG);
    revalidatePath('/admin');
    revalidatePath('/admin/system');
    revalidatePath('/admin/tour');
    await writeAdminAuditLog({ actorId: session.userId, action: 'bootstrap-tour-structure', entityKind: 'tour', entityId: 'main' });
    return actionSuccess(result.created
      ? 'นำ 123 ฉากเข้า Visual Tour Editor แล้ว โดยไม่เปลี่ยนหน้า Tour สาธารณะ'
      : 'โครงสร้างทัวร์ถูกนำเข้าไว้แล้ว ไม่มีข้อมูลถูกเขียนทับ');
  } catch (error) {
    return actionFailure(error, 'ยังนำเข้าโครงสร้างทัวร์ไม่ได้ กรุณารัน Migration 202608290001 ก่อน');
  }
}

export async function unpublishContentAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const id = text(formData, 'id');
    const { error } = await (await createServerSupabaseClient()).from(kind).update({
      published_data: null,
      updated_by: session.userId
    }).eq('id', id);
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

export async function archiveContentAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const id = text(formData, 'id');
    const { error } = await (await createServerSupabaseClient()).from(kind).update({
      archived_at: new Date().toISOString(),
      published_data: null,
      updated_by: session.userId
    }).eq('id', id);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'archive', entityKind: kind, entityId: id });
    revalidateAdmin(kind);
    revalidatePublicContent();
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
    const id = text(formData, 'id');
    const { error } = await (await createServerSupabaseClient()).from(kind).update({
      archived_at: null,
      updated_by: session.userId
    }).eq('id', id);
    if (error) throw error;
    await writeAdminAuditLog({ actorId: session.userId, action: 'restore-archive', entityKind: kind, entityId: id });
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
  const session = await requireAdmin();
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
    await writeAdminAuditLog({ actorId: session.userId, action: 'delete', entityKind: kind, entityId: id });
    revalidateAdmin(kind);
    revalidatePublicContent();
    return actionSuccess('ลบรายการถาวรแล้ว');
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถลบรายการได้ กรุณาลองอีกครั้ง');
  }
}

export async function restoreContentRevisionAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireStaff();
  try {
    const kind = contentKindSchema.parse(text(formData, 'kind'));
    const id = text(formData, 'id');
    const revisionId = z.uuid().parse(text(formData, 'revisionId'));
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('content_revisions')
      .select('snapshot')
      .eq('id', revisionId)
      .eq('entity_kind', kind)
      .eq('entity_id', id)
      .single();
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

async function syncInfoGeometryFromStructure(
  structure: z.infer<typeof tourStructureDataSchema>,
  userId: string
): Promise<number> {
  const admin = createAdminSupabaseClient();
  const definitions = structure.scenes.filter((scene) => !scene.archived).flatMap((scene) => scene.hotspots
    .filter((hotspot) => hotspot.type === 'info')
    .map((hotspot) => ({ id: hotspot.id, sceneId: scene.id, scene })));
  if (!definitions.length) return 0;
  const { data, error } = await admin.from('hotspot_contents').select('id,scene_id')
    .in('id', definitions.map((definition) => definition.id));
  if (error) throw error;
  const existing = new Map((data ?? []).map((row) => [String(row.id), String(row.scene_id)]));
  const missing = definitions.filter((definition) => !existing.has(definition.id));
  if (missing.length) {
    const { error: insertError } = await admin.from('hotspot_contents').insert(missing.map((definition) => ({
      id: definition.id,
      scene_id: definition.sceneId,
      draft_data: {
        title: { th: 'ข้อมูลสถานที่', en: 'Place information' },
        description: {
          th: 'กรุณากรอกรายละเอียดของสถานที่นี้ก่อนเผยแพร่',
          en: 'Please complete this place information before publishing.'
        },
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
      const { error: updateError } = await admin.from('hotspot_contents').update({
        scene_id: definition.sceneId,
        updated_by: userId
      }).eq('id', definition.id);
      if (updateError) throw updateError;
    }
  }
  return missing.length;
}

export async function saveTourStructureAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireStaff();
  try {
    const submittedStructure = tourStructureDataSchema.parse(JSON.parse(text(formData, 'structure')));
    const expectedVersion = z.coerce.number().int().positive().parse(text(formData, 'draftVersion'));
    const current = await getAdminTourProject();
    if (!current.installed) throw new AdminActionError('กรุณานำโครงสร้างเดิมเข้าระบบก่อน');
    if (current.draftVersion !== expectedVersion) {
      throw new AdminActionError('มีผู้ใช้อื่นบันทึกโครงสร้างหลังจากคุณเปิดหน้านี้ กรุณาโหลดข้อมูลล่าสุดแล้วตรวจอีกครั้ง');
    }
    const structure = preserveCurrentNavigation(submittedStructure, current.draft);
    const nextVersion = current.draftVersion + 1;
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from('tour_projects').update({
      draft_data: structure,
      draft_version: nextVersion,
      updated_by: session.userId
    }).eq('id', TOUR_PROJECT_ID).eq('draft_version', expectedVersion).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new AdminActionError('ไม่สามารถบันทึกได้เพราะเวอร์ชันเปลี่ยน กรุณาโหลดข้อมูลล่าสุด');
    await admin.from('tour_revisions').insert({
      project_id: TOUR_PROJECT_ID,
      action: 'save',
      snapshot: structure,
      version: nextVersion,
      created_by: session.userId
    });
    const insertedPlaces = await syncInfoGeometryFromStructure(structure, session.userId);
    await writeAdminAuditLog({
      actorId: session.userId,
      action: 'save-tour-draft',
      entityKind: 'tour',
      entityId: TOUR_PROJECT_ID,
      summary: { version: nextVersion, scenes: structure.scenes.length, insertedPlaces }
    });
    revalidatePath('/admin/tour');
    revalidatePath('/admin/places');
    return actionSuccess(`บันทึกโครงสร้างฉบับร่างเวอร์ชัน ${nextVersion} แล้ว${insertedPlaces ? ` และสร้างสถานที่รอกรอก ${insertedPlaces} รายการ` : ''}`);
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถบันทึกโครงสร้างทัวร์ได้ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง');
  }
}

export async function publishTourStructureAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const expectedVersion = z.coerce.number().int().positive().parse(text(formData, 'draftVersion'));
    const current = await getAdminTourProject();
    if (!current.installed || current.draftVersion !== expectedVersion) {
      throw new AdminActionError('โครงสร้างในหน้าจอไม่ใช่เวอร์ชันล่าสุด กรุณาโหลดข้อมูลล่าสุด');
    }
    const structure = tourStructureDataSchema.parse(current.draft);
    const blocking = analyzeTourStructure(structure).filter((issue) => issue.severity === 'error');
    if (blocking.length) {
      throw new AdminActionError(`ยังเผยแพร่ไม่ได้: ${blocking.slice(0, 3).map((issue) => issue.message).join(' · ')}`);
    }
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from('tour_projects').update({
      published_data: structure,
      published_version: current.draftVersion,
      updated_by: session.userId
    }).eq('id', TOUR_PROJECT_ID).eq('draft_version', expectedVersion);
    if (error) throw error;
    await admin.from('tour_revisions').insert({
      project_id: TOUR_PROJECT_ID,
      action: 'publish',
      snapshot: structure,
      version: current.draftVersion,
      created_by: session.userId
    });
    await writeAdminAuditLog({
      actorId: session.userId,
      action: 'publish-tour',
      entityKind: 'tour',
      entityId: TOUR_PROJECT_ID,
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

export async function restoreTourRevisionAction(
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const revisionId = z.uuid().parse(text(formData, 'revisionId'));
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
      draft_data: structure,
      draft_version: nextVersion,
      updated_by: session.userId
    }).eq('id', TOUR_PROJECT_ID);
    if (updateError) throw updateError;
    await admin.from('tour_revisions').insert({
      project_id: TOUR_PROJECT_ID,
      action: 'restore',
      snapshot: structure,
      version: nextVersion,
      created_by: session.userId
    });
    await writeAdminAuditLog({ actorId: session.userId, action: 'restore-tour-revision', entityKind: 'tour', entityId: TOUR_PROJECT_ID, summary: { revisionId, version: nextVersion } });
    revalidatePath('/admin/tour');
    return actionSuccess(`กู้คืนเป็นฉบับร่างเวอร์ชัน ${nextVersion} แล้ว หน้าเว็บสาธารณะยังไม่เปลี่ยน`);
  } catch (error) {
    return actionFailure(error, 'ไม่สามารถกู้คืนเวอร์ชันโครงสร้างทัวร์ได้');
  }
}

export async function inviteUserAction(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const email = z.email().parse(text(formData, 'email'));
    const role = z.enum(['admin', 'editor']).parse(text(formData, 'role'));
    const displayName = text(formData, 'displayName');
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
    const userId = z.uuid().parse(text(formData, 'userId'));
    const role = z.enum(['admin', 'editor']).parse(text(formData, 'role'));
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

export async function deleteMediaAction(formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const path = text(formData, 'path');
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
