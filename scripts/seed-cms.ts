import { createClient } from '@supabase/supabase-js';
import {
  hotspotDataSchema,
  programDataSchema,
  type HotspotData,
  type ProgramData
} from '../src/content.ts';
import { syncTourPlaces } from '../src/server/tour-place-sync.ts';
import { tourPlaceDefinitions } from '../src/tour-places.ts';
import { getInfoHotspots, getScene, type InfoHotspotDefinition, type TourScene } from '../src/tour-data.ts';
import {
  businessAdditionalProgramSeeds,
  digitalAgroAdditionalProgramSeeds,
  engineeringProgramSeeds,
  fitmProgramSeeds
} from './new-program-seeds.ts';
import { placeContentBootstrap } from './place-seed-data.ts';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const wikipediaReference = { label: { th: 'วิกิพีเดีย', en: 'Wikipedia' } } as const;
const businessProgramsSource = {
  label: {
    th: 'คณะบริหารธุรกิจและอุตสาหกรรมบริการ',
    en: 'Faculty of Business Administration and Service Industry'
  },
  url: 'https://www.bas.kmutnb.ac.th/%E0%B9%80%E0%B8%81%E0%B8%A2%E0%B8%A7%E0%B8%81%E0%B8%9A%E0%B8%84%E0%B8%93%E0%B8%B0/%E0%B8%82%E0%B8%AD%E0%B8%A1%E0%B8%A5%E0%B8%AB%E0%B8%A5%E0%B8%81%E0%B8%AA%E0%B8%95%E0%B8%A3'
} as const;

const digitalAgroProgramsSource = {
  label: {
    th: 'คณะอุตสาหกรรมเกษตรดิจิทัล มจพ.',
    en: 'Faculty of Digital Agro-Industry, KMUTNB'
  },
  url: 'https://www.kmutnb.ac.th/faculty-and-agencies/prachin-campus/%E0%B8%84%E0%B8%93%E0%B8%B0%E0%B8%AD%E0%B8%95%E0%B8%AA%E0%B8%B2%E0%B8%AB%E0%B8%81%E0%B8%A3%E0%B8%A3%E0%B8%A1%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%81%E0%B8%A9%E0%B8%95%E0%B8%A3.aspx'
} as const;

interface ProgramSeed {
  readonly slug: string;
  readonly data: ProgramData;
  /** Defaults to true so existing bootstrap records preserve their historical behavior. */
  readonly publishOnInsert?: boolean;
}

