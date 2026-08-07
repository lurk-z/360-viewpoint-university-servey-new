'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from './env';

export function createBrowserSupabaseClient() {
  const config = getPublicSupabaseConfig();
  if (!config) throw new Error('Supabase browser configuration is missing');
  return createBrowserClient(config.url, config.publishableKey);
}
