import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { SwapControl } from "@/components/swap-control";
import { createClient } from "@/lib/supabase/server";
import { choiceLabel, formatCalendarDate, planSummary, restText, schemeText } from "@/lib/workouts/format";
import { orderSwaps } from "@/lib/workouts/swaps";
import { applySwaps, resolveTemplate, resolveTemplateByKey, swapOptions } from "@/lib/workouts/templates";

const recentWorkoutLimit = 10;

function dayName(templateKey: string, dayKey: string): string {
  return resolveTemplateByKey(templateKey)?.days.find((day) => day.key === dayKey)?.name ?? dayKey;
}

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saved, error } = await supabase
    .from("user_preferences")
    .select("experience, equipment, training_days")
    .maybeSingle();

  // Never guess level, equipment, or days. A saved row that no longer fits any template is treated as not set.
  const defaultTemplate = saved ? resolveTemplate(saved.experience, saved.training_days, saved.equipment) : null;

  const { data: savedSwaps, error: swapsError } = defaultTemplate
    ? await supabase
        .from("user_exercise_swaps")
        .select("slot_key, exercise_key, updated_at")
        .eq("template_key", defaultTemplate.key)
    : { data: null, error: null };

  const { data: recent, error: recentError } = await supabase
    .from("workout_logs")
    .select("id, template_key, day_key, performed_on, workout_log_sets(count)")
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(recentWorkoutLimit);

  const template = defaultTemplate ? applySwaps(defaultTemplate, orderSwaps(savedSwaps ?? [])) : null;
  const defaultExerciseBySlot = new Map(
    defaultTemplate?.days.flatMap((day) => day.slots.map((slot) => [slot.key, slot.exercise.key] as const)),
  );

  return (
    <AuthFrame showNav>
      <h1 className="text-3xl font-bold tracking-tight">Workouts</h1>

      {error || swapsError ? (
        <p className="mt-6 text-sm text-red-800">Your workout plan could not be loaded. Please try again.</p>
      ) : !template ? (
        <div className="mt-6 grid gap-3">
          <p className="text-sm text-zinc-700">Save your experience, equipment, and training days in Preferences to see your workout plan.</p>
          <Link className="w-fit rounded-lg bg-lime-400 px-4 py-3 font-bold" href="/preferences">Go to Preferences</Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-zinc-700">
            {planSummary(template.level, template.days.length, template.equipment)} ·{" "}
            <Link className="font-semibold underline" href="/preferences">Change preferences</Link>
          </p>
          <div className="mt-6 grid gap-4">
            {template.days.map((day) => (
              <section className="rounded-xl border border-zinc-200 bg-white p-4" key={day.key}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">{day.name}</h2>
                  <Link className="rounded-lg bg-lime-400 px-3 py-2 text-sm font-bold" href={`/workouts/log/new?day=${day.key}`}>Log this workout</Link>
                </div>
                <ul className="mt-3 grid gap-4">
                  {day.slots.map((slot) => {
                    const defaultKey = defaultExerciseBySlot.get(slot.key);
                    return (
                      <li key={slot.key}>
                        <p className="font-semibold">{slot.exercise.name}</p>
                        <p className="text-sm text-zinc-700">{schemeText(slot.scheme, slot.exercise)} · {restText(slot.scheme)}</p>
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
        <h2 className="text-2xl font-bold tracking-tight">Recent workouts</h2>
        {recentError ? (
          <p className="mt-4 text-sm text-red-800">Your recent workouts could not be loaded. Please try again.</p>
        ) : !recent || recent.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-700">No workouts logged yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {recent.map((log) => {
              // PostgREST returns the set count as a one-item list.
              const setCount = (log.workout_log_sets as unknown as { count: number }[])[0]?.count ?? 0;
              return (
                <li className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4" key={log.id}>
                  <div>
                    <p className="font-bold">{dayName(log.template_key, log.day_key)}</p>
                    <p className="text-sm text-zinc-600">{formatCalendarDate(log.performed_on)} · {setCount} {setCount === 1 ? "set" : "sets"}</p>
                  </div>
                  <Link className="text-sm font-semibold underline" href={`/workouts/log/${log.id}`}>Edit</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AuthFrame>
  );
}