const businessProgramSeeds: readonly ProgramSeed[] = [
  {
    slug: 'tourism-hotel-management-th',
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรบริหารธุรกิจบัณฑิต สาขาวิชาการจัดการอุตสาหกรรมท่องเที่ยวและโรงแรม (TH)',
        en: 'Bachelor of Business Administration Program in Tourism and Hotel Industry Management (TH)'
      },
      level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
      summary: {
        th: 'หลักสูตรปรับปรุง พ.ศ. 2567 แบบสหกิจศึกษา จำนวน 130 หน่วยกิต',
        en: 'A four-year cooperative education program revised in B.E. 2567 (2024), totaling 130 credits.'
      },
      description: {
        th: 'เป็นหลักสูตรแบบสหกิจศึกษา มีจำนวนหน่วยกิตรวมตลอดหลักสูตร 130 หน่วยกิต ผู้เรียนต้องเรียนครบตามจำนวนหน่วยกิตที่กำหนดในหลักสูตร',
        en: 'This is a cooperative education program comprising 130 credits. Students must complete all credits required by the curriculum.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย (ม.6) และระดับประกาศนียบัตรวิชาชีพ (ปวช.)',
        en: 'Applicants must have completed upper secondary education (Mathayom 6) or hold a Vocational Certificate (Por Wor Chor / ปวช.).'
      },
      source: businessProgramsSource
    })
  },
  {
    slug: 'tourism-hotel-management-tht',
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรบริหารธุรกิจบัณฑิต สาขาวิชาการจัดการอุตสาหกรรมท่องเที่ยวและโรงแรม (THT)',
        en: 'Bachelor of Business Administration Program in Tourism and Hotel Industry Management (THT)'
      },
      level: { th: 'ปริญญาตรีเทียบโอน 2 ปี', en: "Two-year transfer bachelor's degree" },
      summary: {
        th: 'หลักสูตรปรับปรุง พ.ศ. 2567 แบบสหกิจศึกษา จำนวน 75 หน่วยกิต',
        en: 'A two-year transfer cooperative education program revised in B.E. 2567 (2024), totaling 75 credits.'
      },
      description: {
        th: 'เป็นหลักสูตรแบบสหกิจศึกษา มีจำนวนหน่วยกิตรวมตลอดหลักสูตร 75 หน่วยกิต ผู้เรียนต้องเรียนครบตามจำนวนหน่วยกิตที่กำหนดในหลักสูตร',
        en: 'This is a cooperative education transfer program comprising 75 credits. Students must complete all credits required by the curriculum.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)',
        en: 'Applicants must hold a Higher Vocational Certificate (Por Wor Sor / ปวส.).'
      },
      source: businessProgramsSource
    })
  },
  {
    slug: 'industrial-business-trade-ibt',
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรบริหารธุรกิจบัณฑิต สาขาวิชาบริหารธุรกิจอุตสาหกรรมและการค้า (IBT)',
        en: 'Bachelor of Business Administration Program in Industrial Business Administration and Trade (IBT)'
      },
      level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
      summary: {
        th: 'หลักสูตรปรับปรุง พ.ศ. 2564 จำนวน 124 หน่วยกิต',
        en: 'A four-year program revised in B.E. 2564 (2021), totaling 124 credits.'
      },
      description: {
        th: 'มีจำนวนหน่วยกิตรวมตลอดหลักสูตร 124 หน่วยกิต ผู้เรียนต้องเรียนครบตามจำนวนหน่วยกิตที่กำหนดในหลักสูตร',
        en: 'The program comprises 124 credits. Students must complete all credits required by the curriculum.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย (ม.6) และระดับประกาศนียบัตรวิชาชีพ (ปวช.)',
        en: 'Applicants must have completed upper secondary education (Mathayom 6) or hold a Vocational Certificate (Por Wor Chor / ปวช.).'
      },
      source: businessProgramsSource
    })
  },
  {
    slug: 'industrial-business-trade-ibtt',
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรบริหารธุรกิจบัณฑิต สาขาวิชาบริหารธุรกิจอุตสาหกรรมและการค้า (IBTT)',
        en: 'Bachelor of Business Administration Program in Industrial Business Administration and Trade (IBTT)'
      },
      level: { th: 'ปริญญาตรีเทียบโอน 2 ปีครึ่ง', en: "Two-and-a-half-year transfer bachelor's degree" },
      summary: {
        th: 'หลักสูตรปรับปรุง พ.ศ. 2564 จำนวน 93 หน่วยกิต',
        en: 'A two-and-a-half-year transfer program revised in B.E. 2564 (2021), totaling 93 credits.'
      },
      description: {
        th: 'มีจำนวนหน่วยกิตรวมตลอดหลักสูตร 93 หน่วยกิต ผู้เรียนต้องเรียนครบตามจำนวนหน่วยกิตที่กำหนดในหลักสูตร',
        en: 'The transfer program comprises 93 credits. Students must complete all credits required by the curriculum.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)',
        en: 'Applicants must hold a Higher Vocational Certificate (Por Wor Sor / ปวส.).'
      },
      source: businessProgramsSource
    })
  },
  {
    slug: 'industrial-business-trade-mibt',
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรบริหารธุรกิจมหาบัณฑิต สาขาวิชาบริหารธุรกิจอุตสาหกรรมและการค้า ภาคปกติ (MIBT)',
        en: 'Master of Business Administration Program in Industrial Business Administration and Trade, Regular Program (MIBT)'
      },
      level: { th: 'ปริญญาโท ภาคปกติ', en: "Master's degree, regular program" },
      summary: {
        th: 'หลักสูตรปรับปรุง พ.ศ. 2565 แผน ก แบบ ก2 วิทยานิพนธ์ จำนวน 36 หน่วยกิต',
        en: 'A regular master’s program revised in B.E. 2565 (2022), Plan A Type A2 with a thesis, totaling 36 credits.'
      },
      description: {
        th: 'เรียนวันจันทร์ถึงวันศุกร์ในเวลาราชการ ตามแผน ก แบบ ก2 วิทยานิพนธ์ มีจำนวนหน่วยกิตรวมตลอดหลักสูตร 36 หน่วยกิต และต้องเรียนครบตามจำนวนหน่วยกิตที่กำหนดในหลักสูตร',
        en: 'Classes are held Monday through Friday during official working hours. The program follows Plan A Type A2 with a thesis, comprises 36 credits, and requires completion of all prescribed credits.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับปริญญาตรีทุกสาขาวิชา',
        en: "Applicants must hold a bachelor's degree in any field."
      },
      source: businessProgramsSource
    })
  },
  {
    slug: 'industrial-business-trade-s-mibt',
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรบริหารธุรกิจมหาบัณฑิต สาขาวิชาบริหารธุรกิจอุตสาหกรรมและการค้า ภาคพิเศษ (S-MIBT)',
        en: 'Master of Business Administration Program in Industrial Business Administration and Trade, Special Program (S-MIBT)'
      },
      level: { th: 'ปริญญาโท ภาคพิเศษ', en: "Master's degree, special program" },
      summary: {
        th: 'หลักสูตรปรับปรุง พ.ศ. 2565 แผน ก แบบ ก2 วิทยานิพนธ์ และแผน ข สารนิพนธ์ จำนวน 36 หน่วยกิต',
        en: 'A special master’s program revised in B.E. 2565 (2022), offering Plan A Type A2 with a thesis and Plan B with an independent study, totaling 36 credits.'
      },
      description: {
        th: 'เรียนวันเสาร์ถึงวันอาทิตย์ เปิดสอนทั้งแผน ก แบบ ก2 วิทยานิพนธ์ และแผน ข สารนิพนธ์ มีจำนวนหน่วยกิตรวมตลอดหลักสูตร 36 หน่วยกิต และต้องเรียนครบตามจำนวนหน่วยกิตที่กำหนดในหลักสูตร',
        en: 'Classes are held on Saturdays and Sundays. The program offers Plan A Type A2 with a thesis and Plan B with an independent study, comprises 36 credits, and requires completion of all prescribed credits.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับปริญญาตรีทุกสาขาวิชา',
        en: "Applicants must hold a bachelor's degree in any field."
      },
      source: businessProgramsSource
    })
  }
];

