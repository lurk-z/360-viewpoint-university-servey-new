import TourApp from '../components/TourApp';
import { getPublishedTourStructureSnapshot } from '../src/server/tour-structure-repository';

export default async function HomePage({ searchParams }: {
  readonly searchParams: Promise<{ scene?: string | string[] }>;
}) {
  const structure = await getPublishedTourStructureSnapshot();
  const query = await searchParams;
  const requestedSceneId = Array.isArray(query.scene) ? query.scene[0] : query.scene;
  const initialSceneId = structure.data.scenes.some((scene) => scene.id === requestedSceneId && !scene.archived)
    ? requestedSceneId
    : undefined;
  return <TourApp initialTourStructure={structure} initialSceneId={initialSceneId} />;
}
