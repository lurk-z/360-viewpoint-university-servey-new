import { revalidateTag } from 'next/cache';
import { getAdminSession } from '../../../../src/server/auth';
import { generateAndPublishProgramTagBatch } from '../../../../src/server/program-tag-drafting';
import { recordAiMetric } from '../../../../src/server/ai-usage';
import { classifyGeminiError } from '../../../../src/server/chat-service';
import { isTrustedSameOriginPost } from '../../../../src/server/request-security';
import { PUBLIC_CONTENT_CACHE_TAG } from '../../../../src/server/content-repository';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isTrustedSameOriginPost(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return Response.json({ error: 'Admin permission required' }, { status: 403 });
  try {
    const result = await generateAndPublishProgramTagBatch();
    if (result.updated > 0) revalidateTag(PUBLIC_CONTENT_CACHE_TAG, { expire: 0 });
    return Response.json(result, {
      headers: { 'Cache-Control': 'private, no-store' }
    });
  } catch (error) {
    await recordAiMetric('tag-draft', 'error', 0);
    const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const code = typeof record.code === 'string' || typeof record.code === 'number' ? String(record.code) : undefined;
    const knownMessage = error instanceof Error && (
      error.message === 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY'
      || error.message.startsWith('คำขอ AI ต่อนาทีเต็มแล้ว')
      || error.message.startsWith('โควตา AI วันนี้เต็มแล้ว')
    ) ? error.message : undefined;
    const reason = classifyGeminiError(error);
    console.error('[admin] Program tag draft failed', {
      reason,
      code
    });
    return Response.json({
      error: knownMessage ?? (reason === 'invalid-key'
        ? 'Gemini API key ถูกปฏิเสธ กรุณาตรวจ .env.local'
        : reason === 'timeout'
          ? 'Gemini ใช้เวลานานเกินไป กรุณาลองใหม่'
          : 'สร้างแท็กไม่สำเร็จ กรุณาตรวจสถานะ AI แล้วลองใหม่')
    }, { status: 503 });
  }
}
