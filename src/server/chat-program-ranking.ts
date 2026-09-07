import type { ProgramRecommendation, RecommendationProfile } from '../chat';
import type { ProgramContent, PublicContentSnapshot } from '../content';
import type { Locale } from '../tour-data';
import { chatTokens, compactChatLookup } from './chat-intents';

export const INTEREST_ALIASES: readonly (readonly string[])[] = [
  ['คอมพิวเตอร์', 'เขียนโปรแกรม', 'ซอฟต์แวร์', 'ข้อมูล', 'ไอที', 'computer', 'programming', 'software', 'data', 'it'],
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
  const tag = program.interestTags?.[locale][0] ?? program.careerTags?.[locale][0];
  if (locale === 'th') {
    return tag
      ? `เนื้อหาหลักสูตรเกี่ยวข้องกับ “${tag}” ซึ่งสอดคล้องกับความสนใจ “${profile.interests}”`
      : `ชื่อ สรุป และรายละเอียดหลักสูตรมีเนื้อหาที่สอดคล้องกับความสนใจ “${profile.interests}” และระดับการศึกษาที่ระบุ`;
  }
  return tag
    ? `The program covers “${tag}”, which aligns with the interest in “${profile.interests}”.`
    : `The program name, summary, and details align with “${profile.interests}” and the selected study level.`;
}

function programLevelCompatibility(program: ProgramContent, profile: RecommendationProfile): { readonly compatible: boolean; readonly score: number } {
  const level = `${program.level.th} ${program.level.en} ${program.name.th} ${program.name.en}`.toLocaleLowerCase();
  const admission = `${program.admission.th} ${program.admission.en}`.toLocaleLowerCase();
  const signals = {
    vocational: /(ประกาศนียบัตร|ปวช|อาชีว|vocational|school.?factory|โรงเรียน.?โรงงาน)/u.test(level),
    transfer: /(เทียบโอน|ต่อเนื่อง|transfer|continuing)/u.test(level),
    master: /(ปริญญาโท|มหาบัณฑิต|master)/u.test(level),
    bachelor: /(ปริญญาตรี|บัณฑิต|bachelor)/u.test(level)
  };
  let score = 0;
  if (profile.desiredLevel !== 'unsure') {
    const levelMatches = program.studyLevel
      ? program.studyLevel === profile.desiredLevel
      : profile.desiredLevel === 'bachelor'
        ? signals.bachelor && !signals.transfer
        : signals[profile.desiredLevel];
    if (!levelMatches) return { compatible: false, score: 0 };
    score += 240;
  }
  const qualificationMatch = program.eligibleQualifications?.length
    ? program.eligibleQualifications.includes(profile.currentQualification)
    : ({
      m3: signals.vocational || /(ม\.\s*3|lower secondary)/u.test(admission),
      'm6-pvoc': signals.bachelor && !signals.transfer && /(ม\.\s*6|ปวช|upper secondary|vocational certificate)/u.test(admission),
      'high-vocational': signals.transfer || /(ปวส|higher vocational)/u.test(admission),
      bachelor: signals.master || /(ปริญญาตรี|bachelor)/u.test(admission),
      other: true
    }[profile.currentQualification]);
  if (!qualificationMatch && profile.currentQualification !== 'other') return { compatible: false, score: 0 };
  return { compatible: true, score: score + (qualificationMatch ? 120 : 0) };
}

function expandedInterestTerms(value: string): Set<string> {
  const normalized = compactChatLookup(value);
  const result = new Set(chatTokens(value).map(compactChatLookup));
  if (normalized) result.add(normalized);
  for (const group of INTEREST_ALIASES) {
    if (group.some((term) => normalized.includes(compactChatLookup(term)))) group.forEach((term) => result.add(compactChatLookup(term)));
  }
  return result;
}

function fieldInterestScore(queryTerms: ReadonlySet<string>, value: string, weight: number): number {
  const compactValue = compactChatLookup(value);
  let matches = 0;
  for (const term of queryTerms) if (term.length >= 2 && compactValue.includes(term)) matches += 1;
  return matches * weight;
}

export function rankProgramsForProfile(profile: RecommendationProfile, content: PublicContentSnapshot, locale: Locale, limit = 3): ProgramRecommendation[] {
  const queryTerms = expandedInterestTerms(profile.interests);
  const scored = content.programs.map((program, index) => {
    const compatibility = programLevelCompatibility(program, profile);
    const weighted = [
      { value: [...(program.interestTags?.th ?? []), ...(program.interestTags?.en ?? [])].join(' '), weight: 14 },
      { value: [...(program.careerTags?.th ?? []), ...(program.careerTags?.en ?? [])].join(' '), weight: 12 },
      { value: `${program.name.th} ${program.name.en} ${program.department?.th ?? ''} ${program.department?.en ?? ''}`, weight: 7 },
      { value: `${program.summary.th} ${program.summary.en} ${program.description.th} ${program.description.en}`, weight: 3 },
      { value: `${program.level.th} ${program.level.en} ${program.admission.th} ${program.admission.en}`, weight: 5 }
    ];
    const interestScore = weighted.reduce((total, entry) => total + fieldInterestScore(queryTerms, entry.value, entry.weight), 0);
    return { program, compatibility, interestScore, score: compatibility.score + interestScore, index };
  })
    .filter((entry) => entry.compatibility.compatible && entry.interestScore > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, Math.max(1, limit)).map(({ program }) => ({
    programId: program.id,
    facultyId: program.facultyId,
    reason: recommendationReason(program, profile, locale)
  }));
}
