import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import { getPublicSupabaseConfig } from '../../lib/supabase/env';
import type { AdminRole } from '../content';

export interface AdminSession {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: AdminRole;
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!getPublicSupabaseConfig()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) return null;
    const { data: profile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('display_name,role')
      .eq('user_id', userId)
      .maybeSingle();
    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'editor')) return null;
    return {
      userId,
      email: typeof claimsData.claims.email === 'string' ? claimsData.claims.email : '',
      displayName: typeof profile.display_name === 'string' ? profile.display_name : '',
      role: profile.role
    };
  } catch {
    return null;
  }
});

export async function requireStaff(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await requireStaff();
  if (session.role !== 'admin') throw new Error('Admin permission required');
  return session;
}
