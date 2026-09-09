import { describe, expect, it } from 'vitest';
import {
  createTourInfoSelection,
  resolveTourInfoSelection
} from '../components/tour/info-selection';
import { createFallbackContentSnapshot, type PublicContentSnapshot } from './content';
import type { InfoHotspot, InfoHotspotDefinition } from './tour-data';

const clickedHotspot: InfoHotspot = {
  id: 'sample-info',
  type: 'info',
  yaw: 10,
  pitch: 2,
  title: { th: 'ข้อมูลเดิม', en: 'Captured content' },
  description: { th: 'รายละเอียดเดิม', en: 'Captured description' },
  reference: { label: { th: 'แหล่งข้อมูลเดิม', en: 'Captured source' } },
  images: []
};

describe('Info dialog selection', () => {
  it('keeps the clicked snapshot when a live structure update removes the geometry', () => {
    const selection = createTourInfoSelection('scene-a', clickedHotspot);
    expect(resolveTourInfoSelection(selection, undefined, createFallbackContentSnapshot()))
      .toEqual(clickedHotspot);
  });

  it('uses current published content when the geometry is still available', () => {
    const selection = createTourInfoSelection('scene-a', clickedHotspot);
    const definition: InfoHotspotDefinition = {
      id: 'sample-info', type: 'info', yaw: 11, pitch: 3
    };
    const fallback = createFallbackContentSnapshot();
    const content: PublicContentSnapshot = {
      ...fallback,
      source: 'database',
      hotspots: [{
        id: 'sample-info',
        hotspotId: 'sample-info',
        sceneId: 'scene-a',
        title: { th: 'ข้อมูลล่าสุด', en: 'Current content' },
        description: { th: 'รายละเอียดล่าสุด', en: 'Current description' },
        reference: { label: { th: 'ข้อมูลล่าสุด', en: 'Current source' } },
        images: []
      }]
    };

    expect(resolveTourInfoSelection(selection, definition, content)).toEqual(expect.objectContaining({
      yaw: 11,
      pitch: 3,
      title: { th: 'ข้อมูลล่าสุด', en: 'Current content' }
    }));
  });
});
