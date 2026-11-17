-- Keep-alive for Supabase's Free plan, which pauses projects after 7 days without activity.
-- The GitHub Action in .github/workflows/keep-alive.yml calls this every 3 days.
-- It reads nothing and returns only 'ok', so it is safe for anyone to call.
create or replace function public.keep_alive() returns text
language sql stable as $$ select 'ok'::text $$;
grant execute on function public.keep_alive() to anon, authenticated;
