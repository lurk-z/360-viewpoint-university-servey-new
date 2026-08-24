import type {
  ProgramData,
  ProgramEligibleQualification,
  ProgramStudyLevel
} from './content.ts';

function programSearchText(program: ProgramData): string {
  return [
    program.name.th,
    program.name.en,
    program.level.th,
    program.level.en,
    program.summary.th,
    program.summary.en,
    program.description.th,
    program.description.en,
    program.admission.th,
    program.admission.en
  ].join(' ').normalize('NFKC').toLocaleLowerCase();
}

export function inferProgramStudyLevel(program: ProgramData): ProgramStudyLevel | undefined {
  const text = `${program.name.th} ${program.name.en} ${program.level.th} ${program.level.en}`.normalize('NFKC').toLocaleLowerCase();
  if (/(ปริญญาโท|มหาบัณฑิต|บัณฑิตศึกษา|master|graduate degree)/u.test(text)) return 'master';
  if (/(เทียบโอน|ต่อเนื่อง|transfer|continuing)/u.test(text)) return 'transfer';
  if (/(โรงเรียน.?โรงงาน|ประกาศนียบัตร|school.?factory|vocational)/u.test(text)) return 'vocational';
  if (/(ปริญญาตรี|บัณฑิต|bachelor)/u.test(text)) return 'bachelor';
  return undefined;
}

export function inferProgramEligibleQualifications(program: ProgramData): ProgramEligibleQualification[] {
  const text = programSearchText(program);
  const values: ProgramEligibleQualification[] = [];
  if (/(ม\.\s*3|มัธยมศึกษาตอนต้น|lower secondary|mathayom 3)/u.test(text)) values.push('m3');
  if (/(ม\.\s*6|มัธยมศึกษาตอนปลาย|ปวช|upper secondary|mathayom 6|por wor chor)/u.test(text)) values.push('m6-pvoc');
  if (/(ปวส|ประกาศนียบัตรวิชาชีพชั้นสูง|higher vocational|por wor sor)/u.test(text)) values.push('high-vocational');
  if (/(รับผู้สำเร็จการศึกษาระดับปริญญาตรี|วุฒิปริญญาตรี|hold a bachelor|bachelor's degree in any field)/u.test(text)) values.push('bachelor');
  return [...new Set(values)];
}

export function hasMissingProgramRecommendationData(program: ProgramData): boolean {
  return !program.interestTags?.th.length
    || !program.interestTags.en.length
    || !program.careerTags?.th.length
    || !program.careerTags.en.length
    || (!program.studyLevel && Boolean(inferProgramStudyLevel(program)))
    || (!program.eligibleQualifications?.length && inferProgramEligibleQualifications(program).length > 0);
}
