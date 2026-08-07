import { createClient } from '@supabase/supabase-js';
import { getServerSupabaseConfig } from './env';

export function createAdminSupabaseClient() {
  const config = getServerSupabaseConfig();
  if (!config) throw new Error('Supabase service-role configuration is missing');
  return createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
  });
}
