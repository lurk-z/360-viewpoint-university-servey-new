import { describe, expect, it } from 'vitest';
import {
  createFallbackContentSnapshot,
  facultyDataSchema,
  hotspotDataSchema,
  mergeMissingScenePresentation,
  resolveInfoHotspot,
  resolveTourScene
} from './content';
import { getInfoHotspots, getScene, tourScenes } from './tour-data';

describe('public CMS content', () => {
  it('falls back to every Info hotspot currently defined in the 34-scene tour', () => {
    const snapshot = createFallbackContentSnapshot();
    const hotspotCount = tourScenes.reduce((count, scene) => count + getInfoHotspots(scene).length, 0);
    expect(snapshot.source).toBe('fallback');
    expect(snapshot.hotspots).toHaveLength(hotspotCount);
    expect(snapshot.faculties).toEqual([]);
  });

  it('merges published text and media without changing hotspot geometry', () => {
    const hotspot = getInfoHotspots(getScene('campusRoad23'))[0]!;
    const content = createFallbackContentSnapshot();
    const replacement = {
      ...content.hotspots.find((item) => item.hotspotId === hotspot.id)!,
      title: { th: 'ชื่อใหม่', en: 'Updated title' }
    };
    const resolved = resolveInfoHotspot(hotspot, {
      ...content,
      hotspots: [replacement]
    });
    expect(resolved.title).toEqual(replacement.title);
    expect({ yaw: resolved.yaw, pitch: resolved.pitch }).toEqual({ yaw: hotspot.yaw, pitch: hotspot.pitch });
  });

  it('uses linked faculty content for the scene card and Info without changing geometry', () => {
    const scene = getScene('campusBuilding1');
    const hotspot = getInfoHotspots(scene).find((item) => item.id === 'building-1-info')!;
    const content = createFallbackContentSnapshot();
    const faculty = {
      id: 'faculty-1',
      slug: 'business-administration',
      sceneId: scene.id,
      hotspotId: hotspot.id,
      name: { th: 'ชื่อคณะใหม่', en: 'Updated faculty' },
      summary: { th: 'สรุปใหม่', en: 'Updated summary' },
      description: { th: 'รายละเอียดใหม่', en: 'Updated description' },
      images: [{ src: '/mainimages/temp1-5-1.jpg', alt: { th: 'รูปคณะ', en: 'Faculty image' } }],
      source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } }
    } as const;
    const snapshot = { ...content, faculties: [faculty] };

    expect(resolveTourScene(scene, snapshot)).toMatchObject({
      title: faculty.name,
      description: faculty.summary,
      mapPosition: scene.mapPosition,
      hotspots: scene.hotspots
    });
    const resolvedHotspot = resolveInfoHotspot(hotspot, snapshot);
    expect(resolvedHotspot).toMatchObject({
      title: faculty.name,
      description: faculty.description,
      reference: faculty.source,
      images: faculty.images,
      yaw: hotspot.yaw,
      pitch: hotspot.pitch
    });
  });

  it('merges missing scene presentation without overwriting Admin edits', () => {
    const scene = getScene('campusRoad21');
    expect(mergeMissingScenePresentation({ title: { th: 'Info', en: 'Info' } }, scene)).toMatchObject({
      sceneTitle: scene.title,
      sceneDescription: scene.description
    });
    const custom = { th: 'ชื่อฉากที่แก้แล้ว', en: 'Edited scene title' };
    expect(mergeMissingScenePresentation({ sceneTitle: custom }, scene).sceneTitle).toEqual(custom);
  });

  it('requires bilingual content, safe source URLs and at least one Info image', () => {
    expect(facultyDataSchema.safeParse({
      name: { th: 'คณะ' },
      summary: { th: 'สรุป', en: 'Summary' },
      description: { th: 'รายละเอียด', en: 'Description' },
      images: [{ src: '/mainimages/temp1.jpg', alt: { th: 'รูป', en: 'Image' } }],
      source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } }
    }).success).toBe(false);

    expect(hotspotDataSchema.safeParse({
      title: { th: 'สถานที่', en: 'Place' },
      description: { th: 'รายละเอียด', en: 'Description' },
      reference: { label: { th: 'แหล่งข้อมูล', en: 'Source' }, url: 'javascript:alert(1)' },
      images: []
    }).success).toBe(false);
  });
});
