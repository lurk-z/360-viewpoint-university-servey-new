import { chatRequestSchema, type ChatRequest } from '../../../src/chat';
import { getPublicContentSnapshot } from '../../../src/server/content-repository';
import { answerGroundedQuestion } from '../../../src/server/chat-service';
import { isTrustedSameOriginPost } from '../../../src/server/request-security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    const content = await getPublicContentSnapshot();
    const response = await answerGroundedQuestion(parsed.data as ChatRequest, content);
    return Response.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Unable to answer this question' }, { status: 503 });
  }
}
