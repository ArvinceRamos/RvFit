-- Beginners can now choose 5 or 6 training days, the same range as intermediate users.
alter table public.user_preferences
  drop constraint user_preferences_training_days_check;

alter table public.user_preferences
  add constraint user_preferences_training_days_check check (
    experience in ('beginner', 'intermediate')
    and training_days between 2 and 6
  );
