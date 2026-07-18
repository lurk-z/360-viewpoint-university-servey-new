import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { messages } from './i18n';
import {
  getNavigationHotspots,
  getScene,
  getSceneEdges,
  locales,
  sceneIds,
  tourScenes,
  validateTour
} from './tour-data';

describe('tour configuration', () => {
  it('passes all runtime validation rules', () => {
    expect(validateTour()).toEqual([]);
  });

  it('keeps scene ids unique and in the intended order', () => {
    expect(tourScenes.map((scene) => scene.id)).toEqual(sceneIds);
    expect(new Set(sceneIds).size).toBe(sceneIds.length);
  });

  it('keeps every navigation link reciprocal', () => {
    for (const scene of tourScenes) {
      for (const link of getNavigationHotspots(scene)) {
        const reverseTargets = getNavigationHotspots(getScene(link.target)).map((item) => item.target);
        expect(reverseTargets, `${scene.id} -> ${link.target} is missing its return path`).toContain(scene.id);
      }
    }
  });

  it('derives the route map from the scene graph without invented edges', () => {
    const edges = getSceneEdges().map(({ from, to }) => [from, to].sort().join(':')).sort();
    expect(edges).toEqual([
      'balcony:bicycle',
      'balcony:entrance',
      'bicycle:entrance',
      'entrance:room',
      'entrance:university'
    ]);
  });

  it('references existing files from the Next.js public directory', () => {
    for (const scene of tourScenes) {
      for (const mediaPath of [scene.panorama, scene.thumbnail]) {
        expect(mediaPath, `${scene.id} must use a root-relative public URL`).toMatch(/^\/(?!public\/)/);
        expect(
          existsSync(resolve(process.cwd(), 'public', mediaPath.slice(1))),
          `${scene.id} references a missing public file: ${mediaPath}`
        ).toBe(true);
      }
    }
  });

  it('keeps map positions and hotspot angles within supported ranges', () => {
    for (const scene of tourScenes) {
      expect(scene.mapPosition.x).toBeGreaterThanOrEqual(0);
      expect(scene.mapPosition.x).toBeLessThanOrEqual(100);
      expect(scene.mapPosition.y).toBeGreaterThanOrEqual(0);
      expect(scene.mapPosition.y).toBeLessThanOrEqual(100);
      for (const hotspot of scene.hotspots) {
        expect(Number.isFinite(hotspot.yaw)).toBe(true);
        expect(hotspot.pitch).toBeGreaterThanOrEqual(-90);
        expect(hotspot.pitch).toBeLessThanOrEqual(90);
      }
    }
  });

  it('contains complete localized scene content', () => {
    for (const scene of tourScenes) {
      for (const locale of locales) {
        expect(scene.title[locale].trim()).not.toBe('');
        expect(scene.description[locale].trim()).not.toBe('');
        expect(scene.tags[locale].length).toBeGreaterThan(0);
      }
    }
  });
});

describe('translations', () => {
  it('has exactly the same message keys in Thai and English', () => {
    expect(Object.keys(messages.th).sort()).toEqual(Object.keys(messages.en).sort());
  });
});
