import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getNavigationHotspots, getScene, tourScenes } from './tour-data';

const viewerSource = readFileSync(resolve(process.cwd(), 'components/TourViewer.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

describe('ground navigation arrows', () => {
  it('uses the white SVG chevron and an accessible 80 by 60 pixel hit area', () => {
    expect(viewerSource).toContain("svg.setAttribute('viewBox', '0 0 72 42')");
    expect(viewerSource).toContain("path.setAttribute('class', 'tour-arrow__chevron')");
    expect(viewerSource).toContain("path.setAttribute('d', 'M6 27 36 7 66 27 58 37 36 22 14 37Z')");
    expect(viewerSource).toContain("size: { width: 80, height: 60 }");
    expect(viewerSource).not.toContain('M12 20V5m0 0-6 6m6-6 6 6');
    expect(viewerSource).toContain("button.setAttribute('aria-label', goToScene(");
    expect(viewerSource).toContain('getLinkTooltip:');
  });

  it('removes the orange circle and provides ground perspective, focus and motion-safe styles', () => {
    const buttonRule = styles.match(/\.tour-arrow\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const chevronRule = styles.match(/\.tour-arrow__chevron\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(buttonRule).toContain('border: 0');
    expect(buttonRule).toContain('background: transparent');
    expect(buttonRule).not.toContain('var(--orange-');
    expect(chevronRule).toContain('fill: currentcolor');
    expect(styles).toContain('transform: perspective(110px) rotateX(22deg) translateY(3px)');
    expect(styles).toContain('.tour-arrow:focus-visible');
    expect(styles).toContain('@media (max-width: 700px)');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps all configured links including high-branch navigation scenes', () => {
    const linkCount = tourScenes.reduce(
      (total, scene) => total + getNavigationHotspots(scene).length,
      0
    );
    expect(tourScenes).toHaveLength(93);
    expect(linkCount).toBe(207);
    expect(getNavigationHotspots(getScene('campusRoad4'))).toHaveLength(4);
    expect(getNavigationHotspots(getScene('campusRoad31'))).toHaveLength(3);
    expect(getNavigationHotspots(getScene('campusRoad36'))).toHaveLength(3);
    expect(getNavigationHotspots(getScene('campusRoad45'))).toHaveLength(3);
    expect(getNavigationHotspots(getScene('campusRoad49'))).toHaveLength(3);
  });
});
