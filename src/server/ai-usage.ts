import { createAdminSupabaseClient } from '../../lib/supabase/admin.ts';
import { isSupabaseConfigured } from '../../lib/supabase/env.ts';
import type { ChatFallbackReason, ChatIntent } from '../chat.ts';

export interface AiQuotaResult {
  readonly allowed: boolean;
  readonly reason?: ChatFallbackReason;
  readonly dailyUsed?: number;
  readonly minuteUsed?: number;
}

function positiveLimit(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : fallback;
}

export function getAiLimits(): { readonly daily: number; readonly minute: number } {
  return {
    daily: positiveLimit(process.env.GEMINI_DAILY_LIMIT, 200),
    minute: positiveLimit(process.env.GEMINI_MINUTE_LIMIT, 10)
  };
}

export async function consumeAiQuota(): Promise<AiQuotaResult> {
  if (!isSupabaseConfigured()) return { allowed: false, reason: 'not-configured' };
  const limits = getAiLimits();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc('consume_ai_rate_limits', {
    daily_limit: limits.daily,
    minute_limit: limits.minute
  });

  if (!error && data && typeof data === 'object') {
    const value = data as Record<string, unknown>;
    const allowed = value.allowed === true;
    const reason = value.reason === 'minute'
      ? 'rate-limited'
      : value.reason === 'daily' ? 'quota-exceeded' : undefined;
    return {
      allowed,
      reason,
      dailyUsed: Number(value.daily_used ?? 0),
      minuteUsed: Number(value.minute_used ?? 0)
    };
  }

  // Compatibility while the new migration has not been applied yet.
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    const legacy = await supabase.rpc('consume_ai_quota', { limit_count: limits.daily });
    if (legacy.error) return { allowed: false, reason: 'model-unavailable' };
    return legacy.data === true
      ? { allowed: true }
      : { allowed: false, reason: 'quota-exceeded' };
  }
  return { allowed: false, reason: 'model-unavailable' };
}

export async function recordAiMetric(
  intent: ChatIntent | 'tag-draft' | 'blocked',
  outcome: string,
  latencyMs: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await createAdminSupabaseClient().rpc('record_ai_metric', {
    intent_name: intent,
    outcome_name: outcome.slice(0, 40),
    latency_ms: Math.max(0, Math.round(latencyMs))
  });
  // The metric is best-effort and remains compatible before migration.
  if (error && error.code !== 'PGRST202' && error.code !== '42883') {
    console.error('[chat] Unable to record aggregate AI metric', { code: error.code });
  }
}
