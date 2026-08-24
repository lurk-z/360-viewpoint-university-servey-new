import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/202608240001_ai_rate_limits_and_metrics.sql'
), 'utf8');

describe('AI aggregate rate limiting migration', () => {
  it('checks daily and minute limits under one transaction lock before incrementing', () => {
    expect(migration).toContain("pg_advisory_xact_lock(hashtext('fitm-ai-rate-limits'))");
    const dailyCheck = migration.indexOf('if daily_used >= daily_limit');
    const minuteCheck = migration.indexOf('if minute_used >= minute_limit');
    const dailyInsert = migration.indexOf('insert into public.ai_daily_usage');
    const minuteInsert = migration.indexOf('insert into public.ai_minute_usage');
    expect(dailyCheck).toBeGreaterThan(0);
    expect(minuteCheck).toBeGreaterThan(dailyCheck);
    expect(dailyInsert).toBeGreaterThan(minuteCheck);
    expect(minuteInsert).toBeGreaterThan(dailyInsert);
  });

  it('stores aggregate counters only and exposes RPCs only to the service role', () => {
    expect(migration).not.toMatch(/\b(ip|session_id|user_agent|message|conversation)\b/iu);
    expect(migration).toContain('grant execute on function public.consume_ai_rate_limits(integer, integer) to service_role');
    expect(migration).toContain('grant execute on function public.record_ai_metric(text, text, integer) to service_role');
  });
});
