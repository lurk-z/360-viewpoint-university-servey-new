import { describe, expect, it } from 'vitest';
import {
  createFallbackContentSnapshot,
  facultyDataSchema,
  hotspotDataSchema,
  resolveInfoHotspot
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

  it('requires bilingual content, safe source URLs and at least one Info image', () => {
    expect(facultyDataSchema.safeParse({
      name: { th: 'คณะ' },
      summary: { th: 'สรุป', en: 'Summary' },
      description: { th: 'รายละเอียด', en: 'Description' },
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
