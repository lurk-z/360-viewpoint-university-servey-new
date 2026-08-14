import { describe, expect, it } from 'vitest';
import { chatRequestSchema } from './chat';
import { createFallbackContentSnapshot } from './content';
import {
  buildKnowledgeDocuments,
  classifyGeminiError,
  createFallbackChatResponse,
  findRelatedProgramIds,
  rankProgramsForProfile,
  validateGroundedAnswer
} from './server/chat-service';

describe('grounded tour chat', () => {
  it('limits message length, history and scene IDs at the API boundary', () => {
    const base = { message: 'ข้อมูลสถานที่', locale: 'th', sceneId: 'entrance', history: [] };
    expect(chatRequestSchema.safeParse(base).success).toBe(true);
    expect(chatRequestSchema.safeParse({ ...base, message: 'x'.repeat(501) }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ ...base, sceneId: 'missing-scene' }).success).toBe(false);
    expect(chatRequestSchema.safeParse({
      ...base,
      history: Array.from({ length: 7 }, () => ({ role: 'user', text: 'hello' }))
    }).success).toBe(false);
  });

  it('removes invented citations and unrelated scene IDs from model output', () => {
    const documents = buildKnowledgeDocuments(createFallbackContentSnapshot());
    const known = documents[0]!;
    const grounded = validateGroundedAnswer({
      intent: 'answer',
      answered: true,
      answer: 'คำตอบจากข้อมูล',
      citationIds: [known.citation.id, 'invented-source'],
      relatedSceneIds: [known.sceneId ?? 'entrance', 'invented-scene'],
      destinationSceneId: '',
      programRecommendations: []
    }, documents);
    expect(grounded?.citations.map((citation) => citation.id)).toEqual([known.citation.id]);
    expect(grounded?.relatedSceneIds).not.toContain('invented-scene');
  });

  it('returns related published information when Gemini is unavailable', () => {
    const content = createFallbackContentSnapshot();
    const fallback = createFallbackChatResponse({
      message: 'มีข้อมูลสถานที่อะไรบ้าง',
      locale: 'th',
      sceneId: 'campusRoad23',
      history: []
    }, content);
    expect(fallback.fallback).toBe(true);
    expect(fallback.answered).toBe(false);
    expect(fallback.citations.length).toBeGreaterThan(0);
    expect(fallback.relatedProgramIds).toEqual([]);
  });

  it('validates recommendation profiles and classifies provider failures', () => {
    const base = { message: 'Recommend a program', locale: 'en', sceneId: 'entrance', history: [] };
    expect(chatRequestSchema.safeParse({
      ...base,
      recommendationProfile: {
        interests: 'software and data',
        currentQualification: 'm6-pvoc',
        desiredLevel: 'bachelor'
      }
    }).success).toBe(true);
    expect(chatRequestSchema.safeParse({
      ...base,
      recommendationProfile: {
        interests: '',
        currentQualification: 'unknown',
        desiredLevel: 'bachelor'
      }
    }).success).toBe(false);
    expect(classifyGeminiError({ status: 401, message: 'rejected' })).toBe('invalid-key');
    expect(classifyGeminiError({ status: 429, message: 'resource exhausted' })).toBe('quota-exceeded');
    expect(classifyGeminiError(new DOMException('aborted', 'AbortError'))).toBe('timeout');
  });

  it('weights Admin interest tags above unrelated programs and returns only real IDs', () => {
    const fallback = createFallbackContentSnapshot();
    const baseProgram = {
      facultyId: 'faculty-fitm',
      level: { th: 'ปริญญาตรี 4 ปี', en: "Four-year bachelor's degree" },
      summary: { th: 'หลักสูตรทดสอบ', en: 'Test program' },
      description: { th: 'รายละเอียดหลักสูตร', en: 'Program details' },
      admission: { th: 'รับ ม.6 และ ปวช.', en: 'Accepts upper secondary and vocational certificate graduates' },
      source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } }
    } as const;
    const content = {
      ...fallback,
      programs: [
        {
          ...baseProgram,
          id: 'program-software',
          slug: 'software',
          name: { th: 'เทคโนโลยีสารสนเทศ', en: 'Information Technology' },
          interestTags: { th: ['เขียนโปรแกรม', 'ข้อมูล'], en: ['software', 'data'] },
          careerTags: { th: ['นักพัฒนาซอฟต์แวร์'], en: ['software developer'] }
        },
        {
          ...baseProgram,
          id: 'program-hotel',
          slug: 'hotel',
          name: { th: 'การโรงแรม', en: 'Hotel Management' },
          interestTags: { th: ['บริการ'], en: ['hospitality'] },
          careerTags: { th: ['โรงแรม'], en: ['hotel'] }
        }
      ]
    };
    const recommendations = rankProgramsForProfile({
      interests: 'software and data',
      currentQualification: 'm6-pvoc',
      desiredLevel: 'bachelor'
    }, content, 'en');
    expect(recommendations[0]?.programId).toBe('program-software');
    expect(recommendations.every((item) => content.programs.some((program) => program.id === item.programId))).toBe(true);
    const grounded = validateGroundedAnswer({
      intent: 'program-recommendation',
      answered: true,
      answer: 'Verified recommendation',
      citationIds: [],
      relatedSceneIds: [],
      destinationSceneId: '',
      programRecommendations: [
        { programId: 'program-software', reason: 'Matches software interests' },
        { programId: 'invented-program', reason: 'Invented' }
      ]
    }, buildKnowledgeDocuments(content));
    expect(grounded?.programRecommendations).toEqual([
      { programId: 'program-software', reason: 'Matches software interests' }
    ]);
  });

  it('uses a linked faculty as the canonical AI source instead of duplicating its Info hotspot', () => {
    const content = createFallbackContentSnapshot();
    const faculty = {
      id: 'faculty-business',
      slug: 'business-administration',
      sceneId: 'campusBuilding1',
      hotspotId: 'building-1-info',
      name: { th: 'คณะบริหารธุรกิจ', en: 'Business Faculty' },
      summary: { th: 'สรุป', en: 'Summary' },
      description: { th: 'รายละเอียด', en: 'Description' },
      images: [{ src: '/mainimages/temp1-5-1.jpg', alt: { th: 'รูปคณะ', en: 'Faculty image' } }],
      source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } }
    } as const;
    const documents = buildKnowledgeDocuments({ ...content, faculties: [faculty] });

    expect(documents.some((item) => item.citation.id === faculty.id && item.sceneId === faculty.sceneId)).toBe(true);
    expect(documents.some((item) => item.citation.id === faculty.hotspotId)).toBe(false);
  });

  it('returns every program for a named or current faculty and only a specifically named program', () => {
    const fallback = createFallbackContentSnapshot();
    const faculty = {
      id: 'faculty-business',
      slug: 'business-administration-and-industrial-services',
      sceneId: 'campusBuilding1',
      name: { th: 'คณะบริหารธุรกิจและอุตสาหกรรมบริการ', en: 'Faculty of Business Administration and Service Industry' },
      summary: { th: 'สรุป', en: 'Summary' },
      description: { th: 'รายละเอียด', en: 'Description' },
      images: [{ src: '/mainimages/temp1-5-1.jpg', alt: { th: 'รูปคณะ', en: 'Faculty image' } }],
      source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } }
    } as const;
    const baseProgram = {
      facultyId: faculty.id,
      department: { th: 'ภาควิชาการจัดการ', en: 'Department of Management' },
      level: { th: 'ปริญญาตรี', en: "Bachelor's degree" },
      summary: { th: 'สรุป', en: 'Summary' },
      description: { th: 'รายละเอียด', en: 'Description' },
      admission: { th: 'การรับสมัคร', en: 'Admission' },
      source: { label: { th: 'แหล่งข้อมูล', en: 'Source' } }
    } as const;
    const content = {
      ...fallback,
      faculties: [faculty],
      programs: [
        { ...baseProgram, id: 'program-th', slug: 'tourism-th', name: { th: 'การท่องเที่ยว (TH)', en: 'Tourism (TH)' } },
        { ...baseProgram, id: 'program-ibtt', slug: 'business-ibtt', name: { th: 'บริหารธุรกิจ (IBTT)', en: 'Business (IBTT)' } }
      ]
    };
    const request = { locale: 'th', sceneId: 'campusBuilding1', history: [] } as const;
    expect(buildKnowledgeDocuments(content).find((document) => document.citation.id === 'program-th')?.text)
      .toContain('DEPARTMENT: ภาควิชาการจัดการ / Department of Management');

    expect(findRelatedProgramIds({ ...request, message: 'คณะบริหารธุรกิจมีหลักสูตรอะไรบ้าง' }, content))
      .toEqual(['program-th', 'program-ibtt']);
    expect(findRelatedProgramIds({ ...request, message: 'คณะนี้เปิดสอนอะไรบ้าง' }, content))
      .toEqual(['program-th', 'program-ibtt']);
    expect(findRelatedProgramIds({ ...request, locale: 'en', sceneId: 'entrance', message: 'What programs does Business Administration offer?' }, content))
      .toEqual(['program-th', 'program-ibtt']);
    expect(findRelatedProgramIds({ ...request, message: 'IBTT รับวุฒิอะไร' }, content))
      .toEqual(['program-ibtt']);
    expect(findRelatedProgramIds(
      { ...request, message: 'คณะนี้เปิดสอนอะไรบ้าง' },
      content,
      [{ id: 'program-th', kind: 'program', title: content.programs[0]!.name }]
    )).toEqual(['program-th', 'program-ibtt']);
  });
});