const digitalAgroProgramSeeds: readonly ProgramSeed[] = [
  {
    slug: 'food-technology-supply-chain-management-ftscm',
    publishOnInsert: false,
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาเทคโนโลยีอาหารและการจัดการห่วงโซ่อุปทาน (FTSCM)',
        en: 'Bachelor of Science Program in Food Technology and Supply Chain Management (FTSCM)'
      },
      level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
      summary: {
        th: 'หลักสูตรบูรณาการวิทยาศาสตร์และเทคโนโลยีอาหารกับการบริหารจัดการ จำนวน 134 หน่วยกิต',
        en: 'A 134-credit program integrating food science and technology with management.'
      },
      description: {
        th: 'มุ่งเน้นเทคโนโลยีการแปรรูปอาหาร การจัดการการผลิต การจัดการคุณภาพ โลจิสติกส์ และการจัดการห่วงโซ่อุปทาน ผู้เรียนต้องเรียนครบตามจำนวนหน่วยกิตที่กำหนดในหลักสูตร รวม 134 หน่วยกิต',
        en: 'The program emphasizes food processing technology, production management, quality management, logistics, and supply chain management. Students must complete all 134 credits required by the curriculum.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย (ม.6) และระดับประกาศนียบัตรวิชาชีพ (ปวช.)',
        en: 'Applicants must have completed upper secondary education (Mathayom 6) or hold a Vocational Certificate (Por Wor Chor / ปวช.).'
      },
      source: digitalAgroProgramsSource
    })
  },
  {
    slug: 'food-and-beauty-product-innovation-fain',
    publishOnInsert: false,
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชานวัตกรรมผลิตภัณฑ์อาหารและความงาม (FAIN)',
        en: 'Bachelor of Science Program in Food and Beauty Product Innovation (FAIN)'
      },
      level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
      summary: {
        th: 'หลักสูตรพัฒนานวัตกรรมผลิตภัณฑ์ในกลุ่มอาหาร สุขภาพ และความงาม',
        en: 'A program focused on product innovation in food, health, and beauty.'
      },
      description: {
        th: 'ประยุกต์ใช้ความรู้ด้านวิทยาศาสตร์ เทคโนโลยี การแปรรูป การพัฒนาผลิตภัณฑ์ การบรรจุ และการควบคุมคุณภาพ โดยมีแนวทางการเรียนด้านนวัตกรรมอาหารและการเป็นผู้ประกอบการ และด้านนวัตกรรมผลิตภัณฑ์เพื่อสุขภาพและความงาม ผู้เรียนต้องเรียนครบตามจำนวนหน่วยกิตที่หลักสูตรกำหนด',
        en: 'The program applies science and technology to processing, product development, packaging, and quality control. Its learning pathways cover food innovation and entrepreneurship, and health and beauty product innovation. Students must complete all credits required by the curriculum.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย (ม.6) และระดับประกาศนียบัตรวิชาชีพ (ปวช.)',
        en: 'Applicants must have completed upper secondary education (Mathayom 6) or hold a Vocational Certificate (Por Wor Chor / ปวช.).'
      },
      source: digitalAgroProgramsSource
    })
  },
  {
    slug: 'food-science-and-nutrition-fsn',
    publishOnInsert: false,
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาศาสตร์การอาหารและโภชนาการ (FSN)',
        en: 'Bachelor of Science Program in Food Science and Nutrition (FSN)'
      },
      level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
      summary: {
        th: 'หลักสูตรด้านวิทยาศาสตร์การอาหารและโภชนาการ จำนวน 128 หน่วยกิต',
        en: 'A 128-credit program in food science and nutrition.'
      },
      description: {
        th: 'มุ่งเน้นวิทยาศาสตร์การอาหารและโภชนาการ การแปรรูปผลผลิตทางการเกษตร การพัฒนาผลิตภัณฑ์อาหาร ตลอดจนคุณภาพและความปลอดภัยของอาหาร ผู้เรียนต้องเรียนครบตามจำนวนหน่วยกิตที่กำหนดในหลักสูตร รวม 128 หน่วยกิต',
        en: 'The program emphasizes food science and nutrition, agricultural product processing, food product development, and food quality and safety. Students must complete all 128 credits required by the curriculum.'
      },
      admission: {
        th: 'รับผู้สำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย (ม.6) และระดับประกาศนียบัตรวิชาชีพ (ปวช.)',
        en: 'Applicants must have completed upper secondary education (Mathayom 6) or hold a Vocational Certificate (Por Wor Chor / ปวช.).'
      },
      source: digitalAgroProgramsSource
    })
  },
  {
    slug: 'food-science-and-industry-mfsi',
    publishOnInsert: false,
    data: programDataSchema.parse({
      name: {
        th: 'หลักสูตรวิทยาศาสตรมหาบัณฑิต สาขาวิชาวิทยาศาสตร์และอุตสาหกรรมอาหาร (MFSI)',
        en: 'Master of Science Program in Food Science and Industry (MFSI)'
      },
      level: { th: 'ปริญญาโท 2 ปี', en: "Two-year master's degree" },
      summary: {
        th: 'หลักสูตรปรับปรุง พ.ศ. 2566 จำนวน 36 หน่วยกิต เปิดสอนได้ทั้งภาคปกติและภาคพิเศษ',
        en: 'A 36-credit master’s program revised in B.E. 2566 (2023), available in regular and special formats.'
      },
      description: {
        th: 'มีแผนการศึกษา ได้แก่ แผน ก.1 วิทยานิพนธ์ 36 หน่วยกิต แผน ก.2 วิทยานิพนธ์ 12 หน่วยกิต และแผน ข. ค้นคว้าอิสระ 6 หน่วยกิต ภาคปกติเรียนวันจันทร์ถึงวันศุกร์ ส่วนภาคพิเศษจัดการเรียนในวันธรรมดานอกเวลาราชการและวันเสาร์ถึงวันอาทิตย์ มีจำนวนหน่วยกิตรวมตลอดหลักสูตร 36 หน่วยกิต',
        en: 'Study options include Plan A.1 with a 36-credit thesis, Plan A.2 with a 12-credit thesis, and Plan B with a 6-credit independent study. Regular classes are held Monday through Friday, while the special program is offered outside official hours on weekdays and on weekends. The program comprises 36 credits in total.'
      },
      admission: {
        th: 'โปรดตรวจสอบคุณสมบัติผู้สมัครจากประกาศรับสมัครล่าสุดของคณะหรือมหาวิทยาลัย',
        en: 'Please consult the latest faculty or university admission announcement for applicant qualifications.'
      },
      source: digitalAgroProgramsSource
    })
  }
];

