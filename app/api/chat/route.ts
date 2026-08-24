import { after } from 'next/server';
import { chatRequestSchema, type ChatRequest } from '../../../src/chat';
import { getPublicContentSnapshot } from '../../../src/server/content-repository';
import { answerGroundedQuestion } from '../../../src/server/chat-service';
import { detectPersonalData } from '../../../src/chat-privacy';
import { recordAiMetric } from '../../../src/server/ai-usage';
import { isTrustedSameOriginPost } from '../../../src/server/request-security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const startedAt = Date.now();
  if (!isTrustedSameOriginPost(request)) {
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 16_384) return Response.json({ error: 'Request is too large' }, { status: 413 });

  try {
    const parsed = chatRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: 'Invalid chat request' }, { status: 400 });
    }
    const personalData = detectPersonalData([
      parsed.data.message,
      ...parsed.data.history.map((turn) => turn.text)
    ].join('\n'));
    if (personalData) {
      after(() => recordAiMetric('blocked', 'personal-data', Date.now() - startedAt));
      return Response.json({
        error: 'personal-data',
        kind: personalData.kind
      }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    }
    const content = await getPublicContentSnapshot();
    const response = await answerGroundedQuestion(parsed.data as ChatRequest, content);
    after(() => recordAiMetric(
      response.intent,
      response.fallback ? (response.fallbackReason ?? 'fallback') : (response.answered ? 'answered' : 'not-answered'),
      Date.now() - startedAt
    ));
    return Response.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    after(() => recordAiMetric('answer', 'route-error', Date.now() - startedAt));
    return Response.json({ error: 'Unable to answer this question' }, { status: 503 });
  }
}
