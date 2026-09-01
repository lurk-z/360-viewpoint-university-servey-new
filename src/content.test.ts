import { describe, expect, it } from 'vitest';
import {
  createFallbackContentSnapshot,
  createFallbackHotspotContent,
  facultyDataSchema,
  hotspotDataSchema,
  mergeMissingScenePresentation,
  preserveLegacyInfoScenePresentation,
  programDataSchema,
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

  it('supports geometry-only Info points with generic emergency content', () => {
    const scene = getScene('entrance');
    const fallback = createFallbackHotspotContent(scene, {
      id: 'future-place-info',
      type: 'info',
      yaw: 12,
      pitch: 3
    });
    expect(fallback).toMatchObject({
      hotspotId: 'future-place-info',
      sceneId: scene.id,
      title: { th: 'ข้อมูลสถานที่', en: 'Place information' },
      images: []
    });
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

  it('preserves legacy scene presentation when saving Info without exposing editable scene fields', () => {
    const sceneTitle = { th: 'ชื่อฉากเดิม', en: 'Legacy scene title' };
    const sceneDescription = { th: 'คำอธิบายฉากเดิม', en: 'Legacy scene description' };
    expect(preserveLegacyInfoScenePresentation(
      { title: { th: 'ห้องผู้บริหาร', en: 'Executive Office' } },
      { sceneTitle, sceneDescription, ignored: 'not copied' }
    )).toEqual({
      title: { th: 'ห้องผู้บริหาร', en: 'Executive Office' },
      sceneTitle,
      sceneDescription
    });
  });

  it('keeps the Tour Structure scene card separate from published Info content', () => {
    const scene = getScene('fitmFloor3Point2');
    const hotspot = getInfoHotspots(scene).find((item) => item.id === 'fitmFloor3Point2-info')!;
    const content = createFallbackContentSnapshot();
    const executiveOffice = {
      ...createFallbackHotspotContent(scene, hotspot),
      title: { th: 'ห้องผู้บริหาร', en: 'Executive Office' },
      description: { th: 'ห้องสำหรับผู้บริหารในคณะ', en: 'Executive office in the faculty.' },
      sceneTitle: { th: 'ชื่อจาก Info ที่ไม่ควรใช้', en: 'Info title that must not be used' },
      sceneDescription: { th: '-', en: '-' }
    };
    const snapshot = { ...content, hotspots: [executiveOffice] };

    expect(resolveTourScene(scene, snapshot)).toMatchObject({
      title: scene.title,
      description: scene.description,
      tags: scene.tags
    });
    expect(resolveInfoHotspot(hotspot, snapshot)).toMatchObject({
      title: executiveOffice.title,
      description: executiveOffice.description,
      yaw: hotspot.yaw,
      pitch: hotspot.pitch
    });
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

  it('accepts optional bilingual recommendation tags and limits them to 20 per language', () => {
    const program = {
      name: { th: 'หลักสูตรทดสอบ', en: 'Test program' },
      level: { th: 'ปริญญาตรี', en: "Bachelor's degree" },
      summary: { th: 'สรุป', en: 'Summary' },
      description: { th: 'รายละเอียด', en: 'Description' },
      admission: { th: 'ข้อมูลรับสมัคร', en: 'Admission information' },
      source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } },
      interestTags: { th: ['ซอฟต์แวร์'], en: ['software'] },
      careerTags: { th: ['นักพัฒนา'], en: ['developer'] }
    };
    expect(programDataSchema.safeParse(program).success).toBe(true);
    expect(programDataSchema.safeParse({
      ...program,
      interestTags: { th: ['ซอฟต์แวร์'], en: [] }
    }).success).toBe(false);
    expect(programDataSchema.safeParse({
      ...program,
      careerTags: { th: Array.from({ length: 21 }, (_, index) => `งาน ${index}`), en: ['career'] }
    }).success).toBe(false);
  });
});
