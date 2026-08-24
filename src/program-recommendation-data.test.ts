import { describe, expect, it } from 'vitest';
import type { ProgramData } from './content';
import {
  hasMissingProgramRecommendationData,
  inferProgramEligibleQualifications,
  inferProgramStudyLevel
} from './program-recommendation-data';

function program(overrides: Partial<ProgramData> = {}): ProgramData {
  return {
    name: { th: 'สาขาวิชาเทคโนโลยีสารสนเทศ', en: 'Information Technology' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'เรียนด้านซอฟต์แวร์และข้อมูล', en: 'Study software and data' },
    description: { th: 'พัฒนาระบบสารสนเทศ', en: 'Develop information systems' },
    admission: {
      th: 'รับผู้สำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย (ม.6) และประกาศนียบัตรวิชาชีพ (ปวช.)',
      en: 'Accepts Mathayom 6 or vocational certificate graduates'
    },
    imageUrl: undefined,
    source: { label: { th: 'ข้อมูลหลักสูตร', en: 'Program information' }, url: undefined },
    ...overrides
  };
}

describe('program recommendation data inference', () => {
  it('derives study levels without guessing from unrelated prose', () => {
    expect(inferProgramStudyLevel(program())).toBe('bachelor');
    expect(inferProgramStudyLevel(program({
      level: { th: 'ปริญญาตรีเทียบโอน 2 ปี', en: "Two-year transfer bachelor's degree" }
    }))).toBe('transfer');
    expect(inferProgramStudyLevel(program({
      level: { th: 'ปริญญาโท', en: "Master's degree" }
    }))).toBe('master');
    expect(inferProgramStudyLevel(program({
      level: { th: 'หลักสูตรโรงเรียน–โรงงาน', en: 'School–Factory program' }
    }))).toBe('vocational');
  });

  it('extracts only qualifications explicitly present in the program content', () => {
    expect(inferProgramEligibleQualifications(program())).toEqual(['m6-pvoc']);
    expect(inferProgramEligibleQualifications(program({
      admission: { th: 'รับผู้สำเร็จการศึกษาระดับ ปวส.', en: 'Accepts Higher Vocational Certificate graduates' }
    }))).toEqual(['high-vocational']);
    expect(inferProgramEligibleQualifications(program({
      admission: { th: 'โปรดตรวจประกาศรับสมัครล่าสุด', en: 'Check the latest admission announcement' }
    }))).toEqual([]);
  });

  it('reports completion only after bilingual tags and inferable structured fields exist', () => {
    const complete = program({
      studyLevel: 'bachelor',
      eligibleQualifications: ['m6-pvoc'],
      interestTags: { th: ['ซอฟต์แวร์'], en: ['software'] },
      careerTags: { th: ['นักพัฒนาระบบ'], en: ['systems developer'] }
    });
    expect(hasMissingProgramRecommendationData(complete)).toBe(false);
    expect(hasMissingProgramRecommendationData({ ...complete, interestTags: undefined })).toBe(true);
  });
});
