import { describe, expect, it } from 'vitest';
import { createBootstrapTourStructureData } from './tour-structure';
import {
  containsLegacySceneOrdinal,
  mergeSceneTitleRenames,
  SCENE_TITLE_RENAMES,
  SceneTitleSyncConflictError
} from './tour-scene-titles';
import { getInfoHotspots, getNavigationHotspots, tourScenes } from './tour-data';

describe('visitor-facing scene titles', () => {
  it('uses 93 curated, unique bilingual names without internal point numbering', () => {
    expect(SCENE_TITLE_RENAMES).toHaveLength(93);
    expect(tourScenes).toHaveLength(135);
    expect(tourScenes.flatMap(getNavigationHotspots)).toHaveLength(305);
    expect(tourScenes.flatMap(getInfoHotspots)).toHaveLength(36);
    expect(tourScenes.filter((scene) => containsLegacySceneOrdinal(scene.title))).toEqual([]);
    expect(new Set(tourScenes.map((scene) => scene.title.th)).size).toBe(tourScenes.length);
    expect(new Set(tourScenes.map((scene) => scene.title.en.toLocaleLowerCase())).size).toBe(tourScenes.length);
  });

  it('upgrades the known legacy titles without changing any other tour fields', () => {
    const target = createBootstrapTourStructureData();
    const legacy = structuredClone(target);
    for (const item of SCENE_TITLE_RENAMES) {
      legacy.scenes.find((scene) => scene.id === item.id)!.title = { ...item.before };
    }

    const first = mergeSceneTitleRenames(legacy);
    expect(first.changed).toBe(true);
    expect(first.updatedSceneIds).toHaveLength(93);
    expect(first.data).toEqual(target);

    const second = mergeSceneTitleRenames(first.data);
    expect(second.changed).toBe(false);
    expect(second.updatedSceneIds).toEqual([]);
    expect(second.data).toEqual(target);
  });

  it('preserves a compliant title written in Admin', () => {
    const current = createBootstrapTourStructureData();
    const scene = current.scenes.find((item) => item.id === 'campusRoad1')!;
    scene.title = { th: 'ชื่อสถานที่ที่ผู้ดูแลกำหนด', en: 'Admin-defined Place Name' };

    const result = mergeSceneTitleRenames(current);
    expect(result.changed).toBe(false);
    expect(result.preservedSceneIds).toContain('campusRoad1');
    expect(result.data.scenes.find((item) => item.id === 'campusRoad1')!.title).toEqual(scene.title);
  });

  it('stops before writing when an Admin-edited title still contains point numbering', () => {
    const current = createBootstrapTourStructureData();
    current.scenes.find((item) => item.id === 'campusRoad1')!.title = {
      th: 'ชื่อที่แก้เอง จุดที่พิเศษ',
      en: 'Custom Point Name'
    };

    expect(() => mergeSceneTitleRenames(current)).toThrow(SceneTitleSyncConflictError);
  });

  it('stops before writing when the resulting titles are duplicated', () => {
    const current = createBootstrapTourStructureData();
    current.scenes.find((item) => item.id === 'campusRoad1')!.title = {
      ...current.scenes.find((item) => item.id === 'campusRoad2')!.title
    };

    expect(() => mergeSceneTitleRenames(current)).toThrow(/ซ้ำ/);
  });
});
