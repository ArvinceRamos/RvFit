-- One of each "Meal 1" to "Meal 6" per user per day. Older free-text labels do not match
-- the pattern, so they are not affected and can repeat.
create unique index meals_user_date_numbered_label_key
  on public.meals (user_id, meal_date, label)
  where label ~ '^Meal [1-6]$';
