import 'server-only';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import {
  activityDataSchema,
  facultyDataSchema,
  hotspotDataSchema,
  preserveLegacyInfoScenePresentation,
  programDataSchema,
  type ContentKind
} from '../content';
import { PUBLIC_CONTENT_CACHE_TAG } from './content-repository';
import { DuplicateTourPlaceIdError } from './tour-place-sync';
import { NavigationPreservationError } from '../tour-navigation-sync';

export const contentKindSchema = z.enum(['faculties', 'programs', 'activities', 'hotspot_contents']);
const slugSchema = z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export interface AdminActionState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
}

export class AdminActionError extends Error {}

export function actionSuccess(message: string): AdminActionState {
  return { status: 'success', message };
}

export function actionFailure(error: unknown, fallback: string): AdminActionState {
  if (error instanceof AdminActionError) return { status: 'error', message: error.message };
  if (error instanceof NavigationPreservationError) {
    return { status: 'error', message: `รักษาลูกศรจาก VS Code ไม่ได้ เพราะไม่พบฉาก: ${error.missingSceneIds.join(', ')}` };
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

export function formText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function lines(formData: FormData, key: string): string[] {
  return [...new Set(formText(formData, key).split(/\r?\n/u).map((value) => value.trim()).filter(Boolean))];
}

function slugify(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 84);
}

export async function createUniqueSlug(kind: Exclude<ContentKind, 'hotspot_contents'>, requested: string, englishName: string): Promise<string> {
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
    label: { th: formText(formData, 'sourceLabelTh'), en: formText(formData, 'sourceLabelEn') },
    url: formText(formData, 'sourceUrl')
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
    ...((captionTh[index] || captionEn[index]) ? { caption: { th: captionTh[index] ?? '', en: captionEn[index] ?? '' } } : {})
  }));
}

export function parseDraftData(kind: ContentKind, formData: FormData, existingDraftData: Record<string, unknown> = {}): Record<string, unknown> {
  if (kind === 'faculties') {
    return facultyDataSchema.parse({
      name: { th: formText(formData, 'nameTh'), en: formText(formData, 'nameEn') },
      summary: { th: formText(formData, 'summaryTh'), en: formText(formData, 'summaryEn') },
      description: { th: formText(formData, 'descriptionTh'), en: formText(formData, 'descriptionEn') },
      images: imagesFromForm(formData),
      source: sourceFromForm(formData)
    });
  }
  if (kind === 'programs') {
    const departmentTh = formText(formData, 'departmentTh');
    const departmentEn = formText(formData, 'departmentEn');
    const interestTagsTh = lines(formData, 'interestTagsTh');
    const interestTagsEn = lines(formData, 'interestTagsEn');
    const careerTagsTh = lines(formData, 'careerTagsTh');
    const careerTagsEn = lines(formData, 'careerTagsEn');
    const eligibleQualifications = formData.getAll('eligibleQualifications').map(String)
      .filter((value) => ['m3', 'm6-pvoc', 'high-vocational', 'bachelor', 'other'].includes(value));
    const studyLevel = formText(formData, 'studyLevel');
    const images = imagesFromForm(formData).filter((image) => image.src);
    return programDataSchema.parse({
      name: { th: formText(formData, 'nameTh'), en: formText(formData, 'nameEn') },
      department: departmentTh || departmentEn ? { th: departmentTh, en: departmentEn } : undefined,
      level: { th: formText(formData, 'levelTh'), en: formText(formData, 'levelEn') },
      summary: { th: formText(formData, 'summaryTh'), en: formText(formData, 'summaryEn') },
      description: { th: formText(formData, 'descriptionTh'), en: formText(formData, 'descriptionEn') },
      admission: { th: formText(formData, 'admissionTh'), en: formText(formData, 'admissionEn') },
      interestTags: interestTagsTh.length || interestTagsEn.length ? { th: interestTagsTh, en: interestTagsEn } : undefined,
      careerTags: careerTagsTh.length || careerTagsEn.length ? { th: careerTagsTh, en: careerTagsEn } : undefined,
      eligibleQualifications: eligibleQualifications.length ? eligibleQualifications : undefined,
      studyLevel: studyLevel || undefined,
      images,
      imageUrl: formText(formData, 'imageUrl') || images.find((image) => image.src)?.src,
      source: sourceFromForm(formData)
    });
  }
  if (kind === 'activities') {
    const images = imagesFromForm(formData).filter((image) => image.src);
    return activityDataSchema.parse({
      title: { th: formText(formData, 'nameTh'), en: formText(formData, 'nameEn') },
      summary: { th: formText(formData, 'summaryTh'), en: formText(formData, 'summaryEn') },
      description: { th: formText(formData, 'descriptionTh'), en: formText(formData, 'descriptionEn') },
      startDate: formText(formData, 'startDate'),
      endDate: formText(formData, 'endDate'),
      sceneId: formText(formData, 'sceneId'),
      images,
      imageUrl: formText(formData, 'imageUrl') || images.find((image) => image.src)?.src,
      source: sourceFromForm(formData)
    });
  }
  return hotspotDataSchema.parse(preserveLegacyInfoScenePresentation({
    title: { th: formText(formData, 'nameTh'), en: formText(formData, 'nameEn') },
    description: { th: formText(formData, 'descriptionTh'), en: formText(formData, 'descriptionEn') },
    reference: sourceFromForm(formData),
    images: imagesFromForm(formData)
  }, existingDraftData));
}

export function validatePublishData(kind: ContentKind, value: unknown): Record<string, unknown> {
  if (kind === 'faculties') return facultyDataSchema.parse(value);
  if (kind === 'programs') return programDataSchema.parse(value);
  if (kind === 'activities') return activityDataSchema.parse(value);
  return hotspotDataSchema.parse(value);
}

export function revalidateAdmin(kind?: ContentKind): void {
  revalidatePath('/admin');
  if (kind) revalidatePath(`/admin/${kind === 'hotspot_contents' ? 'places' : kind}`);
}

export function revalidatePublicContent(): void {
  updateTag(PUBLIC_CONTENT_CACHE_TAG);
  revalidatePath('/');
}

export async function assertPublishedFaculty(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, facultyId: string): Promise<void> {
  const { data, error } = await supabase.from('faculties').select('id').eq('id', facultyId)
    .is('archived_at', null).not('published_data', 'is', null).maybeSingle();
  if (error) throw error;
  if (!data) throw new AdminActionError('ต้องเผยแพร่คณะที่สังกัดก่อน จึงจะเผยแพร่หลักสูตรนี้ได้');
}
