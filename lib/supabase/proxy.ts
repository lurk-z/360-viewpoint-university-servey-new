import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicSupabaseConfig } from './env';

export async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
  const config = getPublicSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  const { data } = await supabase.auth.getClaims();
  const isLogin = request.nextUrl.pathname === '/admin/login';
  if (!data?.claims?.sub && !isLogin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (data?.claims?.sub && isLogin) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = '/admin';
    adminUrl.search = '';
    return NextResponse.redirect(adminUrl);
  }
  return response;
}
