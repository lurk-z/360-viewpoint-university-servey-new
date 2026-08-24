import { GoogleGenAI } from '@google/genai';
import { unstable_cache } from 'next/cache';
import { createAdminSupabaseClient } from '../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../lib/supabase/env';
import type { ChatFallbackReason } from '../chat';
import { classifyGeminiError } from './chat-service';
import { getAiLimits } from './ai-usage';

export type AiProviderStatus = 'checking' | 'ready' | ChatFallbackReason;

export interface AiRuntimeStatus {
  readonly configured: boolean;
  readonly geminiConfigured: boolean;
  readonly supabaseConfigured: boolean;
  readonly providerStatus: AiProviderStatus;
  readonly model: string;
  readonly quotaUsed: number | null;
  readonly quotaLimit: number;
  readonly minuteUsed: number | null;
  readonly minuteLimit: number;
  readonly taggedPrograms: number | null;
  readonly structuredPrograms: number | null;
  readonly pendingPrograms: number | null;
  readonly metrics: readonly {
    readonly intent: string;
    readonly outcome: string;
    readonly count: number;
    readonly averageLatencyMs: number;
  }[];
  readonly checkedAt: string;
}

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

interface AiDashboardData {
  readonly dailyUsed: number | null;
  readonly minuteUsed: number | null;
  readonly taggedPrograms: number | null;
  readonly structuredPrograms: number | null;
  readonly pendingPrograms: number | null;
  readonly metrics: AiRuntimeStatus['metrics'];
}

async function readDashboardData(): Promise<AiDashboardData> {
  const empty: AiDashboardData = {
    dailyUsed: null,
    minuteUsed: null,
    taggedPrograms: null,
    structuredPrograms: null,
    pendingPrograms: null,
    metrics: []
  };
  if (!isSupabaseConfigured()) return empty;
  const supabase = createAdminSupabaseClient();
  const summary = await supabase.rpc('get_ai_dashboard_summary');
  if (!summary.error && summary.data && typeof summary.data === 'object') {
    const value = summary.data as Record<string, unknown>;
    return {
      dailyUsed: Number(value.dailyUsed ?? 0),
      minuteUsed: Number(value.minuteUsed ?? 0),
      taggedPrograms: Number(value.taggedPrograms ?? 0),
      structuredPrograms: Number(value.structuredPrograms ?? 0),
      pendingPrograms: Number(value.pendingPrograms ?? 0),
      metrics: Array.isArray(value.metrics) ? value.metrics.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const metric = item as Record<string, unknown>;
        return [{
          intent: String(metric.intent ?? ''),
          outcome: String(metric.outcome ?? ''),
          count: Number(metric.count ?? 0),
          averageLatencyMs: Number(metric.averageLatencyMs ?? 0)
        }];
      }) : []
    };
  }
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const { data, error } = await supabase
    .from('ai_daily_usage')
    .select('request_count')
    .eq('usage_date', today)
    .maybeSingle();
  if (error) return empty;
  return { ...empty, dailyUsed: Number(data?.request_count ?? 0) };
}

export async function getAiRuntimeStatus(): Promise<AiRuntimeStatus> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const supabaseConfigured = isSupabaseConfigured();
  const geminiConfigured = Boolean(apiKey && apiKey !== 'your-gemini-api-key');
  const configured = geminiConfigured && supabaseConfigured;
  const dashboardDataPromise = readDashboardData();
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

  const dashboardData = await dashboardDataPromise;
  const limits = getAiLimits();
  return {
    configured,
    geminiConfigured,
    supabaseConfigured,
    providerStatus,
    model,
    quotaUsed: dashboardData.dailyUsed,
    quotaLimit: limits.daily,
    minuteUsed: dashboardData.minuteUsed,
    minuteLimit: limits.minute,
    taggedPrograms: dashboardData.taggedPrograms,
    structuredPrograms: dashboardData.structuredPrograms,
    pendingPrograms: dashboardData.pendingPrograms,
    metrics: dashboardData.metrics,
    checkedAt: new Date().toISOString()
  };
}

export async function getAiConfigurationStatus(): Promise<AiRuntimeStatus> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const supabaseConfigured = isSupabaseConfigured();
  const geminiConfigured = Boolean(apiKey && apiKey !== 'your-gemini-api-key');
  const configured = geminiConfigured && supabaseConfigured;
  const dashboardData = await readDashboardData();
  const limits = getAiLimits();
  return {
    configured,
    geminiConfigured,
    supabaseConfigured,
    providerStatus: configured ? 'checking' : 'not-configured',
    model,
    quotaUsed: dashboardData.dailyUsed,
    quotaLimit: limits.daily,
    minuteUsed: dashboardData.minuteUsed,
    minuteLimit: limits.minute,
    taggedPrograms: dashboardData.taggedPrograms,
    structuredPrograms: dashboardData.structuredPrograms,
    pendingPrograms: dashboardData.pendingPrograms,
    metrics: dashboardData.metrics,
    checkedAt: new Date().toISOString()
  };
}

const getCachedAiRuntimeStatusInternal = unstable_cache(
  getAiRuntimeStatus,
  ['ai-runtime-status'],
  { revalidate: 60 }
);

export async function getCachedAiRuntimeStatus(): Promise<AiRuntimeStatus> {
  return getCachedAiRuntimeStatusInternal();
}
