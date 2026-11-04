-- RV-5 and RV-6 (docs/SPLITS-AND-CALORIES.md, 2026-11-04 review). Database safety nets for rules the app already
-- checks in TypeScript. The mobile app saves targets straight from the phone, so the database must hold them too.
-- NOT VALID: the checks apply to new and changed rows only, and no existing row is rewritten or rejected.

-- Calorie floor. Mirrors the lowest of calculationConfig.formula_branch_floors_kcal (1,200, the manual-target
-- floor; a placeholder). Keep in step with src/lib/calc/config.ts.
alter table public.calorie_targets
  add constraint calorie_targets_floor_placeholder_check check (target_kcal >= 1200) not valid;

-- Protein cap. Mirrors calculationConfig.macros.protein_calorie_cap_fraction (0.35) at 4 kcal per gram.
alter table public.calorie_targets
  add constraint calorie_targets_protein_cap_placeholder_check check (protein_g * 4 <= target_kcal * 0.35) not valid;

-- No workouts dated in the future. One day of slack, because the database date is UTC and the user's is local.
create function private.reject_future_workout_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.performed_on > current_date + 1 then
    raise exception 'Workout date cannot be in the future.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_future_workout_date() from public, anon, authenticated;

create trigger workout_logs_reject_future_date
  before insert or update of performed_on on public.workout_logs
  for each row execute function private.reject_future_workout_date();
