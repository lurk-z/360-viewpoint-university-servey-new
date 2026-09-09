import { describe, expect, it, vi } from 'vitest';
import { chatRequestSchema, type ChatRequest } from './chat';
import { createFallbackContentSnapshot, type PublicContentSnapshot } from './content';
import { answerGroundedQuestion, rankProgramsForProfile } from './server/chat-service';
import { consumeAiQuota } from './server/ai-usage';

vi.mock('./server/ai-usage', () => ({ consumeAiQuota: vi.fn(() => { throw new Error('Deterministic guidance must not consume Gemini quota'); }) }));

const faculty = {
  id: 'd931a670-03f0-4d1c-82e2-66e728b51ba9', slug: 'fitm', sceneId: 'campusRoad36',
  name: { th: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม', en: 'Faculty of Industrial Technology and Management' },
  summary: { th: 'เทคโนโลยี', en: 'Technology' }, description: { th: 'รายละเอียด', en: 'Details' }, images: [],
  source: { label: { th: 'คณะ', en: 'Faculty' } }
} as const;
const program = {
  id: 'f0961f20-26ac-4a75-92c0-026bb834fcb0', facultyId: faculty.id, slug: 'information-technology',
  name: { th: 'เทคโนโลยีสารสนเทศ (IT)', en: 'Information Technology (IT)' },
  level: { th: 'ปริญญาตรี', en: 'Bachelor degree' }, studyLevel: 'bachelor', eligibleQualifications: ['m6-pvoc'],
  summary: { th: 'ซอฟต์แวร์และข้อมูล', en: 'Software and data' }, description: { th: 'เขียนโปรแกรม', en: 'Programming' },
  admission: { th: 'ม.6 และ ปวช.', en: 'Upper secondary or vocational certificate' },
  interestTags: { th: ['เขียนโปรแกรม'], en: ['software'] },
  careerTags: { th: ['นักพัฒนาซอฟต์แวร์'], en: ['Software developer'] }, source: faculty.source
} as const;
const content: PublicContentSnapshot = {
  ...createFallbackContentSnapshot(), faculties: [faculty], programs: [program, {
    ...program, id: 'dc8fd088-698a-452d-a55a-5b707b8c9dc0', slug: 'hospitality',
    name: { th: 'การโรงแรม', en: 'Hospitality' }, summary: { th: 'โรงแรม', en: 'Hospitality' },
    description: { th: 'การโรงแรม', en: 'University hospitality studies' },
    interestTags: { th: ['โรงแรม'], en: ['hospitality'] }, careerTags: { th: ['งานโรงแรม'], en: ['Hotel work'] }
  }]
};
const request = (message: string): ChatRequest => ({ message, locale: 'th', sceneId: 'entrance', history: [] });
const context = { lastProgramIds: [], lastFacultyIds: [], lastSceneIds: [], awaitingTourPreference: true };

describe('guided conversations', () => {
  it.each(['พาทัว', 'พาทัวหน่อย', 'ช่วยพาทัวร์หน่อยครับ', 'ขอพาทัวร์หน่อย', 'take me around', 'guide me'])('asks and offers choices for %s', async (message) => {
    const result = await answerGroundedQuestion(request(message), content);
    expect(result.needsTourPreference).toBe(true);
    expect(result.tourPlan).toBeUndefined();
    expect(result.suggestedReplies?.length).toBeGreaterThan(2);
    expect(consumeAiQuota).not.toHaveBeenCalled();
  });

  it('offers separate dormitories and prepares exactly the destination the visitor selects', async () => {
    const choices = await answerGroundedQuestion({ ...request('หอพัก'), conversationContext: context }, content);
    expect(choices.tourPlan).toBeUndefined();
    expect(choices.suggestedReplies?.map((r) => r.sceneId)).toEqual(['maleDormitory', 'femaleDormitory1', 'femaleDormitory2']);
    const result = await answerGroundedQuestion({ ...request('ชมหอพักหญิง 2'), selectedTourSceneId: 'femaleDormitory2' }, content);
    expect(result.tourPlan?.destinationSceneId).toBe('femaleDormitory2');
    expect(chatRequestSchema.safeParse({ ...request('go'), selectedTourSceneId: 'invented' }).success).toBe(false);
  });

  it('lets a visitor change from a pending tour to career guidance', async () => {
    const result = await answerGroundedQuestion({ ...request('อยากเป็นโปรแกรมเมอร์'), conversationContext: context }, content);
    expect(result.intent).toBe('career-guidance');
    expect(result.needsRecommendationProfile).toBe(true);
    expect(result.needsTourPreference).toBe(false);
    expect(result.suggestedInterests).toContain('โปรแกรมเมอร์');
  });

  it('uses a complete typed profile and does not match IT inside hospitality', async () => {
    const result = await answerGroundedQuestion({
      ...request('สนใจ IT จบ ม.6 อยากเรียนปริญญาตรี'),
      conversationContext: { ...context, awaitingTourPreference: false, awaitingRecommendationProfile: true }
    }, content);
    expect(result.programRecommendations.map((r) => r.programId)).toEqual([program.id]);
    expect(result.careerGuidance?.[0]).toEqual({ programId: program.id, facultyId: faculty.id, careers: ['นักพัฒนาซอฟต์แวร์'] });
    expect(result.needsRecommendationProfile).toBe(false);
  });

  it('asks again when qualification and level do not match, instead of choosing unrelated programs', async () => {
    const result = await answerGroundedQuestion({ ...request('ช่วยแนะนำหลักสูตร'), recommendationProfile: {
      interests: 'IT', currentQualification: 'm3', desiredLevel: 'master'
    } }, content);
    expect(result.programRecommendations).toEqual([]);
    expect(result.needsRecommendationProfile).toBe(true);
    expect(result.fallback).toBe(false);
  });

  it('answers career questions for a named program and an ordinal follow-up', async () => {
    const named = await answerGroundedQuestion(request('IT จบแล้วทำงานอะไร'), content);
    expect(named.careerGuidance?.[0]?.careers).toEqual(['นักพัฒนาซอฟต์แวร์']);
    const followup = await answerGroundedQuestion({ ...request('อันที่สองจบแล้วทำงานอะไร'), conversationContext: {
      ...context, awaitingTourPreference: false, lastProgramIds: [content.programs[1]!.id, program.id]
    } }, content);
    expect(followup.careerGuidance?.map((r) => r.programId)).toEqual([program.id]);
    expect(followup).not.toHaveProperty('citations');
  });

  it('keeps faculty-specific course listings independent of the current scene', async () => {
    const result = await answerGroundedQuestion(request('FITM มีหลักสูตรอะไรบ้าง'), content);
    expect(result.answer).toContain(faculty.name.th);
    expect(result.relatedProgramIds).toEqual(content.programs.map((p) => p.id));
    expect(result.answer).not.toContain('ลานหน้า');
  });

  it('does not advertise a master program as a bachelor when structured metadata is missing', () => {
    const master = { ...program, id: 'master', studyLevel: undefined, eligibleQualifications: undefined,
      name: { th: 'วิทยาศาสตรมหาบัณฑิต', en: 'Master of Science' }, level: { th: 'มหาบัณฑิต', en: 'Master' } };
    expect(rankProgramsForProfile({ interests: 'IT', currentQualification: 'm6-pvoc', desiredLevel: 'bachelor' }, { ...content, programs: [master] }, 'th')).toEqual([]);
  });

  it('distinguishes missing admission metadata from a known incompatible qualification', () => {
    const incomplete = { ...program, eligibleQualifications: undefined,
      admission: { th: 'ตรวจประกาศล่าสุดก่อนสมัคร', en: 'Check the latest admission notice' } };
    const profile = { interests: 'IT', currentQualification: 'm6-pvoc', desiredLevel: 'bachelor' } as const;
    const result = rankProgramsForProfile(profile, { ...content, programs: [incomplete] }, 'th');
    expect(result).toHaveLength(1);
    expect(result[0]?.reason).toContain('ยังยืนยันคุณสมบัติรับสมัครไม่ได้');
    expect(rankProgramsForProfile({ ...profile, currentQualification: 'm3' }, { ...content, programs: [incomplete] }, 'th')).toEqual([]);
    expect(rankProgramsForProfile(profile, { ...content, programs: [{ ...incomplete, eligibleQualifications: ['high-vocational'] }] }, 'th')).toEqual([]);
  });

  it('provides published dormitory information and does not guess current prices', async () => {
    const result = await answerGroundedQuestion(request('ค่าหอพักเท่าไร'), content);
    expect(result.answered).toBe(false);
    expect(result.answer).toContain('ประกาศล่าสุด');
    expect(result.suggestedReplies?.length).toBe(3);
  });
});
