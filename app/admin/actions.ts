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

const contentKindSchema = z.enum(['faculties', 'programs', 'activities', 'hotspot_contents']);
const slugSchema = z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function sourceFromForm(formData: FormData) {
  return {
    label: { th: text(formData, 'sourceLabelTh'), en: text(formData, 'sourceLabelEn') },
    url: text(formData, 'sourceUrl')
  };
}

function parseDraftData(kind: ContentKind, formData: FormData): Record<string, unknown> {
  if (kind === 'faculties') {
    return facultyDataSchema.parse({
      name: { th: text(formData, 'nameTh'), en: text(formData, 'nameEn') },
      summary: { th: text(formData, 'summaryTh'), en: text(formData, 'summaryEn') },
      description: { th: text(formData, 'descriptionTh'), en: text(formData, 'descriptionEn') },
      imageUrl: text(formData, 'imageUrl'),
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

  let images: unknown;
  try {
    images = JSON.parse(text(formData, 'imagesJson'));
  } catch {
    throw new Error('Images JSON is invalid');
  }
  return hotspotDataSchema.parse({
    title: { th: text(formData, 'nameTh'), en: text(formData, 'nameEn') },
    description: { th: text(formData, 'descriptionTh'), en: text(formData, 'descriptionEn') },
    reference: sourceFromForm(formData),
    images
  });
}

function revalidateAdmin(kind?: ContentKind): void {
  revalidatePath('/');
  revalidatePath('/admin');
  if (kind) revalidatePath(`/admin/${kind === 'hotspot_contents' ? 'hotspots' : kind}`);
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

export async function saveContentAction(formData: FormData): Promise<void> {
  const session = await requireStaff();
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
    if (kind === 'hotspot_contents') throw new Error('Hotspot geometry must already exist in tour-data.ts');
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
}

export async function publishContentAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const kind = contentKindSchema.parse(text(formData, 'kind'));
  const id = text(formData, 'id');
  const supabase = await createServerSupabaseClient();
  const { data, error: readError } = await supabase.from(kind).select('draft_data').eq('id', id).single();
  if (readError) throw readError;
  const { error } = await supabase.from(kind).update({
    published_data: data.draft_data,
    archived_at: null,
    updated_by: session.userId
  }).eq('id', id);
  if (error) throw error;
  revalidateAdmin(kind);
}

export async function unpublishContentAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const kind = contentKindSchema.parse(text(formData, 'kind'));
  const { error } = await (await createServerSupabaseClient()).from(kind).update({
    published_data: null,
    updated_by: session.userId
  }).eq('id', text(formData, 'id'));
  if (error) throw error;
  revalidateAdmin(kind);
}

export async function archiveContentAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const kind = contentKindSchema.parse(text(formData, 'kind'));
  const { error } = await (await createServerSupabaseClient()).from(kind).update({
    archived_at: new Date().toISOString(),
    published_data: null,
    updated_by: session.userId
  }).eq('id', text(formData, 'id'));
  if (error) throw error;
  revalidateAdmin(kind);
}

export async function restoreContentAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const kind = contentKindSchema.parse(text(formData, 'kind'));
  const { error } = await (await createServerSupabaseClient()).from(kind).update({
    archived_at: null,
    updated_by: session.userId
  }).eq('id', text(formData, 'id'));
  if (error) throw error;
  revalidateAdmin(kind);
}

export async function deleteContentAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const kind = contentKindSchema.parse(text(formData, 'kind'));
  const supabase = await createServerSupabaseClient();
  const id = text(formData, 'id');
  const { data } = await supabase.from(kind).select('archived_at').eq('id', id).single();
  if (!data?.archived_at) throw new Error('Content must be archived before permanent deletion');
  const { error } = await supabase.from(kind).delete().eq('id', id);
  if (error) throw error;
  revalidateAdmin(kind);
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

export async function deleteMediaAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const path = text(formData, 'path');
  if (!path || path.includes('..')) throw new Error('Invalid media path');
  const { error } = await createAdminSupabaseClient().storage.from('content-media').remove([path]);
  if (error) throw error;
  revalidatePath('/admin/media');
}
