import { z } from 'zod';
import { requireStaff } from '../../../../src/server/auth';
import { listContentRevisions } from '../../../../src/server/admin-repository';

export const dynamic = 'force-dynamic';

const kindSchema = z.enum(['faculties', 'programs', 'activities', 'hotspot_contents']);

export async function GET(request: Request) {
  await requireStaff();
  const search = new URL(request.url).searchParams;
  const parsedKind = kindSchema.safeParse(search.get('kind'));
  const id = search.get('id')?.trim() ?? '';
  if (!parsedKind.success || !id || id.length > 120) {
    return Response.json({ error: 'Invalid revision request' }, { status: 400 });
  }
  return Response.json({ revisions: await listContentRevisions(parsedKind.data, id) }, {
    headers: { 'Cache-Control': 'private, no-store' }
  });
}

