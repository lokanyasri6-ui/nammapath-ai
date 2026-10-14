-- =====================================================================
-- NammaPath AI — initial schema
-- Run in the Supabase SQL editor, or with `supabase db push`.
-- All writes from the web app go through Next.js API routes using the
-- service-role key (server-side only). The anon role can only READ the
-- public map data; it cannot write anything directly.
-- =====================================================================

create extension if not exists postgis with schema extensions;

-- ---------- pedestrian graph ----------------------------------------
create table if not exists public.pedestrian_nodes (
  id          text primary key,
  name        text not null,
  name_ta     text not null default '',
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  geom        extensions.geography(Point, 4326)
                generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  kind        text not null check (kind in ('junction','entrance','landmark','transit')),
  selectable  boolean not null default false,
  origin      text not null default 'synthetic_demo' check (origin in ('synthetic_demo','community','verified_survey')),
  created_at  timestamptz not null default now()
);
create index if not exists pedestrian_nodes_geom_idx on public.pedestrian_nodes using gist (geom);

create table if not exists public.pedestrian_segments (
  id              text primary key,
  from_node       text not null references public.pedestrian_nodes(id) on delete cascade,
  to_node         text not null references public.pedestrian_nodes(id) on delete cascade,
  via             jsonb,               -- optional [[lat,lng],...] intermediate points
  name            text not null,
  steps           text not null default 'unknown' check (steps in ('none','some','stairs_only','unknown')),
  ramp            text not null default 'unknown' check (ramp in ('present','absent','not_needed','unknown')),
  surface         text not null default 'unknown' check (surface in ('good','fair','poor','unknown')),
  width_m         numeric(4,2) check (width_m is null or width_m > 0),
  slope_pct       numeric(4,1) check (slope_pct is null or slope_pct >= 0),
  safe_crossing   text not null default 'not_applicable' check (safe_crossing in ('yes','no','unknown','not_applicable')),
  tactile_paving  text not null default 'unknown' check (tactile_paving in ('yes','no','unknown')),
  handrail        text not null default 'not_applicable' check (handrail in ('yes','no','unknown','not_applicable')),
  verification    text not null default 'unverified' check (verification in ('verified','community','unverified')),
  origin          text not null default 'synthetic_demo' check (origin in ('synthetic_demo','community','verified_survey')),
  updated_at      timestamptz not null default now(),
  check (from_node <> to_node)
);
create index if not exists pedestrian_segments_from_idx on public.pedestrian_segments (from_node);
create index if not exists pedestrian_segments_to_idx on public.pedestrian_segments (to_node);

-- ---------- barrier reports -----------------------------------------
create table if not exists public.barrier_reports (
  id                 text primary key,
  lat                double precision not null check (lat between -90 and 90),
  lng                double precision not null check (lng between -180 and 180),
  geom               extensions.geography(Point, 4326)
                       generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  segment_id         text references public.pedestrian_segments(id) on delete set null,
  category           text not null check (category in ('broken_footpath','blocked_ramp','stairs','construction_debris','waterlogging','other')),
  severity           text not null check (severity in ('low','medium','high','impassable')),
  description        text not null default '' check (char_length(description) <= 500),
  status             text not null default 'pending' check (status in ('pending','confirmed','disputed','resolved')),
  origin             text not null default 'community' check (origin in ('synthetic_demo','community','verified_survey')),
  -- AI prediction (kept separately from the user-confirmed category above)
  ai_category        text check (ai_category in ('broken_footpath','blocked_ramp','stairs','construction_debris','waterlogging','other','no_barrier_visible')),
  ai_severity        text check (ai_severity in ('low','medium','high','impassable')),
  ai_confidence      numeric(4,3) check (ai_confidence is null or ai_confidence between 0 and 1),
  ai_explanation     text,
  ai_uncertainty     text,
  ai_provider        text check (ai_provider in ('gemini','demo')),
  ai_is_demo         boolean,
  user_corrected_ai  boolean not null default false,
  photo_path         text,              -- object path inside the PRIVATE report-photos bucket
  reporter_id        text not null,     -- anonymous random device id, not personal data
  language           text not null default 'en' check (language in ('en','ta')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  last_verified_at   timestamptz not null default now()
);
create index if not exists barrier_reports_geom_idx on public.barrier_reports using gist (geom);
create index if not exists barrier_reports_status_idx on public.barrier_reports (status, updated_at desc);
create index if not exists barrier_reports_segment_idx on public.barrier_reports (segment_id) where status <> 'resolved';
create index if not exists barrier_reports_category_idx on public.barrier_reports (category);

create table if not exists public.report_votes (
  id          bigint generated always as identity primary key,
  report_id   text not null references public.barrier_reports(id) on delete cascade,
  client_id   text not null,
  action      text not null check (action in ('confirm','dispute','resolve')),
  created_at  timestamptz not null default now(),
  unique (report_id, client_id, action, created_at)
);
create index if not exists report_votes_report_idx on public.report_votes (report_id);

create table if not exists public.report_status_history (
  id           bigint generated always as identity primary key,
  report_id    text not null references public.barrier_reports(id) on delete cascade,
  from_status  text check (from_status in ('pending','confirmed','disputed','resolved')),
  to_status    text not null check (to_status in ('pending','confirmed','disputed','resolved')),
  actor        text not null check (actor in ('system','community','moderator')),
  note         text not null default '',
  created_at   timestamptz not null default now(),
  unique (report_id, created_at, to_status)
);
create index if not exists report_status_history_report_idx on public.report_status_history (report_id, created_at);

-- ---------- moderators (for a future Supabase-Auth moderator login) --
create table if not exists public.moderators (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'moderator' check (role in ('moderator','admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderators m where m.user_id = auth.uid());
$$;

-- ---------- Row Level Security --------------------------------------
alter table public.pedestrian_nodes       enable row level security;
alter table public.pedestrian_segments    enable row level security;
alter table public.barrier_reports        enable row level security;
alter table public.report_votes           enable row level security;
alter table public.report_status_history  enable row level security;
alter table public.moderators             enable row level security;

-- Public read access to map data only. No anon INSERT/UPDATE/DELETE policies exist,
-- so all writes must go through the server (service role bypasses RLS).
drop policy if exists "public read nodes" on public.pedestrian_nodes;
create policy "public read nodes" on public.pedestrian_nodes for select using (true);
drop policy if exists "public read segments" on public.pedestrian_segments;
create policy "public read segments" on public.pedestrian_segments for select using (true);
drop policy if exists "public read reports" on public.barrier_reports;
create policy "public read reports" on public.barrier_reports for select using (true);
drop policy if exists "public read history" on public.report_status_history;
create policy "public read history" on public.report_status_history for select using (true);
-- votes: device ids are not exposed to anon clients
drop policy if exists "moderators read votes" on public.report_votes;
create policy "moderators read votes" on public.report_votes for select using (public.is_moderator());
-- moderators can update report status directly (e.g. from a future Supabase-Auth console)
drop policy if exists "moderators update reports" on public.barrier_reports;
create policy "moderators update reports" on public.barrier_reports for update using (public.is_moderator()) with check (public.is_moderator());
drop policy if exists "moderators read self" on public.moderators;
create policy "moderators read self" on public.moderators for select using (user_id = auth.uid());

-- ---------- private photo bucket ------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;
-- No storage policies are created: only the service role (server) can read/write.
-- The app hands out short-lived signed URLs when a photo is requested.
