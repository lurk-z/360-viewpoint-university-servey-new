import { GoogleGenAI } from '@google/genai';
import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../lib/supabase/env';
import type { ChatFallbackReason } from '../chat';
import { classifyGeminiError } from './chat-service';

export type AiProviderStatus = 'ready' | ChatFallbackReason;

export interface AiRuntimeStatus {
  readonly configured: boolean;
  readonly geminiConfigured: boolean;
  readonly supabaseConfigured: boolean;
  readonly providerStatus: AiProviderStatus;
  readonly model: string;
  readonly quotaUsed: number | null;
  readonly quotaLimit: number;
  readonly checkedAt: string;
}

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

function dailyLimit(): number {
  const configured = Number.parseInt(process.env.GEMINI_DAILY_LIMIT ?? '200', 10);
  return Number.isFinite(configured) ? Math.max(1, configured) : 200;
}

async function readQuotaUsed(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await createAdminSupabaseClient()
    .from('ai_daily_usage')
    .select('request_count')
    .eq('usage_date', today)
    .maybeSingle();
  if (error) return null;
  return Number(data?.request_count ?? 0);
}

export async function getAiRuntimeStatus(): Promise<AiRuntimeStatus> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const supabaseConfigured = isSupabaseConfigured();
  const geminiConfigured = Boolean(apiKey && apiKey !== 'your-gemini-api-key');
  const configured = geminiConfigured && supabaseConfigured;
  const quotaUsedPromise = readQuotaUsed();
  let providerStatus: AiProviderStatus = configured ? 'model-unavailable' : 'not-configured';

  if (geminiConfigured && apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.get({ model, config: { httpOptions: { timeout: 8_000 } } });
      providerStatus = 'ready';
    } catch (error) {
      providerStatus = classifyGeminiError(error);
    }
  }

  return {
    configured,
    geminiConfigured,
    supabaseConfigured,
    providerStatus,
    model,
    quotaUsed: await quotaUsedPromise,
    quotaLimit: dailyLimit(),
    checkedAt: new Date().toISOString()
  };
}
