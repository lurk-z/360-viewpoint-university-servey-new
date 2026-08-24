import { describe, expect, it } from 'vitest';
import { createFallbackContentSnapshot, type PublicContentSnapshot } from './content';
import { answerGroundedQuestion } from './server/chat-service';

const request = (message: string) => ({
  message,
  locale: 'th' as const,
  sceneId: 'multipurposeGym' as const,
  history: []
});

describe('deterministic chat collection and tour intents', () => {
  it('lists published Admin activities without substituting the current Red Dome scene', async () => {
    const content: PublicContentSnapshot = {
      ...createFallbackContentSnapshot(),
      activities: [{
        id: 'activity-orientation',
        slug: 'orientation',
        title: { th: 'รับน้อง', en: 'Freshman orientation' },
        summary: { th: 'กิจกรรมต้อนรับนักศึกษาใหม่', en: 'A welcome activity for new students' },
        description: { th: 'รายละเอียดกิจกรรมรับน้อง', en: 'Freshman orientation details' },
        startDate: '2026-08-08',
        endDate: '2026-08-10',
        source: { label: { th: 'ข้อมูลจากผู้ดูแล', en: 'Administrator data' } }
      }]
    };

    const response = await answerGroundedQuestion(request('มีกิจกรรมอะไรบ้าง'), content);

    expect(response.intent).toBe('activity-list');
    expect(response.relatedActivityIds).toEqual(['activity-orientation']);
    expect(response.relatedSceneIds).toEqual([]);
    expect(response.answer).toContain('รับน้อง');
    expect(response.answer).not.toContain('โดมแดง');
  });

  it('asks for a destination instead of selecting one for a generic tour request', async () => {
    const response = await answerGroundedQuestion(
      request('พาทัวร์หน่อย'),
      createFallbackContentSnapshot()
    );

    expect(response.intent).toBe('tour');
    expect(response.tourPlan).toBeUndefined();
    expect(response.needsTourPreference).toBe(true);
    expect(response.relatedSceneIds).toEqual([]);
    expect(response.answer).not.toMatch(/อนุสรณ์|โดมแดง/u);
  });

  it('uses the typed follow-up destination after asking for a tour preference', async () => {
    const response = await answerGroundedQuestion({
      ...request('โรงอาหารมหาวิทยาลัย'),
      conversationContext: {
        lastProgramIds: [],
        lastFacultyIds: [],
        lastSceneIds: [],
        awaitingTourPreference: true
      }
    }, createFallbackContentSnapshot());

    expect(response.intent).toBe('tour');
    expect(response.tourPlan?.destinationSceneId).toBe('universityCafeteria');
    expect(response.needsTourPreference).toBe(false);
  });

  it('asks the visitor to choose when one interest matches multiple real destinations', async () => {
    const fallback = createFallbackContentSnapshot();
    const content: PublicContentSnapshot = {
      ...fallback,
      faculties: [{
        id: 'food-faculty',
        slug: 'food-faculty',
        sceneId: 'campusRoad19',
        name: { th: 'คณะเทคโนโลยีอาหาร', en: 'Faculty of Food Technology' },
        summary: { th: 'ข้อมูลคณะ', en: 'Faculty summary' },
        description: { th: 'รายละเอียดคณะ', en: 'Faculty details' },
        images: [{ src: '/mainimages/temp3-12.jpg', alt: { th: 'รูปคณะ', en: 'Faculty' } }],
        source: { label: { th: 'ข้อมูลผู้ดูแล', en: 'Administrator data' } }
      }]
    };
    const response = await answerGroundedQuestion({
      ...request('อาหาร'),
      conversationContext: {
        lastProgramIds: [],
        lastFacultyIds: [],
        lastSceneIds: [],
        awaitingTourPreference: true
      }
    }, content);

    expect(response.tourPlan).toBeUndefined();
    expect(response.needsTourPreference).toBe(true);
    expect(response.answer).toContain('คณะเทคโนโลยีอาหาร');
    expect(response.answer).toContain('โรงอาหาร');
  });

  it('lists every published faculty before requesting recommendation details', async () => {
    const fallback = createFallbackContentSnapshot();
    const faculties = Array.from({ length: 4 }, (_, index) => ({
      id: `faculty-${index + 1}`,
      slug: `faculty-${index + 1}`,
      sceneId: (['campusBuilding1', 'campusRoad19', 'campusRoad36', 'campusRoad43'] as const)[index],
      name: { th: `คณะทดสอบ ${index + 1}`, en: `Test Faculty ${index + 1}` },
      summary: { th: 'ข้อมูลคณะ', en: 'Faculty summary' },
      description: { th: 'รายละเอียดคณะ', en: 'Faculty details' },
      images: [{ src: '/mainimages/temp1-5-1.jpg', alt: { th: 'รูปคณะ', en: 'Faculty' } }],
      source: { label: { th: 'ข้อมูลผู้ดูแล', en: 'Administrator data' } }
    }));
    const content: PublicContentSnapshot = { ...fallback, faculties };

    const response = await answerGroundedQuestion(request('แนะนำคณะใน มจพ. ปราจีนบุรี'), content);

    expect(response.intent).toBe('faculty-overview');
    expect(response.relatedFacultyIds).toEqual(faculties.map((faculty) => faculty.id));
    expect(response.needsRecommendationProfile).toBe(true);
    for (const faculty of faculties) expect(response.answer).toContain(faculty.name.th);
  });
});