interface ExistingHotspotRow {
  readonly id: string;
  readonly draft_data: Record<string, unknown>;
  readonly published_data: Record<string, unknown> | null;
}

const bootstrapById: Readonly<Record<string, unknown>> = placeContentBootstrap;

function getBootstrapPlaceContent(id: string): HotspotData | undefined {
  const data = bootstrapById[id];
  return data ? hotspotDataSchema.parse(data) : undefined;
}

const initialNewPlaceContent = new Map(
  Object.entries(bootstrapById).map(([id, data]) => [id, {
    draftData: hotspotDataSchema.parse(data),
    publishOnInsert: true
  }] as const)
);

const syncedPlaces = await syncTourPlaces(supabase, undefined, initialNewPlaceContent);
const { data: existingHotspotData, error: hotspotReadError } = await supabase
  .from('hotspot_contents')
  .select('id,draft_data,published_data');
if (hotspotReadError) throw hotspotReadError;

const existingHotspots = new Map(
  ((existingHotspotData ?? []) as ExistingHotspotRow[]).map((row) => [row.id, row])
);

function hasBilingualReference(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const label = (value as { label?: unknown }).label;
  if (!label || typeof label !== 'object') return false;
  const localized = label as { th?: unknown; en?: unknown };
  return typeof localized.th === 'string' && localized.th.trim().length > 0
    && typeof localized.en === 'string' && localized.en.trim().length > 0;
}

