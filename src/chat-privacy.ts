export type PersonalDataKind = 'email' | 'phone' | 'national-id' | 'student-id';

export interface PersonalDataMatch {
  readonly kind: PersonalDataKind;
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const THAI_PHONE_PATTERN = /(?:\+?66|0)[\s().-]*(?:\d[\s().-]*){8,9}/u;
const THAI_NATIONAL_ID_PATTERN = /(?<!\d)\d(?:[\s-]*\d){12}(?!\d)/u;
const STUDENT_ID_PATTERN = /(?:รหัส(?:นักศึกษา|ประจำตัว)|student\s*(?:id|number))\s*[:#-]?\s*[A-Z0-9-]{6,20}/iu;

export function detectPersonalData(value: string): PersonalDataMatch | null {
  if (EMAIL_PATTERN.test(value)) return { kind: 'email' };
  if (THAI_PHONE_PATTERN.test(value)) return { kind: 'phone' };
  if (THAI_NATIONAL_ID_PATTERN.test(value)) return { kind: 'national-id' };
  if (STUDENT_ID_PATTERN.test(value)) return { kind: 'student-id' };
  return null;
}

export function containsPersonalData(value: string): boolean {
  return detectPersonalData(value) !== null;
}
