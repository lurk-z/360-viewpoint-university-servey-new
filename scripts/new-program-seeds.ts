import { programDataSchema, type ProgramData } from '../src/content.ts';

export interface NewProgramSeed {
  readonly slug: string;
  readonly data: ProgramData;
}

type Localized = Readonly<{ th: string; en: string }>;

const fitmSource = {
  label: { th: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม มจพ.', en: 'Faculty of Industrial Technology and Management, KMUTNB' },
  url: 'https://www.fitm.kmutnb.ac.th/'
} as const;

const fitmAdmissionSource = {
  label: { th: 'ประกาศรับสมัครคณะเทคโนโลยีและการจัดการอุตสาหกรรม ปีการศึกษา 2569', en: 'FITM admission announcement for academic year 2026' },
  url: 'https://www.admission.kmutnb.ac.th/sites/default/files/2025-09/FITM-Technology-community1.pdf'
} as const;

const schoolFactorySource = {
  label: { th: 'ข่าวมหาวิทยาลัย: หลักสูตรโรงเรียน–โรงงาน', en: 'KMUTNB news: School–Factory programs' },
  url: 'https://www.kmutnb.ac.th/news/university-news/%E0%B8%A1%E0%B8%88%E0%B8%9E-%E0%B9%81%E0%B8%96%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7-%E0%B8%A1%E0%B8%AD%E0%B8%9A%E0%B8%97%E0%B8%B8%E0%B8%99%E0%B9%83%E0%B8%AB%E0%B9%89%E0%B8%81%E0%B8%B1%E0%B8%9A%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99-%E0%B8%A1-3-%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%81%E0%B8%AA%E0%B8%B9%E0%B8%95%E0%B8%A3%E0%B9%82%E0%B8%A3.aspx'
} as const;

const engineeringSource = {
  label: { th: 'ภาควิชาวิศวกรรมเครื่องมือวัดและอิเล็กทรอนิกส์ มจพ.', en: 'Department of Instrumentation and Electronics Engineering, KMUTNB' },
  url: 'https://iee.eng.kmutnb.ac.th/iee/inae-4-%E0%B8%9B%E0%B8%B5/'
} as const;

const departments = {
  it: { th: 'ภาควิชาเทคโนโลยีสารสนเทศ', en: 'Department of Information Technology' },
  im: { th: 'ภาควิชาการจัดการอุตสาหกรรม', en: 'Department of Industrial Management' },
  cdm: { th: 'ภาควิชาการออกแบบและบริหารงานก่อสร้าง', en: 'Department of Construction Design and Management' },
  aei: { th: 'ภาควิชาวิศวกรรมเกษตรเพื่ออุตสาหกรรม', en: 'Department of Agricultural Engineering for Industry' },
  graduate: { th: 'หลักสูตรระดับบัณฑิตศึกษา', en: 'Graduate Programs' },
  schoolFactory: { th: 'หลักสูตรโรงเรียน–โรงงาน', en: 'School–Factory Programs' }
} as const satisfies Record<string, Localized>;

const latestAdmission = {
  th: 'โปรดตรวจสอบวุฒิที่รับสมัคร แผนการเรียน และเงื่อนไขล่าสุดจากประกาศรับสมัครของมหาวิทยาลัยก่อนสมัคร',
  en: 'Before applying, please verify eligible qualifications, study plans, and current requirements in the latest university admission announcement.'
} as const;

function program(input: {
  readonly slug: string;
  readonly name: Localized;
  readonly department?: Localized;
  readonly level: Localized;
  readonly summary: Localized;
  readonly description: Localized;
  readonly admission?: Localized;
  readonly source?: typeof fitmSource | typeof fitmAdmissionSource | typeof schoolFactorySource | typeof engineeringSource;
}): NewProgramSeed {
  return {
    slug: input.slug,
    data: programDataSchema.parse({
      name: input.name,
      department: input.department,
      level: input.level,
      summary: input.summary,
      description: input.description,
      admission: input.admission ?? latestAdmission,
      source: input.source ?? fitmSource
    })
  };
}

const conflictNotice: Localized = {
  th: 'ข้อมูลจากเอกสารแต่ละช่วงเวลามีรายละเอียดต่างกัน จึงไม่ยืนยันจำนวนหน่วยกิตหรือระยะเวลาส่วนที่ขัดกัน โปรดตรวจประกาศรับสมัครและหลักสูตรฉบับล่าสุดก่อนสมัคร',
  en: 'Available documents contain differing details, so conflicting credit totals or durations are not stated as confirmed. Please verify the latest curriculum and admission announcement before applying.'
};

export const fitmProgramSeeds: readonly NewProgramSeed[] = [
  program({
    slug: 'information-technology-it-4-year',
    department: departments.it,
    name: { th: 'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาเทคโนโลยีสารสนเทศ (IT)', en: 'Bachelor of Science Program in Information Technology (IT)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'พัฒนาความรู้และทักษะด้านเทคโนโลยีสารสนเทศ ซอฟต์แวร์ ข้อมูล และระบบดิจิทัล', en: 'Develops knowledge and skills in information technology, software, data, and digital systems.' },
    description: { th: 'หลักสูตรปริญญาตรี 4 ปีของภาควิชาเทคโนโลยีสารสนเทศ ข้อมูลหน่วยกิตและแผนรับสมัครให้ยึดประกาศล่าสุดของคณะ', en: 'A four-year undergraduate program offered by the Department of Information Technology. Refer to the latest faculty announcement for credits and admission plans.' }
  }),
  program({
    slug: 'information-technology-it-continuing',
    department: departments.it,
    name: { th: 'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาเทคโนโลยีสารสนเทศ แบบต่อเนื่อง (IT)', en: 'Bachelor of Science Program in Information Technology, Continuing Program (IT)' },
    level: { th: 'ปริญญาตรี แบบต่อเนื่อง', en: "Continuing bachelor's degree" },
    summary: { th: 'หลักสูตรต่อเนื่องสำหรับผู้มีพื้นฐานการศึกษาที่เกี่ยวข้องด้านเทคโนโลยีสารสนเทศ', en: 'A continuing program for applicants with relevant prior education in information technology.' },
    description: conflictNotice,
    source: fitmAdmissionSource
  }),
  program({
    slug: 'industrial-information-technology-iti',
    department: departments.it,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาเทคโนโลยีสารสนเทศอุตสาหกรรม (ITI)', en: 'Bachelor of Industrial Technology Program in Industrial Information Technology (ITI)' },
    level: { th: 'ปริญญาตรี เทียบโอน', en: "Transfer bachelor's degree" },
    summary: { th: 'ประยุกต์เทคโนโลยีสารสนเทศกับงานและระบบในภาคอุตสาหกรรม', en: 'Applies information technology to industrial work and systems.' },
    description: conflictNotice,
    source: fitmAdmissionSource
  }),
  program({
    slug: 'information-network-engineering-ine',
    department: departments.it,
    name: { th: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมสารสนเทศและเครือข่าย (INE)', en: 'Bachelor of Engineering Program in Information and Network Engineering (INE)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'เน้นระบบเครือข่าย การสื่อสารข้อมูล โครงสร้างพื้นฐาน และวิศวกรรมสารสนเทศ', en: 'Focuses on networks, data communications, infrastructure, and information engineering.' },
    description: { th: 'หลักสูตรวิศวกรรมศาสตรบัณฑิตสำหรับการออกแบบ พัฒนา และดูแลระบบสารสนเทศและเครือข่าย โปรดตรวจรายละเอียดค่าใช้จ่ายและแผนรับสมัครล่าสุด', en: 'An engineering program for designing, developing, and operating information and network systems. Verify current fees and admission plans in the latest announcement.' },
    source: fitmAdmissionSource
  }),
  program({
    slug: 'information-network-engineering-inet',
    department: departments.it,
    name: { th: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมสารสนเทศและเครือข่าย แบบเทียบโอน (INET)', en: 'Bachelor of Engineering Program in Information and Network Engineering, Transfer Program (INET)' },
    level: { th: 'ปริญญาตรี เทียบโอน', en: "Transfer bachelor's degree" },
    summary: { th: 'หลักสูตรเทียบโอนด้านวิศวกรรมสารสนเทศและระบบเครือข่าย', en: 'A transfer program in information and network engineering.' },
    description: conflictNotice,
    source: fitmAdmissionSource
  }),
  program({
    slug: 'industrial-engineering-logistics-iem69',
    department: departments.im,
    name: { th: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมอุตสาหการและโลจิสติกส์ (IEM69)', en: 'Bachelor of Engineering Program in Industrial Engineering and Logistics (IEM69)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'หลักสูตร 138 หน่วยกิต มุ่งเน้นวิศวกรรมอุตสาหการและการจัดการโลจิสติกส์', en: 'A 138-credit program focused on industrial engineering and logistics management.' },
    description: { th: 'บูรณาการการวางแผนการผลิต การปรับปรุงกระบวนการ คุณภาพ และโลจิสติกส์ รวม 138 หน่วยกิต', en: 'Integrates production planning, process improvement, quality, and logistics for a total of 138 credits.' },
    source: fitmAdmissionSource
  }),
  program({
    slug: 'industrial-engineering-management-iem',
    department: departments.im,
    name: { th: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมอุตสาหการและการจัดการ (IEM)', en: 'Bachelor of Engineering Program in Industrial Engineering and Management (IEM)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'หลักสูตร 145 หน่วยกิต ผสานวิศวกรรมอุตสาหการกับการบริหารจัดการ', en: 'A 145-credit program combining industrial engineering with management.' },
    description: { th: 'ศึกษาองค์ความรู้ทางวิศวกรรมอุตสาหการ ระบบการผลิต คุณภาพ และการจัดการองค์กร รวม 145 หน่วยกิต', en: 'Covers industrial engineering, production systems, quality, and organizational management for a total of 145 credits.' }
  }),
  program({
    slug: 'industrial-management-im',
    department: departments.im,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาการจัดการอุตสาหกรรม (IM)', en: 'Bachelor of Industrial Technology Program in Industrial Management (IM)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'พัฒนาทักษะการจัดการระบบการผลิต บุคลากร คุณภาพ และงานอุตสาหกรรม', en: 'Develops skills in managing production systems, people, quality, and industrial operations.' },
    description: { th: 'เน้นการประยุกต์เทคโนโลยีและหลักการบริหารเพื่อจัดการงานอุตสาหกรรม โปรดตรวจจำนวนหน่วยกิตจากหลักสูตรล่าสุด', en: 'Emphasizes applying technology and management principles to industrial operations. Verify the credit total in the latest curriculum.' }
  }),
  program({
    slug: 'industrial-management-production-imt',
    department: departments.im,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาการจัดการอุตสาหกรรม แขนงเทคโนโลยีการผลิต (IMT)', en: 'Bachelor of Industrial Technology Program in Industrial Management, Production Technology (IMT)' },
    level: { th: 'ปริญญาตรี เทียบโอน', en: "Transfer bachelor's degree" },
    summary: { th: 'แขนงเทคโนโลยีการผลิต จำนวน 97 หน่วยกิต', en: 'A 97-credit transfer track in production technology.' },
    description: { th: 'มุ่งเน้นการวางแผน ควบคุม และปรับปรุงเทคโนโลยีและกระบวนการผลิต รวม 97 หน่วยกิต', en: 'Focuses on planning, controlling, and improving production technologies and processes for a total of 97 credits.' }
  }),
  program({
    slug: 'industrial-management-logistics-imt',
    department: departments.im,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาการจัดการอุตสาหกรรม แขนงเทคโนโลยีโลจิสติกส์ (IMT)', en: 'Bachelor of Industrial Technology Program in Industrial Management, Logistics Technology (IMT)' },
    level: { th: 'ปริญญาตรี เทียบโอน', en: "Transfer bachelor's degree" },
    summary: { th: 'แขนงเทคโนโลยีโลจิสติกส์ จำนวน 97 หน่วยกิต', en: 'A 97-credit transfer track in logistics technology.' },
    description: { th: 'มุ่งเน้นการจัดการคลังสินค้า การขนส่ง การวางแผน และระบบโลจิสติกส์ รวม 97 หน่วยกิต', en: 'Focuses on warehousing, transportation, planning, and logistics systems for a total of 97 credits.' }
  }),
  program({
    slug: 'industrial-management-imt-general',
    department: departments.im,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาการจัดการอุตสาหกรรม (IMT)', en: 'Bachelor of Industrial Technology Program in Industrial Management (IMT)' },
    level: { th: 'ปริญญาตรี เทียบโอน', en: "Transfer bachelor's degree" },
    summary: { th: 'หลักสูตรเทียบโอนด้านการจัดการอุตสาหกรรม', en: 'A transfer program in industrial management.' },
    description: conflictNotice,
    source: fitmAdmissionSource
  }),
  program({
    slug: 'construction-design-management-cdm',
    department: departments.cdm,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาการออกแบบและบริหารงานก่อสร้าง (CDM)', en: 'Bachelor of Industrial Technology Program in Construction Design and Management (CDM)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'หลักสูตร 138 หน่วยกิต ครอบคลุมการออกแบบและบริหารโครงการก่อสร้าง', en: 'A 138-credit program covering construction design and project management.' },
    description: { th: 'ศึกษาเทคโนโลยีก่อสร้าง การเขียนแบบ การประมาณราคา การวางแผน และการบริหารงานก่อสร้าง รวม 138 หน่วยกิต', en: 'Covers construction technology, drafting, estimating, planning, and construction management for a total of 138 credits.' }
  }),
  program({
    slug: 'construction-design-management-cdm-transfer',
    department: departments.cdm,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาการออกแบบและบริหารงานก่อสร้าง แบบเทียบโอน (CDM)', en: 'Bachelor of Industrial Technology Program in Construction Design and Management, Transfer Program (CDM)' },
    level: { th: 'ปริญญาตรีเทียบโอน 2 ปีครึ่ง', en: "Two-and-a-half-year transfer bachelor's degree" },
    summary: { th: 'หลักสูตรเทียบโอน 94 หน่วยกิต ด้านการออกแบบและบริหารงานก่อสร้าง', en: 'A 94-credit transfer program in construction design and management.' },
    description: { th: 'ต่อยอดความรู้ด้านเทคโนโลยีก่อสร้างและการบริหารโครงการสำหรับผู้มีวุฒิที่เกี่ยวข้อง รวม 94 หน่วยกิต', en: 'Builds on prior construction knowledge for related diploma holders and totals 94 credits.' }
  }),
  program({
    slug: 'agricultural-food-engineering-afe',
    department: departments.aei,
    name: { th: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมเกษตรและอาหาร (AFE)', en: 'Bachelor of Engineering Program in Agricultural and Food Engineering (AFE)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'หลักสูตร 144 หน่วยกิต ด้านวิศวกรรมเกษตร กระบวนการ และอาหาร', en: 'A 144-credit program in agricultural, process, and food engineering.' },
    description: { th: 'ประยุกต์หลักวิศวกรรมกับเครื่องจักร ระบบการผลิต การแปรรูป และอุตสาหกรรมอาหาร รวม 144 หน่วยกิต', en: 'Applies engineering to machinery, production systems, processing, and the food industry for a total of 144 credits.' }
  }),
  program({
    slug: 'agricultural-food-engineering-afet',
    department: departments.aei,
    name: { th: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมเกษตรและอาหาร แบบเทียบโอน (AFET)', en: 'Bachelor of Engineering Program in Agricultural and Food Engineering, Transfer Program (AFET)' },
    level: { th: 'ปริญญาตรี เทียบโอน', en: "Transfer bachelor's degree" },
    summary: { th: 'หลักสูตรเทียบโอน 115 หน่วยกิต ด้านวิศวกรรมเกษตรและอาหาร', en: 'A 115-credit transfer program in agricultural and food engineering.' },
    description: { th: 'ต่อยอดพื้นฐานสายช่างและเทคโนโลยีสู่การประยุกต์วิศวกรรมเกษตรและอาหาร รวม 115 หน่วยกิต', en: 'Builds on technical and technology backgrounds toward agricultural and food engineering applications, totaling 115 credits.' }
  }),
  program({
    slug: 'mechanical-manufacturing-technology-mm',
    department: departments.aei,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาเทคโนโลยีเครื่องกลและการผลิต (MM)', en: 'Bachelor of Industrial Technology Program in Mechanical and Manufacturing Technology (MM)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'หลักสูตร 148 หน่วยกิต ด้านเครื่องกล กระบวนการผลิต และเทคโนโลยีอุตสาหกรรม', en: 'A 148-credit program in mechanics, manufacturing processes, and industrial technology.' },
    description: { th: 'ศึกษาเครื่องกล การออกแบบ กระบวนการผลิต การบำรุงรักษา และระบบโรงงาน รวม 148 หน่วยกิต', en: 'Covers mechanics, design, manufacturing processes, maintenance, and factory systems for a total of 148 credits.' }
  }),
  program({
    slug: 'mechanical-manufacturing-technology-mmt',
    department: departments.aei,
    name: { th: 'หลักสูตรอุตสาหกรรมศาสตรบัณฑิต สาขาวิชาเทคโนโลยีเครื่องกลและการผลิต แบบเทียบโอน (MMT)', en: 'Bachelor of Industrial Technology Program in Mechanical and Manufacturing Technology, Transfer Program (MMT)' },
    level: { th: 'ปริญญาตรี เทียบโอน', en: "Transfer bachelor's degree" },
    summary: { th: 'หลักสูตรเทียบโอน 91 หน่วยกิต ด้านเครื่องกลและการผลิต', en: 'A 91-credit transfer program in mechanical and manufacturing technology.' },
    description: { th: 'ต่อยอดความรู้สายช่างสู่เทคโนโลยีเครื่องกลและระบบการผลิต รวม 91 หน่วยกิต', en: 'Builds on technical education toward mechanical technology and manufacturing systems, totaling 91 credits.' }
  }),
  program({
    slug: 'engineering-management-mem',
    department: departments.graduate,
    name: { th: 'หลักสูตรวิศวกรรมศาสตรมหาบัณฑิต สาขาวิชาการจัดการวิศวกรรม ภาคปกติ (MEM)', en: 'Master of Engineering Program in Engineering Management, Regular Program (MEM)' },
    level: { th: 'ปริญญาโท ภาคปกติ', en: "Master's degree, regular program" },
    summary: { th: 'บูรณาการองค์ความรู้ด้านวิศวกรรม เทคโนโลยี และการบริหารจัดการ', en: 'Integrates engineering, technology, and management knowledge.' },
    description: { th: 'หลักสูตรระดับบัณฑิตศึกษาด้านการจัดการวิศวกรรมภาคปกติ โปรดตรวจแผนการศึกษาและหน่วยกิตจากหลักสูตรฉบับล่าสุด', en: 'A regular graduate program in engineering management. Verify study plans and credits in the latest curriculum.' }
  }),
  program({
    slug: 'engineering-management-s-mem',
    department: departments.graduate,
    name: { th: 'หลักสูตรวิศวกรรมศาสตรมหาบัณฑิต สาขาวิชาการจัดการวิศวกรรม ภาคพิเศษ (S-MEM)', en: 'Master of Engineering Program in Engineering Management, Special Program (S-MEM)' },
    level: { th: 'ปริญญาโท ภาคพิเศษ', en: "Master's degree, special program" },
    summary: { th: 'หลักสูตรการจัดการวิศวกรรมภาคพิเศษสำหรับการพัฒนาวิชาชีพ', en: 'A special engineering management program for professional development.' },
    description: { th: 'หลักสูตรระดับบัณฑิตศึกษาภาคพิเศษ โปรดตรวจวันเรียน แผนการศึกษา และหน่วยกิตจากประกาศล่าสุด', en: 'A special graduate program. Verify class schedules, study plans, and credits in the latest announcement.' }
  }),
  program({
    slug: 'industrial-technology-management-mim',
    department: departments.graduate,
    name: { th: 'หลักสูตรระดับบัณฑิตศึกษา สาขาวิชาการจัดการเทคโนโลยีอุตสาหกรรม (MIM)', en: 'Graduate Program in Industrial Technology Management (MIM)' },
    level: { th: 'ระดับบัณฑิตศึกษา', en: 'Graduate degree' },
    summary: { th: 'หลักสูตรด้านการบริหารจัดการเทคโนโลยีและระบบอุตสาหกรรม', en: 'A program in managing technology and industrial systems.' },
    description: conflictNotice
  }),
  program({
    slug: 'technology-innovation-modern-mechanics-timm',
    department: departments.schoolFactory,
    name: { th: 'หลักสูตรเทคโนโลยีนวัตกรรมช่างกลสมัยใหม่ (TIMM)', en: 'Technology Innovation in Modern Mechanics Program (TIMM)' },
    level: { th: 'หลักสูตรโรงเรียน–โรงงาน', en: 'School–Factory program' },
    summary: { th: 'หลักสูตรโรงเรียน–โรงงานที่เชื่อมการเรียนรู้กับทักษะปฏิบัติด้านช่างกลสมัยใหม่', en: 'A School–Factory program linking education with practical modern-mechanics skills.' },
    description: { th: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรมเป็นหน่วยงานรับผิดชอบหลักสูตร TIMM รายละเอียดทุน คุณสมบัติ และรูปแบบการเรียนให้ตรวจประกาศล่าสุด', en: 'FITM is responsible for the TIMM program. Verify current scholarships, eligibility, and study format in the latest announcement.' },
    source: schoolFactorySource
  }),
  program({
    slug: 'technology-innovation-electrical-electronics-tiee',
    department: departments.schoolFactory,
    name: { th: 'หลักสูตรเทคโนโลยีนวัตกรรมไฟฟ้าและอิเล็กทรอนิกส์ (TIEE)', en: 'Technology Innovation in Electrical and Electronics Program (TIEE)' },
    level: { th: 'หลักสูตรโรงเรียน–โรงงาน', en: 'School–Factory program' },
    summary: { th: 'หลักสูตรโรงเรียน–โรงงานที่เชื่อมการเรียนรู้กับทักษะปฏิบัติด้านไฟฟ้าและอิเล็กทรอนิกส์', en: 'A School–Factory program linking education with practical electrical and electronics skills.' },
    description: { th: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรมเป็นหน่วยงานรับผิดชอบหลักสูตร TIEE รายละเอียดทุน คุณสมบัติ และรูปแบบการเรียนให้ตรวจประกาศล่าสุด', en: 'FITM is responsible for the TIEE program. Verify current scholarships, eligibility, and study format in the latest announcement.' },
    source: schoolFactorySource
  })
];

export const engineeringProgramSeeds: readonly NewProgramSeed[] = [
  program({
    slug: 'instrumentation-automation-engineering-inae',
    name: { th: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมเครื่องมือวัดและอัตโนมัติ (InAE)', en: 'Bachelor of Engineering Program in Instrumentation and Automation Engineering (InAE)' },
    level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
    summary: { th: 'พัฒนาความรู้ด้านเครื่องมือวัด ระบบควบคุม และระบบอัตโนมัติในงานวิศวกรรม', en: 'Develops expertise in instrumentation, control systems, and engineering automation.' },
    description: { th: 'หลักสูตรวิศวกรรม 4 ปีด้านการวัด การควบคุม อิเล็กทรอนิกส์ และระบบอัตโนมัติ โปรดตรวจแผนรับสมัครล่าสุดของคณะวิศวกรรมศาสตร์', en: 'A four-year engineering program in measurement, control, electronics, and automation. Verify the latest Faculty of Engineering admission plan.' },
    source: engineeringSource
  })
];

export const businessAdditionalProgramSeeds: readonly NewProgramSeed[] = [
  program({
    slug: 'technology-innovation-logistics-digital-management-tilm',
    name: { th: 'หลักสูตรเทคโนโลยีนวัตกรรมการจัดการโลจิสติกส์และดิจิทัล (TILM)', en: 'Technology Innovation in Logistics and Digital Management Program (TILM)' },
    level: { th: 'หลักสูตรโรงเรียน–โรงงาน', en: 'School–Factory program' },
    summary: { th: 'หลักสูตรโรงเรียน–โรงงานด้านโลจิสติกส์ การจัดการ และเทคโนโลยีดิจิทัล', en: 'A School–Factory program in logistics, management, and digital technology.' },
    description: { th: 'คณะบริหารธุรกิจและอุตสาหกรรมบริการเป็นหน่วยงานรับผิดชอบหลักสูตร TILM โปรดตรวจคุณสมบัติ ทุน และรูปแบบการเรียนจากประกาศล่าสุด', en: 'The Faculty of Business Administration and Service Industry is responsible for TILM. Verify current eligibility, scholarships, and study format in the latest announcement.' },
    source: schoolFactorySource
  })
];

export const digitalAgroAdditionalProgramSeeds: readonly NewProgramSeed[] = [
  program({
    slug: 'technology-innovation-herbal-beauty-tihb',
    name: { th: 'หลักสูตรเทคโนโลยีนวัตกรรมสมุนไพรและความงาม (TIHB)', en: 'Technology Innovation in Herbal and Beauty Products Program (TIHB)' },
    level: { th: 'หลักสูตรโรงเรียน–โรงงาน', en: 'School–Factory program' },
    summary: { th: 'หลักสูตรโรงเรียน–โรงงานด้านสมุนไพร ผลิตภัณฑ์สุขภาพ และความงาม', en: 'A School–Factory program in herbs, health products, and beauty products.' },
    description: { th: 'คณะอุตสาหกรรมเกษตรดิจิทัลเป็นหน่วยงานรับผิดชอบหลักสูตร TIHB โปรดตรวจคุณสมบัติ ทุน และรูปแบบการเรียนจากประกาศล่าสุด', en: 'The Faculty of Digital Agro-Industry is responsible for TIHB. Verify current eligibility, scholarships, and study format in the latest announcement.' },
    source: schoolFactorySource
  })
];
