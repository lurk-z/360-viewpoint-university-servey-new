import type { ChatRequest } from '../chat';
import type { PublicContentSnapshot } from '../content';

export function chatTokens(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu)?.filter((token) => token.length > 1) ?? [];
}

export function compactChatLookup(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '');
}

export function isRecommendationIntent(message: string): boolean {
  return /(แนะนำ.*(หลักสูตร|สาขา)|ควรเรียน|เรียน(?:อะไร|ไหนดี|คณะไหน|สาขาไหน)|เหมาะกับ.*(?:สาขา|คณะ)|สนใจ.*เรียน|recommend.*(program|course)|what should i study)/iu.test(message);
}

export function isCareerIntent(message: string): boolean {
  return /(อาชีพ|จบ.*(?:ทำงาน|ทำอะไร|เป็นอะไร)|อยากเป็น|งานในอนาคต|career|job prospects|work after|become (?:a|an)\b)/iu.test(message);
}

export function isProgramListIntent(message: string): boolean {
  return /(?:หลักสูตร|สาขา|programs?|courses?).*(?:อะไร|บ้าง|เปิดสอน|มี|offer|available)|(?:เปิดสอน|มี).*(?:หลักสูตร|สาขา)|(?:list|what|which).*(?:programs?|courses?)/iu.test(message);
}

export function isActivityListIntent(message: string): boolean {
  return /(มีกิจกรรมอะไร(?:บ้าง)?|กิจกรรม(?:ที่มี|ทั้งหมด|ช่วงนี้|ภายในมหาวิทยาลัย)|แนะนำกิจกรรม|what activities|list activities|upcoming activities)/iu.test(message);
}

export function isFacultyOverviewIntent(message: string): boolean {
  return /(มีคณะอะไร(?:บ้าง)?|คณะ(?:ที่มี|ทั้งหมด|ในมจพ|ในมหาวิทยาลัย|ในวิทยาเขต)|แนะนำคณะ(?:ในมจพ|ในมหาวิทยาลัย|ในวิทยาเขต|หน่อย)?|what faculties|list faculties|faculties.*(?:campus|university))/iu.test(message);
}

export function isTourIntent(message: string): boolean {
  return /(พา.*ไป|นำทาง|เส้นทางไป|อยากไป|ไปยัง|ไปที่|guide me|take me|navigate|route to|how.*get to)/iu.test(message);
}

export function isGenericTourIntent(message: string): boolean {
  const value = message.trim().replace(/[!?。]+$/u, '').replace(/\s+/gu, ' ');
  return /^(?:ช่วย|ขอ|อยาก)?\s*(?:พา(?:ชม|เที่ยว|ทัว(?:ร์)?)|เริ่มทัว(?:ร์)?|ชมรอบมหาวิทยาลัย|ทัว(?:ร์)?)(?:มหาวิทยาลัย)?(?:\s*(?:ให้|ดู|หน่อย|ได้ไหม|ครับ|ค่ะ|คะ|ที))*$|^(?:please\s+)?(?:tour me|give me a (?:campus )?tour|start (?:a |the )?tour|take me (?:on a tour|around)|guide me)(?:\s+please)?$/iu.test(value);
}

export function isContextReferenceIntent(message: string): boolean {
  return /(ที่นั่น|ตรงนั้น|คณะนั้น|สถานที่นั้น|อันนั้น|จุดนั้น|there|that place|that faculty|the second|the first|the third)/iu.test(message);
}

export function isComparisonIntent(message: string): boolean {
  return /(เปรียบเทียบ|เทียบ.*หลักสูตร|ต่างกัน.*อย่างไร|compare|difference between)/iu.test(message);
}

export function isCurrentViewIntent(message: string): boolean {
  return /(กำลังมอง|มองเห็นอะไร|ตรงหน้าคือ|ข้างหน้าคือ|what am i looking|what is in front)/iu.test(message);
}

export function ordinalIndex(message: string): number | undefined {
  const normalized = compactChatLookup(message);
  const terms = [
    ['อันแรก', 'รายการแรก', 'หลักสูตรแรก', 'first'],
    ['อันที่สอง', 'รายการที่สอง', 'หลักสูตรที่สอง', 'second'],
    ['อันที่สาม', 'รายการที่สาม', 'หลักสูตรที่สาม', 'third'],
    ['อันที่สี่', 'รายการที่สี่', 'คณะที่สี่', 'fourth']
  ] as const;
  const index = terms.findIndex((group) => group.some((term) => normalized.includes(compactChatLookup(term))));
  return index >= 0 ? index : undefined;
}

function includesCode(question: string, code: string): boolean {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(question);
}

function mentionedProgramIds(question: string, content: PublicContentSnapshot): string[] {
  const compactQuestion = compactChatLookup(question);
  return content.programs.flatMap((program) => {
    const code = program.name.en.match(/\(([^)]+)\)\s*$/)?.[1];
    const named = [program.name.th, program.name.en, program.slug]
      .map(compactChatLookup)
      .some((name) => name.length >= 6 && compactQuestion.includes(name));
    return named || (code && includesCode(question, code)) ? [program.id] : [];
  });
}

export function contextualProgramIds(request: ChatRequest, content: PublicContentSnapshot): string[] {
  const mentioned = mentionedProgramIds(request.message, content);
  if (mentioned.length > 0) return mentioned;
  const validIds = new Set(content.programs.map((program) => program.id));
  const previousIds = request.conversationContext?.lastProgramIds.filter((id) => validIds.has(id)) ?? [];
  const ordinal = ordinalIndex(request.message);
  if (ordinal !== undefined) return previousIds[ordinal] ? [previousIds[ordinal]] : [];
  return isComparisonIntent(request.message) ? previousIds.slice(0, 3) : [];
}
