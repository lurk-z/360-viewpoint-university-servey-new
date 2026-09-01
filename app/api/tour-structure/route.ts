import { getFreshPublishedTourStructureSnapshot } from '../../../src/server/tour-structure-repository';
import { getTourStructureDataSignature } from '../../../src/tour-structure';

export const dynamic = 'force-dynamic';

function headers(version: number, source: string, signature: string): HeadersInit {
  return {
    'Cache-Control': 'private, no-cache',
    'X-Tour-Structure-Version': String(version),
    'X-Tour-Structure-Source': source,
    'X-Tour-Structure-Signature': signature
  };
}

export async function GET() {
  const snapshot = await getFreshPublishedTourStructureSnapshot();
  const signature = getTourStructureDataSignature(snapshot.data);
  return Response.json(snapshot, { headers: headers(snapshot.version, snapshot.source, signature) });
}

export async function HEAD() {
  const snapshot = await getFreshPublishedTourStructureSnapshot();
  const signature = getTourStructureDataSignature(snapshot.data);
  return new Response(null, { status: 200, headers: headers(snapshot.version, snapshot.source, signature) });
}
