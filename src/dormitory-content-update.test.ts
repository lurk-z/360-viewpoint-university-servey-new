import { describe, expect, it } from 'vitest';
import { mergeDormitoryContent } from '../scripts/dormitory-content-update';

const base = {
  title: { th: 'หอพักนักศึกษาชาย', en: 'Male Student Dormitory' },
  description: {
    th: 'อาคารหอพักนักศึกษาชายของ มจพ. วิทยาเขตปราจีนบุรี โดยมีมินิมาร์ทให้บริการบริเวณชั้นล่างของอาคาร',
    en: 'The male student dormitory at KMUTNB Prachinburi Campus, with a minimart located on the ground floor.'
  },
  reference: {
    label: {
      th: 'ข้อมูลและภาพถ่ายจากการสำรวจโครงการ',
      en: 'Project survey data and photographs'
    }
  },
  images: [{
    src: '/mainimages/temp8-8.jpg?v=20260805-redacted',
    alt: { th: 'หอพักนักศึกษาชาย', en: 'Male Student Dormitory' }
  }]
};

describe('safe dormitory content update', () => {
  it('replaces only the generated description and source', () => {
    const result = mergeDormitoryContent('male-dormitory-info', base);
    expect(result.changedFields).toEqual(['description', 'reference']);
    expect(result.data.description.th).toContain('660 คน');
    expect(result.data.reference.url).toBe('https://dorm-pcb.kmutnb.ac.th/');
    expect(result.data.title).toEqual(base.title);
    expect(result.data.images).toEqual(base.images);
  });

  it('preserves Admin-authored description and source', () => {
    const custom = {
      ...base,
      description: { th: 'ผู้ดูแลแก้เอง', en: 'Admin edited' },
      reference: {
        label: { th: 'แหล่งข้อมูลของผู้ดูแล', en: 'Admin source' },
        url: 'https://example.com/admin-source'
      }
    };
    const result = mergeDormitoryContent('male-dormitory-info', custom);
    expect(result.changed).toBe(false);
    expect(result.data.description).toEqual(custom.description);
    expect(result.data.reference).toEqual(custom.reference);
  });
});
