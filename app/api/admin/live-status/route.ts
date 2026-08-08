import { getAdminSession } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  return new Response(null, {
    status: session ? 204 : 401,
    headers: { 'Cache-Control': 'no-store' }
  });
}
