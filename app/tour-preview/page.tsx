import TourApp from '../../components/TourApp';
import { requireStaff } from '../../src/server/auth';
import { getAdminTourProject } from '../../src/server/tour-structure-repository';

export const dynamic = 'force-dynamic';

export default async function TourDraftPreviewPage({ searchParams }: {
  readonly searchParams: Promise<{ scene?: string | string[] }>;
}) {
  await requireStaff();
  const project = await getAdminTourProject();
  const query = await searchParams;
  const requestedSceneId = Array.isArray(query.scene) ? query.scene[0] : query.scene;
  const initialSceneId = project.draft.scenes.some((scene) => scene.id === requestedSceneId && !scene.archived)
    ? requestedSceneId
    : undefined;
  return <TourApp lockTourStructure initialTourStructure={{
    version: project.draftVersion,
    generatedAt: project.updatedAt ?? new Date().toISOString(),
    source: 'database',
    data: project.draft
  }} initialSceneId={initialSceneId} />;
}
