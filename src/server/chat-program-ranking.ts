import type { ProgramRecommendation, RecommendationProfile } from '../chat';
import type { ProgramContent, PublicContentSnapshot } from '../content';
import type { Locale } from '../tour-data';
import { chatTokens, compactChatLookup } from './chat-intents';

export const INTEREST_ALIASES: readonly (readonly string[])[] = [
  ['คอมพิวเตอร์', 'เขียนโปรแกรม', 'โปรแกรมเมอร์', 'ซอฟต์แวร์', 'วิเคราะห์ข้อมูล', 'ไอที', 'computer', 'programming', 'programmer', 'software', 'data science', 'it'],
  ['อาหาร', 'โภชนาการ', 'แปรรูป', 'food', 'nutrition', 'processing'],
  ['ธุรกิจ', 'บริหาร', 'การค้า', 'ผู้ประกอบการ', 'business', 'management', 'trade', 'entrepreneur'],
  ['ท่องเที่ยว', 'โรงแรม', 'บริการ', 'tourism', 'hotel', 'hospitality', 'service'],
  ['หุ่นยนต์', 'อัตโนมัติ', 'เครื่องกล', 'ไฟฟ้า', 'robot', 'automation', 'mechanical', 'electrical'],
  ['โลจิสติกส์', 'ขนส่ง', 'ห่วงโซ่อุปทาน', 'logistics', 'transport', 'supply chain'],
  ['ออกแบบ', 'สื่อ', 'มัลติมีเดีย', 'design', 'media', 'multimedia'],
  ['เกษตร', 'นวัตกรรม', 'agriculture', 'innovation']
];

export function profileLookupText(profile: RecommendationProfile): string {
  const qualification = {
    m3: 'ม.3 lower secondary school',
    'm6-pvoc': 'ม.6 ปวช upper secondary vocational certificate',
    'high-vocational': 'ปวส higher vocational diploma',
    bachelor: 'ปริญญาตรี bachelor degree',
    other: 'วุฒิอื่น other qualification'
  }[profile.currentQualification];
  const level = {
    vocational: 'อาชีวศึกษา vocational',
    bachelor: 'ปริญญาตรี bachelor',
    transfer: 'เทียบโอน transfer',
    master: 'ปริญญาโท master',
    unsure: 'ยังไม่แน่ใจ unsure'
  }[profile.desiredLevel];
  return `${profile.interests} ${qualification} ${level}`;
}

function recommendationReason(program: ProgramContent, profile: RecommendationProfile, locale: Locale): string {
  const terms = expandedInterestTerms(profile.interests);
  const tag = [...(program.interestTags?.[locale] ?? []), ...(program.careerTags?.[locale] ?? [])]
    .find((value) => fieldInterestScore(terms, value, 1) > 0);
  if (locale === 'th') {
    return tag
      ? `เนื้อหาหลักสูตรเกี่ยวข้องกับ “${tag}” ซึ่งสอดคล้องกับความสนใจ “${profile.interests}”`
      : `ชื่อ สรุป และรายละเอียดหลักสูตรมีเนื้อหาที่สอดคล้องกับความสนใจ “${profile.interests}” และระดับการศึกษาที่ระบุ`;
  }
  return tag
    ? `The program covers “${tag}”, which aligns with the interest in “${profile.interests}”.`
    : `The program name, summary, and details align with “${profile.interests}” and the selected study level.`;
}

type QualificationStatus = 'matched' | 'unknown' | 'incompatible';

