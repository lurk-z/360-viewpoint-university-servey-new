import { describe, expect, it } from 'vitest';
import type { ActivityContent } from './content';
import { sortActivities } from './activities';

const activity = (id: string, startDate?: string, endDate?: string): ActivityContent => ({
  id,
  slug: id,
  title: { th: id, en: id },
  summary: { th: id, en: id },
  description: { th: id, en: id },
  startDate,
  endDate,
  source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } }
});

describe('activity ordering', () => {
  it('shows ongoing, upcoming, undated, and past activities in that order', () => {
    const result = sortActivities([
      activity('past', '2026-01-01'),
      activity('undated'),
      activity('upcoming', '2026-09-01'),
      activity('ongoing', '2026-08-01', '2026-08-10')
    ], '2026-08-08');
    expect(result.map((item) => item.id)).toEqual(['ongoing', 'upcoming', 'undated', 'past']);
  });
});
