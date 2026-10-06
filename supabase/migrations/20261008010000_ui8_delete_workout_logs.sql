-- UI-8: users can delete their own workout logs. Sets go with the log through the existing
-- "on delete cascade" on workout_log_sets.workout_log_id.
create policy "Users can delete their own workout logs"
  on public.workout_logs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant delete on public.workout_logs to authenticated;
