create table if not exists public.app_schema_versions (
  version text primary key,
  description text not null default '',
  applied_at timestamptz not null default now()
);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null check (entity_kind in ('faculties', 'programs', 'activities', 'hotspot_contents')),
  entity_id text not null,
  action text not null check (action in ('create', 'save', 'publish', 'unpublish', 'archive', 'restore', 'delete')),
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists content_revisions_entity_idx
  on public.content_revisions(entity_kind, entity_id, created_at desc);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null check (char_length(action) between 1 and 80),
  entity_kind text not null check (char_length(entity_kind) between 1 and 80),
  entity_id text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs(created_at desc);

create table if not exists public.tour_projects (
  id text primary key default 'main',
  draft_data jsonb not null default '{}'::jsonb,
  published_data jsonb,
  draft_version bigint not null default 1 check (draft_version > 0),
  published_version bigint check (published_version is null or published_version > 0),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = 'main')
);

create table if not exists public.tour_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.tour_projects(id) on delete cascade,
  action text not null check (action in ('create', 'save', 'publish', 'restore')),
  snapshot jsonb not null,
  version bigint not null check (version > 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists tour_revisions_project_idx
  on public.tour_revisions(project_id, created_at desc);

create table if not exists public.tour_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (storage_path <> '' and storage_path not like '%..%'),
  public_url text not null check (public_url ~ '^https?://'),
  file_name text not null check (file_name <> ''),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  checksum text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (abs((width::numeric / height::numeric) - 2) <= 0.02)
);

create unique index if not exists tour_assets_checksum_unique_idx
  on public.tour_assets(checksum)
  where checksum is not null;

alter table public.app_schema_versions enable row level security;
alter table public.content_revisions enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.tour_projects enable row level security;
alter table public.tour_revisions enable row level security;
alter table public.tour_assets enable row level security;

drop policy if exists "staff read schema versions" on public.app_schema_versions;
create policy "staff read schema versions" on public.app_schema_versions for select to authenticated
using (public.current_admin_role() in ('admin', 'editor'));

drop policy if exists "staff read content revisions" on public.content_revisions;
create policy "staff read content revisions" on public.content_revisions for select to authenticated
using (public.current_admin_role() in ('admin', 'editor'));

drop policy if exists "staff read audit logs" on public.admin_audit_logs;
create policy "staff read audit logs" on public.admin_audit_logs for select to authenticated
using (public.current_admin_role() in ('admin', 'editor'));

drop policy if exists "staff read tour projects" on public.tour_projects;
create policy "staff read tour projects" on public.tour_projects for select to authenticated
using (public.current_admin_role() in ('admin', 'editor'));
drop policy if exists "staff insert tour projects" on public.tour_projects;
create policy "staff insert tour projects" on public.tour_projects for insert to authenticated
with check (public.current_admin_role() in ('admin', 'editor'));
drop policy if exists "staff update tour projects" on public.tour_projects;
create policy "staff update tour projects" on public.tour_projects for update to authenticated
using (public.current_admin_role() in ('admin', 'editor'))
with check (public.current_admin_role() in ('admin', 'editor'));

drop policy if exists "staff read tour revisions" on public.tour_revisions;
create policy "staff read tour revisions" on public.tour_revisions for select to authenticated
using (public.current_admin_role() in ('admin', 'editor'));

drop policy if exists "staff read tour assets" on public.tour_assets;
create policy "staff read tour assets" on public.tour_assets for select to authenticated
using (public.current_admin_role() in ('admin', 'editor'));
drop policy if exists "staff insert tour assets" on public.tour_assets;
create policy "staff insert tour assets" on public.tour_assets for insert to authenticated
with check (public.current_admin_role() in ('admin', 'editor'));
drop policy if exists "admins delete tour assets" on public.tour_assets;
create policy "admins delete tour assets" on public.tour_assets for delete to authenticated
using (public.current_admin_role() = 'admin');

create or replace function public.capture_content_revision()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  revision_action text;
  snapshot_value jsonb;
  actor uuid;
  record_id text;
begin
  if tg_op = 'INSERT' then
    revision_action := 'create';
    snapshot_value := to_jsonb(new);
    actor := new.updated_by;
    record_id := new.id::text;
  elsif tg_op = 'DELETE' then
    revision_action := 'delete';
    snapshot_value := to_jsonb(old);
    actor := old.updated_by;
    record_id := old.id::text;
  else
    if new.archived_at is distinct from old.archived_at then
      revision_action := case when new.archived_at is null then 'restore' else 'archive' end;
    elsif new.published_data is distinct from old.published_data then
      revision_action := case
        when new.published_data is null then 'unpublish'
        when old.published_data is null then 'publish'
        else 'publish'
      end;
    else
      revision_action := 'save';
    end if;
    snapshot_value := to_jsonb(old);
    actor := new.updated_by;
    record_id := new.id::text;
  end if;

  insert into public.content_revisions(entity_kind, entity_id, action, snapshot, created_by)
  values (tg_table_name, record_id, revision_action, snapshot_value, actor);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['faculties', 'programs', 'activities', 'hotspot_contents'] loop
    execute format('drop trigger if exists %1$I_capture_revision on public.%1$I', table_name);
    execute format('create trigger %1$I_capture_revision after insert or update or delete on public.%1$I for each row execute function public.capture_content_revision()', table_name);
  end loop;
end $$;

create or replace function public.protect_tour_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_role() = 'editor' and (
    new.published_data is distinct from old.published_data or
    new.published_version is distinct from old.published_version
  ) then
    raise exception 'Editors cannot publish the tour structure';
  end if;
  return new;
end;
$$;

drop trigger if exists tour_projects_protect_publish on public.tour_projects;
create trigger tour_projects_protect_publish before update on public.tour_projects
for each row execute function public.protect_tour_publish();

drop trigger if exists tour_projects_touch_updated_at on public.tour_projects;
create trigger tour_projects_touch_updated_at before update on public.tour_projects
for each row execute function public.touch_updated_at();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('tour-panoramas', 'tour-panoramas', true, 20971520, array['image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff upload tour panoramas" on storage.objects;
create policy "staff upload tour panoramas" on storage.objects for insert to authenticated
with check (bucket_id = 'tour-panoramas' and public.current_admin_role() in ('admin', 'editor'));
drop policy if exists "staff list tour panoramas" on storage.objects;
create policy "staff list tour panoramas" on storage.objects for select to authenticated
using (bucket_id = 'tour-panoramas' and public.current_admin_role() in ('admin', 'editor'));
drop policy if exists "admins delete tour panoramas" on storage.objects;
create policy "admins delete tour panoramas" on storage.objects for delete to authenticated
using (bucket_id = 'tour-panoramas' and public.current_admin_role() = 'admin');

revoke all on public.app_schema_versions, public.content_revisions, public.admin_audit_logs,
  public.tour_projects, public.tour_revisions, public.tour_assets from anon;
grant select on public.app_schema_versions, public.content_revisions, public.admin_audit_logs,
  public.tour_projects, public.tour_revisions, public.tour_assets to authenticated;
grant insert, update on public.tour_projects to authenticated;
grant insert on public.tour_assets to authenticated;
grant delete on public.tour_assets to authenticated;

insert into public.app_schema_versions(version, description)
values
  ('202608070001', 'CMS, roles, media, visits, and daily AI quota'),
  ('202608070002', 'Faculty links to scenes and Info hotspots'),
  ('202608240001', 'AI minute limits and aggregate metrics'),
  ('202608290001', 'Admin revisions, audit log, and dynamic tour structure')
on conflict (version) do update set description = excluded.description;
