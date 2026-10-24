-- AU-50: calorie targets are append-only history. A signed-in user can read and add targets but can
-- no longer change or remove a saved one. The app never updates or deletes targets
-- (save_profile_and_target only inserts). Account deletion still removes them through the
-- user_id foreign key cascade, which runs as the admin and does not use these grants.
-- body_logs keeps DELETE for the planned weigh-in delete.

-- TRUNCATE skips row-level security, so it goes too (the API cannot send it, but direct SQL could).
revoke update, delete, truncate on public.calorie_targets from authenticated;

-- Replace the "for all" policy with select and insert policies, so the policies match the grants.
drop policy "Users can manage their own calorie targets" on public.calorie_targets;

create policy "Users can read their own calorie targets"
  on public.calorie_targets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own calorie targets"
  on public.calorie_targets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
