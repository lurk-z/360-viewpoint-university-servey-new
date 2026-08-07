export interface PublicSupabaseConfig {
  readonly url: string;
  readonly publishableKey: string;
}

export interface ServerSupabaseConfig extends PublicSupabaseConfig {
  readonly serviceRoleKey: string;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey || url.includes('your-project')) return null;
  return { url, publishableKey };
}

export function getServerSupabaseConfig(): ServerSupabaseConfig | null {
  const publicConfig = getPublicSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!publicConfig || !serviceRoleKey || serviceRoleKey === 'your-service-role-key') return null;
  return { ...publicConfig, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getServerSupabaseConfig() !== null;
}
