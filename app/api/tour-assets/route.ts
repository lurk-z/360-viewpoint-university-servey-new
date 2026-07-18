import { getSceneAssetUrls, tourScenes } from '../../../src/tour-data';

export function GET() {
  const assets = [...new Set(tourScenes.flatMap((scene) => getSceneAssetUrls(scene)))];

  return Response.json({ assets });
}
