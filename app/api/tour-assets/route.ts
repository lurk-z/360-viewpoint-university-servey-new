import { getPublishedTourStructureSnapshot } from '../../../src/server/tour-structure-repository';

export async function GET() {
  const structure = await getPublishedTourStructureSnapshot();
  const assets = [...new Set(structure.data.scenes.map((scene) => scene.panorama))];

  return Response.json({ assets }, {
    headers: {
      'Cache-Control': 'private, no-cache',
      'X-Tour-Structure-Version': String(structure.version)
    }
  });
}
