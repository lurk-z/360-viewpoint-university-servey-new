create table if not exists public.ai_minute_usage (
  bucket_start timestamptz primary key,
  request_count bigint not null default 0 check (request_count >= 0)
);

create table if not exists public.ai_daily_metrics (
  metric_date date not null,
  intent text not null check (char_length(intent) between 1 and 40),
  outcome text not null check (char_length(outcome) between 1 and 40),
  request_count bigint not null default 0 check (request_count >= 0),
  total_latency_ms bigint not null default 0 check (total_latency_ms >= 0),
  primary key (metric_date, intent, outcome)
);

alter table public.ai_minute_usage enable row level security;
alter table public.ai_daily_metrics enable row level security;

drop policy if exists "admins read ai minute usage" on public.ai_minute_usage;
create policy "admins read ai minute usage" on public.ai_minute_usage for select to authenticated
using (public.current_admin_role() = 'admin');

drop policy if exists "admins read ai metrics" on public.ai_daily_metrics;
create policy "admins read ai metrics" on public.ai_daily_metrics for select to authenticated
using (public.current_admin_role() = 'admin');

revoke all on public.ai_minute_usage, public.ai_daily_metrics from anon, authenticated;
grant select on public.ai_minute_usage, public.ai_daily_metrics to authenticated;

create or replace function public.consume_ai_rate_limits(daily_limit integer, minute_limit integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  day_key date := (now() at time zone 'Asia/Bangkok')::date;
  minute_key timestamptz := date_trunc('minute', now());
  daily_used bigint := 0;
  minute_used bigint := 0;
begin
  if daily_limit < 1 or minute_limit < 1 then
    return jsonb_build_object('allowed', false, 'reason', 'configuration');
  end if;

  perform pg_advisory_xact_lock(hashtext('fitm-ai-rate-limits'));

  select request_count into daily_used
  from public.ai_daily_usage where usage_date = day_key;
  daily_used := coalesce(daily_used, 0);

  select request_count into minute_used
  from public.ai_minute_usage where bucket_start = minute_key;
  minute_used := coalesce(minute_used, 0);

  if daily_used >= daily_limit then
    return jsonb_build_object(
      'allowed', false, 'reason', 'daily',
      'daily_used', daily_used, 'minute_used', minute_used
    );
  end if;
  if minute_used >= minute_limit then
    return jsonb_build_object(
      'allowed', false, 'reason', 'minute',
      'daily_used', daily_used, 'minute_used', minute_used
    );
  end if;

  insert into public.ai_daily_usage(usage_date, request_count)
  values (day_key, 1)
  on conflict (usage_date) do update
    set request_count = public.ai_daily_usage.request_count + 1
  returning request_count into daily_used;

  insert into public.ai_minute_usage(bucket_start, request_count)
  values (minute_key, 1)
  on conflict (bucket_start) do update
    set request_count = public.ai_minute_usage.request_count + 1
  returning request_count into minute_used;

  delete from public.ai_minute_usage where bucket_start < now() - interval '2 days';

  return jsonb_build_object(
    'allowed', true,
    'daily_used', daily_used,
    'minute_used', minute_used
  );
end;
$$;

create or replace function public.record_ai_metric(
  intent_name text,
  outcome_name text,
  latency_ms integer
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if intent_name is null or outcome_name is null
    or char_length(intent_name) not between 1 and 40
    or char_length(outcome_name) not between 1 and 40 then
    return;
  end if;
  insert into public.ai_daily_metrics(metric_date, intent, outcome, request_count, total_latency_ms)
  values (
    (now() at time zone 'Asia/Bangkok')::date,
    intent_name,
    outcome_name,
    1,
    greatest(0, coalesce(latency_ms, 0))
  )
  on conflict (metric_date, intent, outcome) do update
    set request_count = public.ai_daily_metrics.request_count + 1,
        total_latency_ms = public.ai_daily_metrics.total_latency_ms + excluded.total_latency_ms;
end;
$$;

create or replace function public.get_ai_dashboard_summary()
returns jsonb language sql security definer set search_path = public as $$
  with program_readiness as (
    select
      count(*) filter (
        where jsonb_array_length(coalesce(draft_data->'interestTags'->'th', '[]'::jsonb)) > 0
          and jsonb_array_length(coalesce(draft_data->'interestTags'->'en', '[]'::jsonb)) > 0
          and jsonb_array_length(coalesce(draft_data->'careerTags'->'th', '[]'::jsonb)) > 0
          and jsonb_array_length(coalesce(draft_data->'careerTags'->'en', '[]'::jsonb)) > 0
      ) as tagged_programs,
      count(*) filter (
        where jsonb_array_length(coalesce(draft_data->'eligibleQualifications', '[]'::jsonb)) > 0
          and coalesce(draft_data->>'studyLevel', '') <> ''
      ) as structured_programs,
      count(*) filter (
        where jsonb_array_length(coalesce(draft_data->'interestTags'->'th', '[]'::jsonb)) > 0
          and jsonb_array_length(coalesce(draft_data->'interestTags'->'en', '[]'::jsonb)) > 0
          and jsonb_array_length(coalesce(draft_data->'careerTags'->'th', '[]'::jsonb)) > 0
          and jsonb_array_length(coalesce(draft_data->'careerTags'->'en', '[]'::jsonb)) > 0
          and jsonb_array_length(coalesce(draft_data->'eligibleQualifications', '[]'::jsonb)) > 0
          and coalesce(draft_data->>'studyLevel', '') <> ''
      ) as ready_programs,
      count(*) as total_programs
    from public.programs
    where archived_at is null
  ), today_metrics as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'intent', intent,
      'outcome', outcome,
      'count', request_count,
      'averageLatencyMs', case when request_count > 0 then round(total_latency_ms::numeric / request_count) else 0 end
    ) order by request_count desc), '[]'::jsonb) as metrics
    from public.ai_daily_metrics
    where metric_date = (now() at time zone 'Asia/Bangkok')::date
  )
  select jsonb_build_object(
    'dailyUsed', coalesce((select request_count from public.ai_daily_usage
      where usage_date = (now() at time zone 'Asia/Bangkok')::date), 0),
    'minuteUsed', coalesce((select request_count from public.ai_minute_usage
      where bucket_start = date_trunc('minute', now())), 0),
    'taggedPrograms', program_readiness.tagged_programs,
    'structuredPrograms', program_readiness.structured_programs,
    'pendingPrograms', program_readiness.total_programs - program_readiness.ready_programs,
    'metrics', today_metrics.metrics
  )
  from program_readiness cross join today_metrics;
$$;

revoke all on function public.consume_ai_rate_limits(integer, integer) from public, anon, authenticated;
revoke all on function public.record_ai_metric(text, text, integer) from public, anon, authenticated;
revoke all on function public.get_ai_dashboard_summary() from public, anon, authenticated;
grant execute on function public.consume_ai_rate_limits(integer, integer) to service_role;
grant execute on function public.record_ai_metric(text, text, integer) to service_role;
grant execute on function public.get_ai_dashboard_summary() to service_role;
