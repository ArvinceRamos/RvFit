-- Every new meal starts unticked and counts toward the day's totals only once ticked as eaten.
-- save_meal does not name the column, so meals from "New meal" and "Log again" now start unticked too.
-- Editing a meal keeps its tick, and existing meals keep theirs.
alter table public.meals
  alter column eaten set default false;
