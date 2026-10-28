-- KA-1: a real database query for the uptime monitor. Supabase Free pauses a project after a week
-- without database activity, and /api/health only reached Supabase Auth, which may not count.
-- /api/health now calls this function with the public anon key on every check. It reads no tables
-- and returns 1, so it is safe for anyone to call.

create function public.keepalive()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$ select 1 $$;

revoke all on function public.keepalive() from public, anon, authenticated;
grant execute on function public.keepalive() to anon;
