import { getPublicContentSnapshot } from '../../../src/server/content-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const content = await getPublicContentSnapshot();
  return Response.json(content, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Source': content.source
    }
  });
}