async function ensureFaculty(input: {
  readonly slug: string;
  readonly scene: TourScene;
  readonly hotspot?: InfoHotspotDefinition;
}): Promise<string> {
  const { data: existing, error: readError } = await supabase
    .from('faculties')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle();
  if (readError) throw readError;

  if (existing) {
    const { error } = await supabase.from('faculties').update({
      scene_id: input.scene.id,
      hotspot_id: input.hotspot?.id ?? null
    }).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const currentHotspot = input.hotspot ? existingHotspots.get(input.hotspot.id) : undefined;
  const draftHotspot = currentHotspot?.draft_data;
  const publishedHotspot = currentHotspot?.published_data;
  const bootstrapContent = input.hotspot
    ? getBootstrapPlaceContent(input.hotspot.id)
    : undefined;
  const fallbackImages = bootstrapContent?.images.length ? bootstrapContent.images : [{
    src: input.scene.panorama,
    alt: input.scene.title,
    caption: input.scene.title
  }];
  const draftImages = Array.isArray(draftHotspot?.images) && draftHotspot.images.length
    ? draftHotspot.images
    : fallbackImages;
  const publishedImages = Array.isArray(publishedHotspot?.images) && publishedHotspot.images.length
    ? publishedHotspot.images
    : fallbackImages;
  const draftSource = hasBilingualReference(draftHotspot?.reference)
    ? draftHotspot?.reference
    : bootstrapContent?.reference ?? wikipediaReference;
  const publishedSource = hasBilingualReference(publishedHotspot?.reference)
    ? publishedHotspot?.reference
    : bootstrapContent?.reference ?? wikipediaReference;
  const draftData = {
    name: draftHotspot?.title ?? bootstrapContent?.title ?? input.scene.title,
    summary: input.scene.description,
    description: draftHotspot?.description ?? bootstrapContent?.description ?? input.scene.description,
    images: draftImages,
    source: draftSource
  };
  const publishedData = publishedHotspot ? {
    name: publishedHotspot.title ?? input.scene.title,
    summary: input.scene.description,
    description: publishedHotspot.description ?? input.scene.description,
    images: publishedImages,
    source: publishedSource
  } : draftData;

  const { data, error } = await supabase.from('faculties').insert({
    slug: input.slug,
    scene_id: input.scene.id,
    hotspot_id: input.hotspot?.id ?? null,
    draft_data: draftData,
    published_data: publishedData
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function ensurePrograms(facultyId: string, seeds: readonly ProgramSeed[]): Promise<number> {
  const slugs = seeds.map((seed) => seed.slug);
  const { data: existing, error: readError } = await supabase
    .from('programs')
    .select('slug,faculty_id')
    .in('slug', slugs);
  if (readError) throw readError;

  const existingBySlug = new Map((existing ?? []).map((row) => [row.slug, row]));
  for (const seed of seeds) {
    const current = existingBySlug.get(seed.slug);
    if (current && current.faculty_id !== facultyId) {
      throw new Error(`Program slug ${seed.slug} already belongs to another faculty`);
    }
  }

  const missing = seeds.filter((seed) => !existingBySlug.has(seed.slug));
  if (missing.length > 0) {
    const { error: insertError } = await supabase.from('programs').insert(
      missing.map((seed) => ({
        slug: seed.slug,
        faculty_id: facultyId,
        draft_data: seed.data,
        published_data: seed.publishOnInsert === false ? null : seed.data
      }))
    );
    if (insertError) throw insertError;
  }

  return missing.length;
}

const businessScene = getScene('campusBuilding1');
const businessFacultyId = await ensureFaculty({
  slug: 'business-administration-and-industrial-services',
  scene: businessScene,
  hotspot: getInfoHotspots(businessScene).find((hotspot) => hotspot.id === 'building-1-info')
});
const digitalAgroFacultyId = await ensureFaculty({
  slug: 'digital-agro-industry',
  scene: getScene('campusRoad19')
});
const fitmFacultyId = await ensureFaculty({
  slug: 'industrial-technology-and-management',
  scene: getScene('campusRoad36')
});
const engineeringFacultyId = await ensureFaculty({
  slug: 'faculty-of-engineering-prachinburi',
  scene: getScene('campusRoad43')
});

const allBusinessProgramSeeds: readonly ProgramSeed[] = [...businessProgramSeeds, ...businessAdditionalProgramSeeds];
const allDigitalAgroProgramSeeds: readonly ProgramSeed[] = [...digitalAgroProgramSeeds, ...digitalAgroAdditionalProgramSeeds];
const insertedBusinessProgramCount = await ensurePrograms(businessFacultyId, allBusinessProgramSeeds);
const insertedDigitalAgroProgramCount = await ensurePrograms(digitalAgroFacultyId, allDigitalAgroProgramSeeds);
const insertedFitmProgramCount = await ensurePrograms(fitmFacultyId, fitmProgramSeeds);
const insertedEngineeringProgramCount = await ensurePrograms(engineeringFacultyId, engineeringProgramSeeds);
const totalProgramCount = allBusinessProgramSeeds.length
  + allDigitalAgroProgramSeeds.length
  + fitmProgramSeeds.length
  + engineeringProgramSeeds.length;

process.stdout.write(
  `Seed ready: 4 faculties, ${tourPlaceDefinitions.length - 1} editable places, and ${totalProgramCount} programs (${insertedBusinessProgramCount} new business programs; ${insertedDigitalAgroProgramCount} new digital-agro programs; ${insertedFitmProgramCount} new FITM programs; ${insertedEngineeringProgramCount} new engineering programs; ${syncedPlaces.inserted} new places; ${syncedPlaces.relinked} scene links updated).\n`
);
