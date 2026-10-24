-- AU-65: the Phase 1 tables kept Supabase's default truncate, references and trigger grants for
-- signed-in users. Truncate skips row-level security, so a signed-in user should never hold it.
-- The app only needs the select, insert, update and delete grants that each table already lists.
revoke truncate, references, trigger on public.profiles, public.calorie_targets, public.body_logs
  from authenticated;
