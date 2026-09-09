import { hotspotDataSchema, type HotspotData, type LocalizedContent } from '../src/content.ts';

const defaultProjectReference = {
  label: {
    th: 'ข้อมูลและภาพถ่ายจากการสำรวจโครงการ',
    en: 'Project survey data and photographs'
  }
} as const;

const officialDormitoryReference = {
  label: {
    th: 'เว็บไซต์งานหอพักนักศึกษา มจพ. วิทยาเขตปราจีนบุรี',
    en: 'KMUTNB Prachinburi Student Dormitory website'
  },
  url: 'https://dorm-pcb.kmutnb.ac.th/'
} as const;

/** Exact generated content used to archive the retired Co-working Info without deleting edits. */
export const coworkingRetiredContentBaseline = hotspotDataSchema.parse({
  title: { th: 'ห้อง Co-working Space', en: 'Co-working Space' },
  description: {
    th: 'พื้นที่ Co-working Space ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม',
    en: 'The co-working space inside the Faculty of Industrial Technology and Management.'
  },
  sceneTitle: {
    th: 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 7',
    en: 'Inside FITM Point 7'
  },
  sceneDescription: {
    th: 'จุดที่ 7 ของเส้นทางภายในอาคารคณะเทคโนโลยีและการจัดการอุตสาหกรรม',
    en: 'Point 7 on the indoor route through the Faculty of Industrial Technology and Management.'
  },
  reference: defaultProjectReference,
  images: [{
    src: '/mainimages/temp-faculty-7.jpg?v=20260805-redacted',
    alt: { th: 'ห้อง Co-working Space', en: 'Co-working Space' },
    caption: { th: 'ห้อง Co-working Space', en: 'Co-working Space' }
  }]
});

interface DormitoryContentUpdate {
  readonly id: string;
  readonly baselineDescription: LocalizedContent;
  readonly description: LocalizedContent;
}

export const dormitoryContentUpdates = [
  {
    id: 'male-dormitory-info',
    baselineDescription: {
      th: 'อาคารหอพักนักศึกษาชายของ มจพ. วิทยาเขตปราจีนบุรี โดยมีมินิมาร์ทให้บริการบริเวณชั้นล่างของอาคาร',
      en: 'The male student dormitory at KMUTNB Prachinburi Campus, with a minimart located on the ground floor.'
    },
    description: {
      th: 'หอพักนักศึกษาชาย มจพ. วิทยาเขตปราจีนบุรี เป็นอาคารสูง 5 ชั้น รองรับนักศึกษาได้ 660 คน มีพื้นที่บริการและมินิมาร์ทบริเวณชั้นล่าง โดยงานหอพักมุ่งจัดที่พักที่สะอาด สะดวก ปลอดภัย และเอื้อต่อการเรียนรู้และการใช้ชีวิตร่วมกัน',
      en: 'The five-storey male student dormitory at KMUTNB Prachinburi Campus accommodates 660 students. Its ground floor includes service and minimart areas, while the dormitory service aims to provide clean, convenient and safe accommodation that supports learning and community life.'
    }
  },
  {
    id: 'female-dormitory-1-info',
    baselineDescription: {
      th: 'อาคารหอพักนักศึกษาหญิงหลังที่ 1 ภายใน มจพ. วิทยาเขตปราจีนบุรี',
      en: 'Female Student Dormitory 1 at KMUTNB Prachinburi Campus.'
    },
    description: {
      th: 'หอพักนักศึกษาหญิงหลังที่ 1 มจพ. วิทยาเขตปราจีนบุรี เป็นอาคารสูง 5 ชั้น ให้บริการห้องพักแบบพัดลม โดยหอพักหญิงทั้ง 2 อาคารรองรับนักศึกษาได้รวม 1,013 คน และมุ่งจัดสภาพแวดล้อมที่สะอาด สะดวก และปลอดภัย',
      en: 'Female Student Dormitory 1 at KMUTNB Prachinburi Campus is a five-storey building offering fan rooms. The two female dormitory buildings accommodate 1,013 students in total and are operated to provide a clean, convenient and safe living environment.'
    }
  },
  {
    id: 'female-dormitory-2-info',
    baselineDescription: {
      th: 'อาคารหอพักนักศึกษาหญิงหลังที่ 2 ภายใน มจพ. วิทยาเขตปราจีนบุรี',
      en: 'Female Student Dormitory 2 at KMUTNB Prachinburi Campus.'
    },
    description: {
      th: 'หอพักนักศึกษาหญิงหลังที่ 2 มจพ. วิทยาเขตปราจีนบุรี เป็นอาคารสูง 5 ชั้น ให้บริการห้องพักปรับอากาศ โดยหอพักหญิงทั้ง 2 อาคารรองรับนักศึกษาได้รวม 1,013 คน และมุ่งจัดสภาพแวดล้อมที่สะอาด สะดวก และปลอดภัย',
      en: 'Female Student Dormitory 2 at KMUTNB Prachinburi Campus is a five-storey building offering air-conditioned rooms. The two female dormitory buildings accommodate 1,013 students in total and are operated to provide a clean, convenient and safe living environment.'
    }
  }
] as const satisfies readonly DormitoryContentUpdate[];

function normalizedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizedJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizedJson(item)])
    );
  }
  return value;
}

function equalJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizedJson(left)) === JSON.stringify(normalizedJson(right));
}

function localizedIsBlank(value: LocalizedContent): boolean {
  return value.th.trim().length === 0 || value.en.trim().length === 0;
}

/** Updates only untouched/default fields and preserves every Admin-authored field. */
export function mergeDormitoryContent(id: string, input: unknown): {
  readonly data: HotspotData;
  readonly changed: boolean;
  readonly changedFields: readonly string[];
} {
  const current = hotspotDataSchema.parse(input);
  const update = dormitoryContentUpdates.find((item) => item.id === id);
  if (!update) return { data: current, changed: false, changedFields: [] };

  const changedFields: string[] = [];
  let description = current.description;
  let reference = current.reference;

  if (localizedIsBlank(current.description) || equalJson(current.description, update.baselineDescription)) {
    description = update.description;
    if (!equalJson(current.description, description)) changedFields.push('description');
  }
  if (equalJson(current.reference, defaultProjectReference)
    || localizedIsBlank(current.reference.label)) {
    reference = officialDormitoryReference;
    if (!equalJson(current.reference, reference)) changedFields.push('reference');
  }

  const data = hotspotDataSchema.parse({ ...current, description, reference });
  return { data, changed: changedFields.length > 0, changedFields };
}
