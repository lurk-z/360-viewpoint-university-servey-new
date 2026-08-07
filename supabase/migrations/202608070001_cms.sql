create extension if not exists pgcrypto;

do $$ begin
  create type public.admin_role as enum ('admin', 'editor');
exception when duplicate_object then null;
end $$;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.admin_role not null default 'editor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_admin_role()
returns public.admin_role
language sql stable security definer
set search_path = public
as $$
  select role from public.admin_profiles where user_id = auth.uid();
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.faculties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  draft_data jsonb not null default '{}'::jsonb,
  published_data jsonb,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  draft_data jsonb not null default '{}'::jsonb,
  published_data jsonb,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  draft_data jsonb not null default '{}'::jsonb,
  published_data jsonb,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hotspot_contents (
  id text primary key,
  scene_id text not null,
  draft_data jsonb not null default '{}'::jsonb,
  published_data jsonb,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_visit_counts (
  visit_date date primary key,
  view_count bigint not null default 0 check (view_count >= 0)
);

create table if not exists public.ai_daily_usage (
  usage_date date primary key,
  request_count bigint not null default 0 check (request_count >= 0)
);

create index if not exists programs_faculty_id_idx on public.programs(faculty_id);
create index if not exists hotspot_contents_scene_id_idx on public.hotspot_contents(scene_id);

drop trigger if exists faculties_touch_updated_at on public.faculties;
create trigger faculties_touch_updated_at before update on public.faculties
for each row execute function public.touch_updated_at();
drop trigger if exists programs_touch_updated_at on public.programs;
create trigger programs_touch_updated_at before update on public.programs
for each row execute function public.touch_updated_at();
drop trigger if exists activities_touch_updated_at on public.activities;
create trigger activities_touch_updated_at before update on public.activities
for each row execute function public.touch_updated_at();
drop trigger if exists hotspots_touch_updated_at on public.hotspot_contents;
create trigger hotspots_touch_updated_at before update on public.hotspot_contents
for each row execute function public.touch_updated_at();

create or replace function public.protect_published_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_role() = 'editor' and (
    new.published_data is distinct from old.published_data or
    new.archived_at is distinct from old.archived_at
  ) then
    raise exception 'Editors cannot publish, unpublish, or archive content';
  end if;
  return new;
end;
$$;

drop trigger if exists faculties_protect_publish on public.faculties;
create trigger faculties_protect_publish before update on public.faculties
for each row execute function public.protect_published_content();
drop trigger if exists programs_protect_publish on public.programs;
create trigger programs_protect_publish before update on public.programs
for each row execute function public.protect_published_content();
drop trigger if exists activities_protect_publish on public.activities;
create trigger activities_protect_publish before update on public.activities
for each row execute function public.protect_published_content();
drop trigger if exists hotspots_protect_publish on public.hotspot_contents;
create trigger hotspots_protect_publish before update on public.hotspot_contents
for each row execute function public.protect_published_content();

alter table public.admin_profiles enable row level security;
alter table public.faculties enable row level security;
alter table public.programs enable row level security;
alter table public.activities enable row level security;
alter table public.hotspot_contents enable row level security;
alter table public.daily_visit_counts enable row level security;
alter table public.ai_daily_usage enable row level security;

create policy "admin profiles read own or admin" on public.admin_profiles for select to authenticated
using (user_id = auth.uid() or public.current_admin_role() = 'admin');
create policy "admins insert profiles" on public.admin_profiles for insert to authenticated
with check (public.current_admin_role() = 'admin');
create policy "admins update profiles" on public.admin_profiles for update to authenticated
using (public.current_admin_role() = 'admin') with check (public.current_admin_role() = 'admin');
create policy "admins delete profiles" on public.admin_profiles for delete to authenticated
using (public.current_admin_role() = 'admin');

do $$
declare table_name text;
begin
  foreach table_name in array array['faculties', 'programs', 'activities', 'hotspot_contents'] loop
    execute format('create policy "staff read %1$s" on public.%1$I for select to authenticated using (public.current_admin_role() in (''admin'', ''editor''))', table_name);
    execute format('create policy "staff insert %1$s" on public.%1$I for insert to authenticated with check (public.current_admin_role() in (''admin'', ''editor''))', table_name);
    execute format('create policy "staff update %1$s" on public.%1$I for update to authenticated using (public.current_admin_role() in (''admin'', ''editor'')) with check (public.current_admin_role() in (''admin'', ''editor''))', table_name);
    execute format('create policy "admins delete %1$s" on public.%1$I for delete to authenticated using (public.current_admin_role() = ''admin'')', table_name);
  end loop;
exception when duplicate_object then null;
end $$;

create policy "staff read visit totals" on public.daily_visit_counts for select to authenticated
using (public.current_admin_role() in ('admin', 'editor'));
create policy "admins read ai usage" on public.ai_daily_usage for select to authenticated
using (public.current_admin_role() = 'admin');

create or replace function public.increment_daily_visit()
returns bigint language plpgsql security definer set search_path = public as $$
declare result bigint;
begin
  insert into public.daily_visit_counts(visit_date, view_count)
  values ((now() at time zone 'Asia/Bangkok')::date, 1)
  on conflict (visit_date) do update set view_count = public.daily_visit_counts.view_count + 1
  returning view_count into result;
  return result;
end;
$$;

create or replace function public.consume_ai_quota(limit_count integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare result bigint;
begin
  if limit_count < 1 then return false; end if;
  insert into public.ai_daily_usage(usage_date, request_count)
  values ((now() at time zone 'Asia/Bangkok')::date, 1)
  on conflict (usage_date) do update
    set request_count = public.ai_daily_usage.request_count + 1
    where public.ai_daily_usage.request_count < limit_count
  returning request_count into result;
  return result is not null and result <= limit_count;
end;
$$;

revoke all on public.faculties, public.programs, public.activities, public.hotspot_contents from anon;
revoke all on public.daily_visit_counts, public.ai_daily_usage from anon, authenticated;
grant select, insert, update, delete on public.faculties, public.programs, public.activities, public.hotspot_contents to authenticated;
grant select on public.admin_profiles to authenticated;
grant insert, update, delete on public.admin_profiles to authenticated;
grant select on public.daily_visit_counts, public.ai_daily_usage to authenticated;
revoke all on function public.increment_daily_visit() from public, anon, authenticated;
revoke all on function public.consume_ai_quota(integer) from public, anon, authenticated;
grant execute on function public.increment_daily_visit() to service_role;
grant execute on function public.consume_ai_quota(integer) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('content-media', 'content-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "staff upload content media" on storage.objects for insert to authenticated
with check (bucket_id = 'content-media' and public.current_admin_role() in ('admin', 'editor'));
create policy "staff update content media" on storage.objects for update to authenticated
using (bucket_id = 'content-media' and public.current_admin_role() in ('admin', 'editor'))
with check (bucket_id = 'content-media' and public.current_admin_role() in ('admin', 'editor'));
create policy "staff list content media" on storage.objects for select to authenticated
using (bucket_id = 'content-media' and public.current_admin_role() in ('admin', 'editor'));
create policy "admins delete content media" on storage.objects for delete to authenticated
using (bucket_id = 'content-media' and public.current_admin_role() = 'admin');

-- Bootstrap the first administrator after creating a Supabase Auth user:
-- insert into public.admin_profiles(user_id, display_name, role)
-- values ('AUTH-USER-UUID', 'Project administrator', 'admin');
