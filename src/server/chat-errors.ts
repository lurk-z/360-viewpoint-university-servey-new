import type { ChatFallbackReason } from '../chat';
import type { Locale } from '../tour-data';

interface ErrorDetail {
  readonly status?: number;
  readonly code?: string;
  readonly message: string;
}

export function getChatErrorDetail(error: unknown): ErrorDetail {
  if (!error || typeof error !== 'object') return { message: String(error) };
  const record = error as Record<string, unknown>;
  return {
    status: typeof record.status === 'number' ? record.status : undefined,
    code: typeof record.code === 'string' || typeof record.code === 'number' ? String(record.code) : undefined,
    message: typeof record.message === 'string' ? record.message : String(error)
  };
}

export function classifyGeminiError(error: unknown): ChatFallbackReason {
  const detail = getChatErrorDetail(error);
  const message = detail.message.toLocaleLowerCase();
  if (detail.status === 429 || /quota|rate.?limit|resource_exhausted/u.test(message)) return 'quota-exceeded';
  if (detail.status === 401 || detail.status === 403 || /api.?key|unauthenticated|permission_denied/u.test(message)) return 'invalid-key';
  if (detail.status === 404 || /model.*not found|unknown model/u.test(message)) return 'model-unavailable';
  if (/timeout|timed out|abort/u.test(message) || (error instanceof Error && error.name === 'AbortError')) return 'timeout';
  return 'model-unavailable';
}

export function logGeminiFailure(error: unknown, reason: ChatFallbackReason, model: string): void {
  const detail = getChatErrorDetail(error);
  console.error('[chat] Gemini request failed', { reason, model, status: detail.status, code: detail.code });
}

export function localizedFallbackReason(reason: ChatFallbackReason, locale: Locale): string {
  const messages: Record<ChatFallbackReason, { th: string; en: string }> = {
    'not-configured': {
      th: 'ระบบ AI ยังตั้งค่าไม่ครบ แต่คุณยังใช้ข้อมูลและเครื่องมือนำทางด้านล่างได้',
      en: 'The AI service is not fully configured, but the information and navigation tools below are still available.'
    },
    'invalid-key': {
      th: 'Gemini API key ถูกปฏิเสธ กรุณาให้ผู้ดูแลตรวจสอบสถานะ AI ส่วนข้อมูลและการนำทางด้านล่างยังใช้งานได้',
      en: 'The Gemini API key was rejected. An administrator should check AI status; the information and navigation tools below remain available.'
    },
    'quota-exceeded': {
      th: 'โควตา AI วันนี้เต็มแล้ว แต่ข้อมูลและการนำทางที่ตรวจสอบจากระบบยังใช้งานได้',
      en: 'Today’s AI quota has been reached, but verified information and navigation remain available.'
    },
    'model-unavailable': {
      th: 'ไม่สามารถเชื่อมต่อบริการ AI ได้ชั่วคราว แต่ข้อมูลและการนำทางด้านล่างยังใช้งานได้',
      en: 'The AI service is temporarily unavailable, but the information and navigation tools below remain available.'
    },
    timeout: {
      th: 'AI ใช้เวลาตอบนานเกินไป กรุณาลองใหม่ โดยข้อมูลและการนำทางด้านล่างยังใช้งานได้',
      en: 'The AI response timed out. Please try again; the information and navigation tools below remain available.'
    },
    'invalid-response': {
      th: 'AI ส่งคำตอบที่ตรวจสอบไม่ได้ ระบบจึงแสดงเฉพาะข้อมูลที่ยืนยันได้',
      en: 'The AI returned an unverifiable response, so only validated information is shown.'
    },
    'rate-limited': {
      th: 'มีผู้ใช้งาน AI พร้อมกันจำนวนมาก กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
      en: 'The AI service is receiving too many requests. Please wait a moment and try again.'
    },
    'no-content': {
      th: 'ยังไม่มีข้อมูลที่เผยแพร่เพียงพอสำหรับคำถามนี้',
      en: 'There is not enough published information to answer this question.'
    }
  };
  return messages[reason][locale];
}
