import { getPublishedTourStructureSnapshot } from '../../../src/server/tour-structure-repository';

export const dynamic = 'force-dynamic';

function headers(version: number, source: string): HeadersInit {
  return {
    'Cache-Control': 'private, no-cache',
    'X-Tour-Structure-Version': String(version),
    'X-Tour-Structure-Source': source
  };
}

export async function GET() {
  const snapshot = await getPublishedTourStructureSnapshot();
  return Response.json(snapshot, { headers: headers(snapshot.version, snapshot.source) });
}

export async function HEAD() {
  const snapshot = await getPublishedTourStructureSnapshot();
  return new Response(null, { status: 200, headers: headers(snapshot.version, snapshot.source) });
}

