-- Skill Stack survey: database setup for Supabase.
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Before running, replace YOUR_GITHUB_USERNAME (last section) with your own GitHub username.

-- 1. Who may play (and who is the organizer) ---------------------------------
create table if not exists public.allowed_users (
  github_username text primary key,          -- stored lower-case
  is_admin        boolean not null default false,
  added_at        timestamptz not null default now()
);

-- 2. One row per person; playing again overwrites it --------------------------
create table if not exists public.responses (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  github_username  text not null,
  display_name     text,
  answers          jsonb not null,             -- {ratings:{topic:0-3}, usage:{...}, learn:[...], durationSec, score}
  submitted_at     timestamptz not null default now(),
  first_submitted_at timestamptz not null default now(),
  attempts         int not null default 1
);

-- 3. Helpers -----------------------------------------------------------------
create or replace function public.my_github() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'user_name',
                        auth.jwt() -> 'user_metadata' ->> 'preferred_username'))
$$;

create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from allowed_users where github_username = public.my_github())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from allowed_users where github_username = public.my_github() and is_admin)
$$;

-- Keep attempts / first_submitted_at correct on every re-submit
create or replace function public.responses_touch() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    new.attempts := old.attempts + 1;
    new.first_submitted_at := old.first_submitted_at;
  end if;
  new.submitted_at := now();
  new.github_username := public.my_github();
  return new;
end $$;
drop trigger if exists responses_touch on public.responses;
create trigger responses_touch before insert or update on public.responses
for each row execute function public.responses_touch();

-- 4. Row-level security: the actual access rules ------------------------------
alter table public.allowed_users enable row level security;
alter table public.responses     enable row level security;

drop policy if exists "see own invite or admin sees all" on public.allowed_users;
create policy "see own invite or admin sees all" on public.allowed_users
  for select to authenticated using (github_username = public.my_github() or public.is_admin());
drop policy if exists "admin adds" on public.allowed_users;
create policy "admin adds" on public.allowed_users
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admin removes" on public.allowed_users;
create policy "admin removes" on public.allowed_users
  for delete to authenticated using (public.is_admin() and github_username <> public.my_github());

drop policy if exists "read own or admin reads all" on public.responses;
create policy "read own or admin reads all" on public.responses
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "invited people submit their own" on public.responses;
create policy "invited people submit their own" on public.responses
  for insert to authenticated with check (user_id = auth.uid() and public.is_allowed());
drop policy if exists "invited people update their own" on public.responses;
create policy "invited people update their own" on public.responses
  for update to authenticated using (user_id = auth.uid() and public.is_allowed())
  with check (user_id = auth.uid() and public.is_allowed());

-- 5. Team totals for everyone invited (no names; hidden until 3 people played) --
create or replace function public.team_summary() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  if not public.is_allowed() then return null; end if;
  select count(*) into n from responses;
  if n < 3 and not public.is_admin() then return jsonb_build_object('n', n); end if;
  return jsonb_build_object(
    'n', n,
    'updatedAt', (select max(submitted_at) from responses),
    'ratings', coalesce((select jsonb_object_agg(k, arr) from (
        select k, jsonb_build_array(count(*) filter (where v = '0'), count(*) filter (where v = '1'),
                                    count(*) filter (where v = '2'), count(*) filter (where v = '3')) arr
        from responses, jsonb_each_text(answers -> 'ratings') as e(k, v) group by k) t), '{}'::jsonb),
    'usage', coalesce((select jsonb_object_agg(k, arr) from (
        select k, jsonb_build_array(count(*) filter (where v = '0'), count(*) filter (where v = '1'),
                                    count(*) filter (where v = '2'), count(*) filter (where v = '3')) arr
        from responses, jsonb_each_text(answers -> 'usage') as e(k, v) group by k) t), '{}'::jsonb),
    'learn', coalesce((select jsonb_object_agg(k, c) from (
        select k, count(*) c from responses, jsonb_array_elements_text(answers -> 'learn') as k group by k) t), '{}'::jsonb)
  );
end $$;
revoke all on function public.team_summary() from public, anon;
grant execute on function public.team_summary() to authenticated;

-- 6. You, the organizer -----------------------------------------------------
insert into public.allowed_users (github_username, is_admin)
values (lower('khaiserulla@CodeWalnut'), true)
on conflict (github_username) do update set is_admin = true;

-- Add players here now, or later from the Organizer report → Invite list:
-- insert into public.allowed_users (github_username) values ('octocat'), ('another-user');
