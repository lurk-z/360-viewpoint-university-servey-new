import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicSupabaseConfig } from './env';

export async function createServerSupabaseClient() {
  const config = getPublicSupabaseConfig();
  if (!config) throw new Error('Supabase server configuration is missing');
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always write cookies. proxy.ts refreshes them.
        }
      }
    }
  });
}
