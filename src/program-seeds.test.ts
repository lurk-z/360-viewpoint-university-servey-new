import { describe, expect, it } from 'vitest';
import { programDataSchema } from './content';
import {
  businessAdditionalProgramSeeds,
  digitalAgroAdditionalProgramSeeds,
  engineeringProgramSeeds,
  fitmProgramSeeds
} from '../scripts/new-program-seeds';

describe('new CMS program seeds', () => {
  const allSeeds = [
    ...fitmProgramSeeds,
    ...engineeringProgramSeeds,
    ...businessAdditionalProgramSeeds,
    ...digitalAgroAdditionalProgramSeeds
  ];

  it('defines 25 unique, publishable program records', () => {
    expect(fitmProgramSeeds).toHaveLength(22);
    expect(engineeringProgramSeeds).toHaveLength(1);
    expect(businessAdditionalProgramSeeds).toHaveLength(1);
    expect(digitalAgroAdditionalProgramSeeds).toHaveLength(1);
    expect(allSeeds).toHaveLength(25);
    expect(new Set(allSeeds.map((seed) => seed.slug)).size).toBe(25);
    for (const seed of allSeeds) expect(programDataSchema.parse(seed.data)).toEqual(seed.data);
  });

  it('groups every FITM program under a bilingual department or unit', () => {
    for (const seed of fitmProgramSeeds) {
      expect(seed.data.department?.th.trim()).toBeTruthy();
      expect(seed.data.department?.en.trim()).toBeTruthy();
    }
  });
});
