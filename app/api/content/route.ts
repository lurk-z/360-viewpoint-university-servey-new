import { getPublicContentSnapshot } from '../../../src/server/content-repository';

export const dynamic = 'force-dynamic';

function contentHeaders(version: number, source: string): HeadersInit {
  return {
    'Cache-Control': 'private, no-cache',
    'X-Content-Source': source,
    'X-Content-Version': String(version)
  };
}

export async function GET() {
  const content = await getPublicContentSnapshot();
  return Response.json(content, {
    headers: contentHeaders(content.version, content.source)
  });
}

export async function HEAD() {
  const content = await getPublicContentSnapshot();
  return new Response(null, {
    status: 200,
    headers: contentHeaders(content.version, content.source)
  });
}
