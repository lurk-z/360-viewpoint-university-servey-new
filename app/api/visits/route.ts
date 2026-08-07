import { createAdminSupabaseClient } from '../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../lib/supabase/env';
import { isTrustedSameOriginPost } from '../../../src/server/request-security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isTrustedSameOriginPost(request)) {
    return Response.json({ counted: false, error: 'Invalid origin' }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return Response.json({ counted: false, reason: 'not-configured' }, { status: 202 });
  }

  try {
    const { error } = await createAdminSupabaseClient().rpc('increment_daily_visit');
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ counted: false }, { status: 503 });
  }
}
