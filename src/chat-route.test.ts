import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chatFixture } from '../test-support/chat-fixture';
import { createFallbackContentSnapshot } from './content';
import { POST } from '../app/api/chat/route';
import { getPublicContentSnapshot } from './server/content-repository';

vi.mock('./server/content-repository', () => ({ getPublicContentSnapshot: vi.fn() }));
vi.mock('./server/ai-usage', () => ({ recordAiMetric: vi.fn(), consumeAiQuota: vi.fn(() => { throw new Error('Unexpected Gemini request'); }) }));
vi.mock('next/server', () => ({ after: vi.fn() }));

function request(overrides: object = {}, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/chat', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ message: 'ช่วยแนะนำอาชีพและหลักสูตร', locale: 'th', sceneId: 'entrance', history: [],
      recommendationProfile: { interests: 'software', currentQualification: 'm6-pvoc', desiredLevel: 'bachelor' }, ...overrides }) });
}

describe('chat route with controlled published data', () => {
  beforeEach(() => vi.mocked(getPublicContentSnapshot).mockReset().mockResolvedValue(chatFixture));

  it('validates requests and returns grounded careers without citations', async () => {
    const response = await POST(request());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(data.programRecommendations).toHaveLength(2);
    expect(data.careerGuidance[0].facultyId).toBe(chatFixture.faculties[0]!.id);
    expect(data).not.toHaveProperty('citations');
  });

  it('makes unavailable content retryable without asking for the same profile', async () => {
    vi.mocked(getPublicContentSnapshot).mockResolvedValueOnce(createFallbackContentSnapshot());
    const failed = await (await POST(request())).json();
    expect(failed.fallback).toBe(true);
    expect(failed.needsRecommendationProfile).toBe(false);
    const retried = await (await POST(request())).json();
    expect(retried.programRecommendations).toHaveLength(2);
  });

  it('rejects cross-origin, invalid destinations and personal data in the profile before loading content', async () => {
    expect((await POST(request({}, 'https://untrusted.example'))).status).toBe(403);
    expect((await POST(request({ selectedTourSceneId: 'invented' }))).status).toBe(400);
    expect((await POST(request({ recommendationProfile: { interests: 'email me at visitor@example.com', currentQualification: 'other', desiredLevel: 'unsure' } }))).status).toBe(422);
    expect(getPublicContentSnapshot).not.toHaveBeenCalled();
  });
});
