'use server';

import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '../../../lib/supabase/env';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { formText } from '../../../src/server/admin-action-shared';

export async function loginAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect('/admin/login?error=configuration');
  const email = formText(formData, 'email');
  const password = formText(formData, 'password');
  const nextPath = formText(formData, 'next');
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
