import TourApp from '../components/TourApp';
import { getPublishedTourStructureSnapshot } from '../src/server/tour-structure-repository';

export default async function HomePage() {
  const structure = await getPublishedTourStructureSnapshot();
  return <TourApp initialTourStructure={structure} />;
}
