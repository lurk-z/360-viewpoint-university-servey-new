import { describe, expect, it } from 'vitest';
import { createBootstrapTourStructureData } from './tour-structure';
import { extractNavigationSnapshot } from './tour-navigation-sync';
import { mergePuangSaedBaseline, mergePuangSaedExpansion, PUANG_SAED_SCENE_ID } from './tour-puang-saed-expansion';

function previousStructure() {
  const data = createBootstrapTourStructureData();
  data.scenes = data.scenes.filter((scene) => scene.id !== PUANG_SAED_SCENE_ID);
  for (const scene of data.scenes) {
    scene.hotspots = scene.hotspots.filter((hotspot) => hotspot.type !== 'scene' || hotspot.target !== PUANG_SAED_SCENE_ID);
  }
  return data;
}

describe('scoped Phuang Saed room expansion', () => {
  it('adds only one room and two arrows, preserves Admin copy and is idempotent', () => {
    const current = previousStructure();
    const entrance = current.scenes.find((scene) => scene.id === 'fitmInterior1')!;
    entrance.title.th = 'ชื่อจากผู้ดูแล';
    entrance.hotspots.push({ id: 'admin-kept-info', type: 'info', yaw: 37, pitch: -8 });
    const before = structuredClone(current);
    const code = createBootstrapTourStructureData();
    const result = mergePuangSaedExpansion(current, code);
    expect(current).toEqual(before);
    expect(result.addedSceneIds).toEqual([PUANG_SAED_SCENE_ID]);
    expect(result.addedHotspotIds).toHaveLength(2);
    expect(result.data.scenes).toHaveLength(current.scenes.length + 1);
    const updatedEntrance = result.data.scenes.find((scene) => scene.id === entrance.id)!;
    expect(updatedEntrance).toEqual({ ...entrance, hotspots: [...entrance.hotspots, expect.objectContaining({ target: PUANG_SAED_SCENE_ID })] });
    expect(result.data.scenes.filter((scene) => scene.id !== entrance.id && scene.id !== PUANG_SAED_SCENE_ID))
      .toEqual(current.scenes.filter((scene) => scene.id !== entrance.id));
    expect(mergePuangSaedExpansion(result.data, code)).toMatchObject({ changed: false, addedSceneIds: [], addedHotspotIds: [], data: result.data });
  });

  it('keeps draft-only details and published details separate', () => {
    const draft = previousStructure();
    const published = previousStructure();
    draft.scenes[0]!.description.th = 'ฉบับร่างยังไม่เผยแพร่';
    const code = createBootstrapTourStructureData();
    const a = mergePuangSaedExpansion(draft, code);
    const b = mergePuangSaedExpansion(published, code);
    expect(a.data.scenes[0]!.description.th).toBe('ฉบับร่างยังไม่เผยแพร่');
    expect(b.data.scenes[0]!.description.th).toBe(published.scenes[0]!.description.th);
  });

  it.each(['panorama', 'arrow', 'source', 'duplicate-id', 'archived', 'duplicate-route'] as const)(
    'rejects a %s conflict without modifying the input', (conflict) => {
      const code = createBootstrapTourStructureData();
      const current = structuredClone(code);
      const room = current.scenes.find((scene) => scene.id === PUANG_SAED_SCENE_ID)!;
      const entrance = current.scenes.find((scene) => scene.id === 'fitmInterior1')!;
      const arrow = entrance.hotspots.find((hotspot) => hotspot.id === 'fitm-interior-1-to-puang-saed-room')!;
      if (conflict === 'panorama') room.panorama = '/mainimages/admin-room.jpg';
      if (conflict === 'arrow') arrow.yaw = 88;
      if (conflict === 'archived') entrance.archived = true;
      if (conflict === 'duplicate-route') arrow.id = 'another-room-entrance';
      if (conflict === 'duplicate-id') current.scenes[0]!.hotspots.push(structuredClone(arrow));
      if (conflict === 'source') {
        entrance.hotspots = entrance.hotspots.filter((hotspot) => hotspot.id !== arrow.id);
        current.scenes[0]!.hotspots.push(arrow);
      }
      const before = structuredClone(current);
      expect(() => mergePuangSaedExpansion(current, code)).toThrow();
      expect(current).toEqual(before);
    }
  );

  it('adds only approved entries to the baseline and refuses existing conflicting entries', () => {
    const code = createBootstrapTourStructureData();
    const baseline = extractNavigationSnapshot(previousStructure()).map((entry) => ({ ...entry }));
    baseline[0]!.yaw = 74;
    const updated = mergePuangSaedBaseline(baseline, code);
    expect(updated).toHaveLength(baseline.length + 2);
    for (const entry of baseline) expect(updated).toContainEqual(entry);
    expect(mergePuangSaedBaseline(updated, code)).toEqual(updated);
    const changed = updated.map((entry) => entry.sceneId === PUANG_SAED_SCENE_ID ? { ...entry, pitch: 42 } : entry);
    expect(() => mergePuangSaedBaseline(changed, code)).toThrow('Baseline conflict');
  });
});
