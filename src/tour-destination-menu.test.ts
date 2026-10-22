import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getMapLandmarkScenes, tourScenes } from './tour-data';

const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('destination menu', () => {
  const dialogSource = readSource('components/tour/TourDestinationDialog.tsx');
  const appSource = readSource('components/TourApp.tsx');
  const headerSource = readSource('components/tour/TourHeader.tsx');
  const styles = readSource('src/styles.css');

  it('lists important landmarks by default and searches every scene', () => {
    expect(getMapLandmarkScenes().length).toBeGreaterThan(0);
    expect(getMapLandmarkScenes().length).toBeLessThan(tourScenes.length);
    expect(dialogSource).toContain('getMapLandmarkScenes()');
    expect(dialogSource).toContain('tourScenes.filter');
    expect(dialogSource).toContain("type=\"search\"");
  });

  it('opens a selected destination directly through the existing viewer navigation', () => {
    expect(headerSource).toContain("message(locale, 'destinationsButton')");
    expect(appSource).toContain("openHeaderDialog('destinations')");
    expect(appSource).toContain('onNavigate={(sceneId) => void navigate(sceneId)}');
  });

  it('has responsive list styles without horizontal overflow', () => {
    expect(styles).toContain('.destination-grid');
    expect(styles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(styles).toMatch(/@media \(max-width: 700px\)[\s\S]*?\.destination-grid[\s\S]*?grid-template-columns: 1fr;/);
  });
});
