import { describe, expect, it } from 'vitest';
import { createFallbackContentSnapshot, type PublicContentSnapshot } from './content';
import { getNavigationHotspots, getScene } from './tour-data';
import { findShortestTourPath, findTourDestinationCandidates } from './tour-routing';

describe('guided tour routing', () => {
  it('builds a shortest path exclusively from configured navigation hotspots', () => {
    const path = findShortestTourPath('entrance', 'universityCafeteria');
    expect(path?.[0]).toBe('entrance');
    expect(path?.at(-1)).toBe('universityCafeteria');
    expect(path?.length).toBeGreaterThan(2);
    for (let index = 0; index < (path?.length ?? 0) - 1; index += 1) {
      const from = path![index]!;
      const to = path![index + 1]!;
      expect(getNavigationHotspots(getScene(from)).some((hotspot) => hotspot.target === to)).toBe(true);
    }
  });

  it('returns one scene when the visitor is already at the destination', () => {
    expect(findShortestTourPath('entrance', 'entrance')).toEqual(['entrance']);
  });

  it('matches a published Admin faculty name to its real linked scene', () => {
    const fallback = createFallbackContentSnapshot();
    const content: PublicContentSnapshot = {
      ...fallback,
      faculties: [{
        id: 'faculty-fitm',
        slug: 'industrial-technology-and-management',
        sceneId: 'campusRoad36',
        name: { th: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม', en: 'Faculty of Industrial Technology and Management' },
        summary: { th: 'ข้อมูลคณะ', en: 'Faculty summary' },
        description: { th: 'รายละเอียดคณะ', en: 'Faculty description' },
        images: [{ src: '/mainimages/temp6-9.jpg', alt: { th: 'คณะ', en: 'Faculty' } }],
        source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } }
      }]
    };
    const candidates = findTourDestinationCandidates('พาไปคณะเทคโนโลยีและการจัดการอุตสาหกรรม', content, 'th');
    expect(candidates[0]?.sceneId).toBe('campusRoad36');
    expect(candidates[0]?.score).toBeGreaterThanOrEqual(500);
  });
});
