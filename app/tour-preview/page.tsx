import TourApp from '../../components/TourApp';
import { requireStaff } from '../../src/server/auth';
import { getAdminTourProject } from '../../src/server/tour-structure-repository';

export const dynamic = 'force-dynamic';

export default async function TourDraftPreviewPage() {
  await requireStaff();
  const project = await getAdminTourProject();
  return <TourApp lockTourStructure initialTourStructure={{
    version: project.draftVersion,
    generatedAt: project.updatedAt ?? new Date().toISOString(),
    source: 'database',
    data: project.draft
  }} />;
}
