import { createClient } from '@supabase/supabase-js';
import { mergeMissingScenePresentation, programDataSchema, type ProgramData } from '../src/content.ts';
import { getInfoHotspots, getScene, tourScenes, type InfoHotspot, type TourScene } from '../src/tour-data.ts';

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

interface ProgramSeed {
  readonly slug: string;
  readonly data: ProgramData;
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

interface ExistingHotspotRow {
  readonly id: string;
  readonly draft_data: Record<string, unknown>;
  readonly published_data: Record<string, unknown> | null;
}

function staticHotspotData(scene: TourScene, hotspot: InfoHotspot) {
  return {
    title: hotspot.title,
    description: hotspot.description,
    sceneTitle: scene.title,
    sceneDescription: scene.description,
    reference: hotspot.reference,
    images: hotspot.images ?? []
  };
}

const staticHotspots = tourScenes.flatMap((scene) => getInfoHotspots(scene).map((hotspot) => ({ scene, hotspot })));
const { data: existingHotspotData, error: hotspotReadError } = await supabase
  .from('hotspot_contents')
  .select('id,draft_data,published_data');
if (hotspotReadError) throw hotspotReadError;

const existingHotspots = new Map(
  ((existingHotspotData ?? []) as ExistingHotspotRow[]).map((row) => [row.id, row])
);

for (const { scene, hotspot } of staticHotspots) {
  const existing = existingHotspots.get(hotspot.id);
  const staticData = staticHotspotData(scene, hotspot);
  if (!existing) {
    const { error } = await supabase.from('hotspot_contents').insert({
      id: hotspot.id,
      scene_id: scene.id,
      draft_data: staticData,
      published_data: staticData
    });
    if (error) throw error;
    continue;
  }

  const draftData = mergeMissingScenePresentation(existing.draft_data, scene);
  const publishedData = existing.published_data
    ? mergeMissingScenePresentation(existing.published_data, scene)
    : null;
  const { error } = await supabase.from('hotspot_contents').update({
    scene_id: scene.id,
    draft_data: draftData,
    published_data: publishedData
  }).eq('id', hotspot.id);
  if (error) throw error;
}

async function ensureFaculty(input: {
  readonly slug: string;
  readonly scene: TourScene;
  readonly hotspot?: InfoHotspot;
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
  const fallbackImages = input.hotspot?.images ?? [{
    src: input.scene.panorama,
    alt: input.scene.title,
    caption: input.scene.title
  }];
  const draftData = {
    name: draftHotspot?.title ?? input.scene.title,
    summary: input.scene.description,
    description: draftHotspot?.description ?? input.scene.description,
    images: draftHotspot?.images ?? fallbackImages,
    source: draftHotspot?.reference ?? input.hotspot?.reference ?? wikipediaReference
  };
  const publishedData = publishedHotspot ? {
    name: publishedHotspot.title ?? input.scene.title,
    summary: input.scene.description,
    description: publishedHotspot.description ?? input.scene.description,
    images: publishedHotspot.images ?? fallbackImages,
    source: publishedHotspot.reference ?? input.hotspot?.reference ?? wikipediaReference
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
        published_data: seed.data
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
await ensureFaculty({
  slug: 'digital-agro-industry',
  scene: getScene('campusRoad19')
});
const insertedProgramCount = await ensurePrograms(businessFacultyId, businessProgramSeeds);

process.stdout.write(
  `Seed ready: 2 faculties, ${staticHotspots.length - 1} editable places, and ${businessProgramSeeds.length} programs (${insertedProgramCount} new; ${staticHotspots.length} hotspot fallbacks preserved).\n`
);
