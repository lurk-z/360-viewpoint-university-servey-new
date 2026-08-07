alter table public.faculties
  add column if not exists scene_id text,
  add column if not exists hotspot_id text;

create unique index if not exists faculties_scene_id_unique_idx
  on public.faculties(scene_id)
  where scene_id is not null;

create unique index if not exists faculties_hotspot_id_unique_idx
  on public.faculties(hotspot_id)
  where hotspot_id is not null;

comment on column public.faculties.scene_id is
  'Optional stable link to a TourScene. Content editors cannot change tour geometry.';

comment on column public.faculties.hotspot_id is
  'Optional stable link to an existing Info hotspot managed by this faculty record.';
