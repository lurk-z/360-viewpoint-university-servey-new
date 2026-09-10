import { createFallbackContentSnapshot, type PublicContentSnapshot } from '../src/content';

/** Test data only. Never imported by the application or written to Supabase. */
export const chatFixture: PublicContentSnapshot = {
  ...createFallbackContentSnapshot(), source: 'database', version: 9001,
  faculties: [
    ['d931a670-03f0-4d1c-82e2-66e728b51ba9', 'fitm', 'campusRoad36', 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม', 'Faculty of Industrial Technology and Management'],
    ['5613a398-47f4-43cf-88b2-b4af67b8cd92', 'bas', 'campusBuilding1', 'คณะบริหารธุรกิจและอุตสาหกรรมบริการ', 'Faculty of Business Administration and Service Industry'],
    ['09a1489f-ac9f-4824-98c0-5b56a689d5ae', 'agro', 'campusRoad19', 'คณะอุตสาหกรรมเกษตรดิจิทัล', 'Faculty of Digital Agro-Industry'],
    ['31f6e8c7-c20c-4c72-8e0e-3cccbef48a15', 'engineering', 'campusRoad43', 'คณะวิศวกรรมศาสตร์', 'Faculty of Engineering']
  ].map(([id, slug, sceneId, th, en]) => ({
    id: id!, slug: slug!, sceneId: sceneId!, name: { th: th!, en: en! },
    summary: { th: 'ข้อมูลคณะทดสอบ', en: 'Test faculty summary' },
    description: { th: 'รายละเอียดคณะทดสอบ', en: 'Test faculty details' }, images: [],
    source: { label: { th: 'ข้อมูลทดสอบ', en: 'Test data' } }
  })),
  programs: [
    { id: 'f0961f20-26ac-4a75-92c0-026bb834fcb0', slug: 'it',
      name: { th: 'เทคโนโลยีสารสนเทศ (IT)', en: 'Information Technology (IT)' },
      eligibleQualifications: ['m6-pvoc'] as const,
      admission: { th: 'รับผู้จบ ม.6 และ ปวช.', en: 'Accepts upper secondary or vocational certificate graduates' } },
    { id: 'e3d67661-7827-4ee7-84ec-6df97290d303', slug: 'software',
      name: { th: 'พัฒนาซอฟต์แวร์ (SWE)', en: 'Software Development (SWE)' },
      admission: { th: 'ตรวจประกาศรับสมัครล่าสุด', en: 'Check the latest admission notice' } }
  ].map((program) => ({
    ...program, facultyId: 'd931a670-03f0-4d1c-82e2-66e728b51ba9',
    level: { th: 'ปริญญาตรี 4 ปี', en: 'Bachelor degree' }, studyLevel: 'bachelor',
    summary: { th: 'เขียนโปรแกรม', en: 'Programming' }, description: { th: 'ซอฟต์แวร์', en: 'Software' },
    interestTags: { th: ['เขียนโปรแกรม'], en: ['software'] },
    careerTags: { th: ['นักพัฒนาซอฟต์แวร์'], en: ['Software developer'] },
    source: { label: { th: 'ข้อมูลทดสอบ', en: 'Test data' } }
  }))
};
