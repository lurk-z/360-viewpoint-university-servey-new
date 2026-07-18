import { tourMedia } from '../../../src/tour-data';

export function GET() {
  const assets = [...new Set(
    Object.values(tourMedia).flatMap(({ panorama, thumbnail }) => [panorama, thumbnail])
  )];

  return Response.json({ assets });
}
