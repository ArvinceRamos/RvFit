import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";
import { DeleteWorkoutButton } from "@/components/delete-workout-button";
import { SwapControl } from "@/components/swap-control";
import { requireUser } from "@/lib/supabase/auth";
import { choiceLabel, formatCalendarDate, planSummary, restText, schemeText } from "@/lib/workouts/format";
import { orderSwaps } from "@/lib/workouts/swaps";
import { applySwaps, resolveTemplate, resolveTemplateByKey, swapOptions } from "@/lib/workouts/templates";

const recentWorkoutLimit = 10;

function dayName(templateKey: string, dayKey: string): string {
  return resolveTemplateByKey(templateKey)?.days.find((day) => day.key === dayKey)?.name ?? dayKey;
}

export default async function WorkoutsPage({ searchParams }: PageProps<"/workouts">) {
  const { supabase } = await requireUser();
  // Set by the log form after a save, so the user sees it worked.
  const savedParam = (await searchParams).saved;
  const savedNotice = savedParam === "new" || savedParam === "updated" ? savedParam : null;

  const [{ data: saved, error }, { data: recent, error: recentError }] = await Promise.all([
    supabase.from("user_preferences").select("experience, equipment, training_days").maybeSingle(),
    supabase
      .from("workout_logs")
      .select("id, template_key, day_key, performed_on, workout_log_sets(count)")
      .order("performed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(recentWorkoutLimit),
  ]);

  // Never guess level, equipment, or days. A saved row that no longer fits any template is treated as not set.
  const defaultTemplate = saved ? resolveTemplate(saved.experience, saved.training_days, saved.equipment) : null;

  const { data: savedSwaps, error: swapsError } = defaultTemplate
    ? await supabase
        .from("user_exercise_swaps")
        .select("slot_key, exercise_key, updated_at")
        .eq("template_key", defaultTemplate.key)
    : { data: null, error: null };

  const template = defaultTemplate ? applySwaps(defaultTemplate, orderSwaps(savedSwaps ?? [])) : null;
  const defaultExerciseBySlot = new Map(
    defaultTemplate?.days.flatMap((day) => day.slots.map((slot) => [slot.key, slot.exercise.key] as const)),
  );

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Workouts</h1>
      {savedNotice && (
        <p className="alert-success mt-4" role="status">
          {savedNotice === "updated" ? "Workout updated." : "Workout saved. Nice work."}{" "}
          <Link className="font-semibold underline" href="/progress">See your progress</Link>
        </p>
      )}

      {error || swapsError ? (
        <p className="mt-6 text-sm text-danger">Your workout plan could not be loaded. Please try again.</p>
      ) : !template ? (
        <div className="mt-6 grid gap-3">
          <p className="text-sm text-muted">Save your experience, equipment, and training days in Preferences to see your workout plan.</p>
          <Link className="btn-primary w-fit" href="/preferences">Go to Preferences</Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            {planSummary(template.level, template.days.length, template.equipment)} ·{" "}
            <Link className="font-semibold text-ink underline" href="/preferences">Change preferences</Link>
          </p>
          <div className="mt-8 grid gap-[30px] md:grid-cols-2 lg:grid-cols-3">
            {template.days.map((day) => (
              <section className="card" key={day.key}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-medium">{day.name}</h2>
                  <Link className="btn-primary !px-3 !py-2" href={`/workouts/log/new?day=${day.key}`}>Log this workout</Link>
                </div>
                <ul className="mt-3 grid gap-4">
                  {day.slots.map((slot) => {
                    const defaultKey = defaultExerciseBySlot.get(slot.key);
                    return (
                      <li key={slot.key}>
                        <p className="font-semibold">{slot.exercise.name}</p>
                        <p className="text-sm text-muted">{schemeText(slot.scheme, slot.exercise)} · {restText(slot.scheme)}</p>
                        {slot.exercise.cue && <p className="mt-0.5 text-sm italic text-muted"><span className="sr-only">Form tip: </span>{slot.exercise.cue}</p>}
                        <SwapControl
                          choices={swapOptions(template, slot.key)
                            .filter((option) => option.key !== defaultKey)
                            .map((option) => ({ key: option.key, label: choiceLabel(option) }))}
                          isSwapped={slot.exercise.key !== defaultKey}
                          slotKey={slot.key}
                          templateKey={template.key}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-medium tracking-tight">Recent workouts</h2>
        {recentError ? (
          <p className="mt-4 text-sm text-danger">Your recent workouts could not be loaded. Please try again.</p>
        ) : !recent || recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No workouts logged yet.</p>
        ) : (
          <ul className="mt-4 grid gap-[30px] md:grid-cols-2 lg:grid-cols-3">
            {recent.map((log) => {
              // PostgREST returns the set count as a one-item list.
              const setCount = (log.workout_log_sets as unknown as { count: number }[])[0]?.count ?? 0;
              return (
                <li className="card grid gap-3 !p-4" key={log.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{dayName(log.template_key, log.day_key)}</p>
                      <p className="text-sm text-muted">{formatCalendarDate(log.performed_on)} · {setCount} {setCount === 1 ? "set" : "sets"}</p>
                    </div>
                    <Link className="shrink-0 text-sm font-semibold underline" href={`/workouts/log/${log.id}`}>Edit</Link>
                  </div>
                  <div className="flex justify-end">
                    <DeleteWorkoutButton logId={log.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AuthFrame>
  );
}
