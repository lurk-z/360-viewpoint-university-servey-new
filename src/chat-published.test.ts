import { expect, it } from 'vitest';
import { type PublicContentSnapshot } from './content';
import { answerGroundedQuestion } from './server/chat-service';

// Opt-in read-only integration check, kept separate from deterministic UI fixtures.
// Example (PowerShell): $env:CHAT_PUBLISHED_BASE_URL='http://localhost:3000'; npm test -- src/chat-published.test.ts
it.skipIf(!process.env.CHAT_PUBLISHED_BASE_URL)('guides using real published content, not an empty fallback', async () => {
  const response = await fetch(new URL('/api/content', process.env.CHAT_PUBLISHED_BASE_URL), { signal: AbortSignal.timeout(20_000) });
  expect(response.ok).toBe(true);
  const content = await response.json() as PublicContentSnapshot;
  expect(content.source).toBe('database');
  expect(content.faculties.length).toBeGreaterThan(0);
  expect(content.programs.length).toBeGreaterThan(0);
  const request = { message: 'มีคณะอะไรบ้าง', locale: 'th' as const, sceneId: 'entrance', history: [] };
  const faculties = await answerGroundedQuestion(request, content);
  expect(faculties.relatedFacultyIds).toHaveLength(content.faculties.length);
  const careers = await answerGroundedQuestion({ ...request, message: 'ช่วยแนะนำอาชีพและหลักสูตรตามความสนใจ', recommendationProfile: {
    interests: 'เขียนโปรแกรม ซอฟต์แวร์', currentQualification: 'm6-pvoc', desiredLevel: 'bachelor'
  } }, content);
  expect(careers.programRecommendations.length).toBeGreaterThan(0);
  expect(careers.programRecommendations.length).toBeLessThanOrEqual(3);
  for (const recommendation of careers.programRecommendations) {
    const program = content.programs.find((p) => p.id === recommendation.programId);
    expect(program).toBeDefined();
    expect(program?.facultyId).toBe(recommendation.facultyId);
    expect(content.faculties.some((f) => f.id === recommendation.facultyId)).toBe(true);
  }
  expect(careers).not.toHaveProperty('citations');
}, 30_000);
