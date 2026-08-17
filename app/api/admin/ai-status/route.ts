import { getAdminSession } from '../../../../src/server/auth';
import {
  getAiRuntimeStatus,
  getCachedAiRuntimeStatus
} from '../../../../src/server/ai-status';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const refresh = new URL(request.url).searchParams.get('refresh') === '1';
  const status = refresh
    ? await getAiRuntimeStatus()
    : await getCachedAiRuntimeStatus();
  return Response.json(status, {
    headers: { 'Cache-Control': 'private, no-store' }
  });
}
