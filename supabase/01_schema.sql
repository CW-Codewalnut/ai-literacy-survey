-- CodeWalnut AI Literacy Survey: database schema and access rules.
-- Run once in Supabase → SQL Editor on a fresh project, then run 02_seed_questions.sql,
-- then 03_first_admin.sql. Safe to re-run: it only creates what is missing and refreshes rules.
-- This file contains no secrets.


-- ─── Who is signed in ─────────────────────────────────────────────────────────
create or replace function public.my_github() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'user_name',
                        auth.jwt() -> 'user_metadata' ->> 'preferred_username', ''))
$$;

create or replace function public.my_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', ''))
$$;

-- A person can be identified by their GitHub username or their email.
create or replace function public.my_ids() returns text[]
language sql stable as $$
  select array_remove(array[nullif(public.my_github(), ''), nullif(public.my_email(), '')], null)
$$;

-- ─── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.admins (
  identity   text primary key check (identity = lower(identity)),   -- GitHub username or email
  added_at   timestamptz not null default now(),
  added_by   text
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where identity = any (public.my_ids()))
$$;

create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null
);

create table if not exists public.categories (
  id          text primary key,                 -- e.g. 'data-engineering'
  name        text not null,
  description text,
  sort        int  not null default 0,
  skill_lanes jsonb not null                    -- 4 lane labels for skill sections
);

create table if not exists public.sections (
  id          uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories(id) on delete cascade,
  sort        int  not null default 0,
  name        text not null,
  short       text,
  color       text,
  kind        text not null default 'skill' check (kind in ('skill', 'frequency', 'tools')),
  intro       text,
  active      boolean not null default true
);

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references public.sections(id) on delete cascade,
  sort        int  not null default 0,
  title       text not null,
  description text,
  active      boolean not null default true
);

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  client     text,
  notes      text,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id                   uuid primary key default gen_random_uuid(),
  identity             text not null check (identity = lower(identity)),   -- email or GitHub username
  team_id              uuid not null references public.teams(id) on delete cascade,
  category_id          text not null references public.categories(id),
  exclude_from_reports boolean not null default false,
  created_at           timestamptz not null default now(),
  created_by           text,
  unique (identity, team_id, category_id)
);

create table if not exists public.responses (
  invitation_id      uuid primary key references public.invitations(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  github_username    text,
  email              text,
  display_name       text,
  answers            jsonb not null,    -- {ratings:{questionId:0-3}, learn:[questionId], durationSec}
  attempts           int not null default 1,
  first_submitted_at timestamptz not null default now(),
  submitted_at       timestamptz not null default now()
);

create table if not exists public.access_requests (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  github_username text,
  email           text,
  display_name    text,
  requested_at    timestamptz not null default now()
);

create index if not exists invitations_team_idx on public.invitations(team_id);
create index if not exists questions_section_idx on public.questions(section_id);
create index if not exists sections_category_idx on public.sections(category_id);

-- Keep identity fields, attempt count and timestamps honest on every save
create or replace function public.responses_touch() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    new.attempts := old.attempts + 1;
    new.first_submitted_at := old.first_submitted_at;
  end if;
  new.submitted_at := now();
  new.github_username := nullif(public.my_github(), '');
  new.email := nullif(public.my_email(), '');
  return new;
end $$;
drop trigger if exists responses_touch on public.responses;
create trigger responses_touch before insert or update on public.responses
for each row execute function public.responses_touch();

-- ─── Row-level security: the real access rules ─────────────────────────────────
alter table public.admins          enable row level security;
alter table public.app_settings    enable row level security;
alter table public.categories      enable row level security;
alter table public.sections        enable row level security;
alter table public.questions       enable row level security;
alter table public.teams           enable row level security;
alter table public.invitations     enable row level security;
alter table public.responses       enable row level security;
alter table public.access_requests enable row level security;

do $$
declare t text;
begin
  -- drop all existing policies on our tables so this file can be re-run cleanly
  for t in select distinct tablename from pg_policies where schemaname = 'public'
    and tablename in ('admins','app_settings','categories','sections','questions','teams','invitations','responses','access_requests')
  loop
    execute (select string_agg(format('drop policy if exists %I on public.%I;', policyname, tablename), ' ')
             from pg_policies where schemaname = 'public' and tablename = t);
  end loop;
end $$;

-- Admins: admins see and manage the list; anyone can see whether they themselves are an admin.
create policy admins_read   on public.admins for select to authenticated using (public.is_admin() or identity = any (public.my_ids()));
create policy admins_add    on public.admins for insert to authenticated with check (public.is_admin());
create policy admins_remove on public.admins for delete to authenticated using (public.is_admin() and not (identity = any (public.my_ids())));

-- Settings: admins only
create policy settings_all on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Question banks: everyone signed in can read (needed to take a survey); admins edit
create policy categories_read  on public.categories for select to authenticated using (true);
create policy categories_write on public.categories for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sections_read    on public.sections   for select to authenticated using (true);
create policy sections_write   on public.sections   for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy questions_read   on public.questions  for select to authenticated using (true);
create policy questions_write  on public.questions  for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Invitations: admins manage; people see their own
create policy invitations_read  on public.invitations for select to authenticated using (public.is_admin() or identity = any (public.my_ids()));
create policy invitations_write on public.invitations for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Teams: admins manage; invited people can see the name of their own team
create policy teams_read  on public.teams for select to authenticated using (
  public.is_admin() or exists (select 1 from public.invitations i where i.team_id = teams.id and i.identity = any (public.my_ids())));
create policy teams_write on public.teams for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Responses: each person writes and reads only their own; admins read and delete all
create policy responses_read   on public.responses for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy responses_insert on public.responses for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.invitations i where i.id = invitation_id and i.identity = any (public.my_ids())));
create policy responses_update on public.responses for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.invitations i where i.id = invitation_id and i.identity = any (public.my_ids())));
create policy responses_delete on public.responses for delete to authenticated using (public.is_admin());

-- People who signed in without an invitation
create policy requests_insert on public.access_requests for insert to authenticated with check (user_id = auth.uid());
create policy requests_update on public.access_requests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy requests_read   on public.access_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy requests_delete on public.access_requests for delete to authenticated using (public.is_admin() or user_id = auth.uid());

-- Signed-out visitors get nothing
revoke all on all tables in schema public from anon;

-- Default report exclusions (editable in Admin → Settings)
insert into public.app_settings (key, value)
values ('exclude_words', '["khaiserulla", "nattu", "rabbani", "codewalnut"]'::jsonb)
on conflict (key) do nothing;

-- Keep-alive endpoint for the Free plan (see supabase/04_keep_alive.sql)
create or replace function public.keep_alive() returns text
language sql stable as $$ select 'ok'::text $$;
grant execute on function public.keep_alive() to anon, authenticated;