function programQualificationStatus(program: ProgramContent, profile: RecommendationProfile): QualificationStatus {
  const level = `${program.level.th} ${program.level.en} ${program.name.th} ${program.name.en}`.toLocaleLowerCase();
  const admission = `${program.admission.th} ${program.admission.en}`.toLocaleLowerCase();
  // Structured level wins over prose; master/transfer must never be read as bachelor.
  const studyLevel = program.studyLevel
    ?? (/(ปริญญาโท|มหาบัณฑิต|master)/u.test(level) ? 'master'
      : /(เทียบโอน|ต่อเนื่อง|transfer|continuing)/u.test(level) ? 'transfer'
        : /(ประกาศนียบัตร|ปวช|อาชีว|vocational|school.?factory|โรงเรียน.?โรงงาน)/u.test(level) ? 'vocational'
          : /(ปริญญาตรี|บัณฑิต|bachelor)/u.test(level) ? 'bachelor' : undefined);
  if (!studyLevel || (profile.desiredLevel !== 'unsure' && studyLevel !== profile.desiredLevel)) return 'incompatible';
  const plausibleLevels = {
    m3: ['vocational'],
    'm6-pvoc': ['bachelor'],
    'high-vocational': ['bachelor', 'transfer'],
    bachelor: ['bachelor', 'transfer', 'master'],
    other: ['vocational', 'bachelor', 'transfer', 'master']
  };
  if (!plausibleLevels[profile.currentQualification].includes(studyLevel)) return 'incompatible';
  if (profile.currentQualification === 'other') return 'unknown';
  if (program.eligibleQualifications?.length) {
    return program.eligibleQualifications.includes(profile.currentQualification) ? 'matched' : 'incompatible';
  }
  // Only admission text can confirm a qualification, not the program's degree name.
  const qualifications = {
    m3: /(ม\.?\s*3|มัธยม(?:ศึกษา)?(?:ปีที่\s*3|ตอนต้น)|lower secondary)/u,
    'm6-pvoc': /(ม\.?\s*6|ปวช|มัธยม(?:ศึกษา)?(?:ปีที่\s*6|ตอนปลาย)|upper secondary|vocational certificate)/u,
    'high-vocational': /(ปวส|higher vocational)/u,
    bachelor: /(ปริญญาตรี|bachelor)/u
  };
  const known = Object.entries(qualifications).filter(([, pattern]) => pattern.test(admission)).map(([qualification]) => qualification);
  if (!known.length) return 'unknown';
  const excluded = Object.entries(qualifications).filter(([, pattern]) => new RegExp(
    `(?:ไม่รับ|ยกเว้น|not accept|except|not eligible)\\s*(?:ผู้จบ|วุฒิ|ผู้สำเร็จการศึกษา|graduates (?:of|with)|those with)?\\s*${pattern.source}`, 'iu'
  ).test(admission)).map(([qualification]) => qualification);
  if (excluded.includes(profile.currentQualification)) return 'incompatible';
  // An exclusion alone does not confirm that a different qualification is accepted.
  if (excluded.length && known.every((qualification) => excluded.includes(qualification))) return 'unknown';
  if (!excluded.length && /(ไม่รับ|ยกเว้น|not accept|except|not eligible)/u.test(admission)) return 'unknown';
  return known.includes(profile.currentQualification) ? 'matched' : 'incompatible';
}

/** Latin abbreviations must be whole words: IT must not match hospitality or university. */
export function matchesInterestTerm(value: string, term: string): boolean {
  if (/^[a-z0-9 ]+$/iu.test(term)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'iu').test(value);
  }
  return compactChatLookup(value).includes(compactChatLookup(term));
}

function expandedInterestTerms(value: string): Set<string> {
  const normalized = compactChatLookup(value);
  const result = new Set(chatTokens(value).map(compactChatLookup));
  if (normalized) result.add(normalized);
  for (const group of INTEREST_ALIASES) {
    if (group.some((term) => matchesInterestTerm(value, term))) group.forEach((term) => result.add(term.toLocaleLowerCase()));
  }
  return result;
}

function fieldInterestScore(queryTerms: ReadonlySet<string>, value: string, weight: number): number {
  let matches = 0;
  for (const term of queryTerms) if (term.length >= 2 && matchesInterestTerm(value, term)) matches += 1;
  return matches * weight;
}

export function rankProgramsForProfile(profile: RecommendationProfile, content: PublicContentSnapshot, locale: Locale, limit = 3): ProgramRecommendation[] {
  const queryTerms = expandedInterestTerms(profile.interests);
  const scored = content.programs.map((program, index) => {
    const qualificationStatus = programQualificationStatus(program, profile);
    const weighted = [
      { value: [...(program.interestTags?.th ?? []), ...(program.interestTags?.en ?? [])].join(' '), weight: 14 },
      { value: [...(program.careerTags?.th ?? []), ...(program.careerTags?.en ?? [])].join(' '), weight: 12 },
      { value: `${program.name.th} ${program.name.en} ${program.department?.th ?? ''} ${program.department?.en ?? ''}`, weight: 7 },
      { value: `${program.summary.th} ${program.summary.en} ${program.description.th} ${program.description.en}`, weight: 3 }
    ];
    const interestScore = weighted.reduce((total, entry) => total + fieldInterestScore(queryTerms, entry.value, entry.weight), 0);
    return { program, qualificationStatus, interestScore, index };
  })
    .filter((entry) => entry.qualificationStatus !== 'incompatible' && entry.interestScore > 0)
    .sort((a, b) => Number(a.qualificationStatus === 'unknown') - Number(b.qualificationStatus === 'unknown')
      || b.interestScore - a.interestScore || a.index - b.index);

  return scored.slice(0, Math.max(1, limit)).map(({ program, qualificationStatus }) => ({
    programId: program.id,
    facultyId: program.facultyId,
    reason: recommendationReason(program, profile, locale) + (qualificationStatus === 'unknown'
      ? locale === 'th' ? ' ยังยืนยันคุณสมบัติรับสมัครไม่ได้ ต้องตรวจวุฒิและประกาศรับสมัครของหลักสูตรเพิ่มเติม' : ' Admission eligibility is not confirmed; check the program’s qualifications and current admission notice.'
      : '')
  }));
}
