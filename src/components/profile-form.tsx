"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfileAndTargetAction } from "@/app/profile/actions";
import { checkMacroMismatch, validateMacroEdit, type DefaultMacros } from "@/lib/calc/calculate";
import { calculationConfig, type ActivityLevel, type FormulaBranch } from "@/lib/calc/config";
import { computeProfileTarget, heightFields, weightField, type ComputedTarget, type ProfileFormInput } from "@/lib/profile-save";
import { activityOptions, goalOptions } from "@/lib/target-options";
import type { PreferredUnits } from "@/lib/weigh-in";

export type SavedProfile = {
  age_years: number | null;
  sex: FormulaBranch | null;
  height_cm: number | null;
  activity: ActivityLevel | null;
  units: PreferredUnits;
};

export type CurrentTarget = {
  source: "calculated" | "manual";
  kcal: number;
  goal: "lose" | "maintain" | "gain" | null;
  pace: "gradual" | "steady" | null;
  macros: DefaultMacros;
  created_at: string;
};

type MacroText = Record<keyof DefaultMacros, string>;

const fieldClass = "field w-full min-w-0";
const macroFields: [keyof DefaultMacros, string][] = [["protein_g", "Protein"], ["carbs_g", "Carbohydrates"], ["fat_g", "Fat"], ["fiber_g", "Fiber"]];
const savedMessage = "New target saved.";
const { pounds_to_kilograms: lbToKg, inches_to_centimeters: inToCm, inches_per_foot: inPerFoot } = calculationConfig.unit_conversions;

function choiceClass(selected: boolean): string {
  return `rounded-xl border px-3 py-2 text-left font-semibold ${selected ? "border-selected-edge bg-selected" : "border-edge bg-field"}`;
}

function toText(macros: DefaultMacros): MacroText {
  return { protein_g: String(macros.protein_g), carbs_g: String(macros.carbs_g), fat_g: String(macros.fat_g), fiber_g: String(macros.fiber_g) };
}

// Whole grams, or null when a box is blank or not a whole number.
function fromText(text: MacroText): DefaultMacros | null {
  const values = macroFields.map(([name]) => (text[name].trim() === "" ? Number.NaN : Number(text[name])));
  if (values.some((value) => !Number.isInteger(value))) return null;
  const [protein_g, carbs_g, fat_g, fiber_g] = values;
  return { protein_g, carbs_g, fat_g, fiber_g };
}

function initialDetails(profile: SavedProfile, current: CurrentTarget | null, latestWeightKg: number | null): ProfileFormInput {
  const height = profile.height_cm === null ? { height: "", feet: "", inches: "" } : heightFields(profile.height_cm, profile.units);
  return {
    method: current?.source ?? "calculated",
    units: profile.units,
    age: profile.age_years === null ? "" : String(profile.age_years),
    ...height,
    weight: latestWeightKg === null ? "" : weightField(latestWeightKg, profile.units),
    sex: profile.sex ?? "",
    activity: profile.activity ?? "",
    goal: current?.goal ?? "maintain",
    pace: current?.pace ?? "gradual",
    targetKcal: current ? String(current.kcal) : "",
  };
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return (
    <label className="grid min-w-0 content-start gap-1 text-sm font-semibold">
      {label}
      <input className={fieldClass} inputMode="decimal" onChange={(event) => onChange(event.target.value)} type="text" value={value} />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function ProfileForm({ profile, current, latestWeightKg }: { profile: SavedProfile; current: CurrentTarget | null; latestWeightKg: number | null }) {
  const router = useRouter();
  const [details, setDetails] = useState<ProfileFormInput>(() => initialDetails(profile, current, latestWeightKg));
  const [preview, setPreview] = useState<{ key: string; computed: ComputedTarget }>();
  const [macros, setMacros] = useState<MacroText>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  const detailsKey = JSON.stringify(details);
  const showPreview = preview && preview.key === detailsKey && macros;
  const weightUnit = details.units === "metric" ? "kg" : "lb";

  function update(changes: Partial<ProfileFormInput>) {
    setDetails((currentDetails) => ({ ...currentDetails, ...changes }));
    setMessage(undefined);
  }

  // Keeps the same height and weight when switching units. The pre-filled weight stays the
  // pre-filled weight, so switching units alone never creates a new weigh-in.
  function switchUnits(next: PreferredUnits) {
    if (next === details.units) return;
    const from = details.units;
    let weight = details.weight;
    if (latestWeightKg !== null && weight === weightField(latestWeightKg, from)) weight = weightField(latestWeightKg, next);
    else if (weight.trim() !== "" && Number.isFinite(Number(weight))) {
      const kg = from === "metric" ? Number(weight) : Number(weight) * lbToKg;
      weight = weightField(kg, next);
    }
    const cm = from === "metric"
      ? Number(details.height)
      : (Number(details.feet) * inPerFoot + (details.inches.trim() === "" ? 0 : Number(details.inches))) * inToCm;
    const hasHeight = from === "metric" ? details.height.trim() !== "" : details.feet.trim() !== "";
    const height = hasHeight && Number.isFinite(cm) && cm > 0 ? heightFields(cm, next) : { height: "", feet: "", inches: "" };
    update({ units: next, weight, ...height });
  }

  function recalculate() {
    setMessage(undefined);
    const computed = computeProfileTarget(details, latestWeightKg);
    if (!computed.ok) {
      setError(computed.error);
      setPreview(undefined);
      return;
    }
    setError(undefined);
    setPreview({ key: detailsKey, computed: computed.data });
    // Keep the saved macros when the calorie target did not change, so earlier edits are not lost.
    const start = current && current.kcal === computed.data.target.target_kcal ? current.macros : computed.data.defaults;
    setMacros(toText(start));
  }

  const parsedMacros = macros ? fromText(macros) : null;
  const targetKcal = preview?.computed.target.target_kcal ?? 0;
  const macroCheck = parsedMacros ? validateMacroEdit(parsedMacros, targetKcal) : null;
  const macroError = !macros ? undefined : !parsedMacros ? "Enter whole grams for each macro." : macroCheck && !macroCheck.ok ? macroCheck.error : undefined;
  const mismatch = parsedMacros && macroCheck?.ok ? checkMacroMismatch(parsedMacros, targetKcal) : null;

  async function save() {
    if (!showPreview || !parsedMacros || macroError || saving) return;
    setSaving(true);
    setError(undefined);
    const result = await saveProfileAndTargetAction({ details, macros: parsedMacros });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPreview(undefined);
    setMacros(undefined);
    // The saved target becomes the starting value for "Enter my own target".
    setDetails((currentDetails) => ({ ...currentDetails, targetKcal: String(targetKcal) }));
    setMessage(savedMessage);
    router.refresh();
  }

  return (
    <div className="mt-8 grid items-start gap-[30px] lg:grid-cols-2 lg:grid-rows-[auto_1fr]">
      <section className="card lg:col-start-1">
        <h2 className="text-xl font-medium">Current target</h2>
        {current ? (
          <>
            <p className="mt-3 text-3xl font-medium tracking-tight">{current.kcal.toLocaleString("en-US")} kcal</p>
            <p className="mt-1 text-sm text-muted">
              {current.source === "calculated" ? "Calculated from your details" : "Entered by you"} · saved{" "}
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(current.created_at))}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {macroFields.map(([name, label]) => (
                <div className="rounded-xl border border-line bg-page p-3" key={name}>
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="mt-1 text-lg font-bold">{current.macros[name]} g</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted">This is a starting estimate, not an exact number. Fiber is included in carbohydrates.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">No target saved yet.</p>
        )}
        {message && <p aria-live="polite" className="mt-3 text-sm font-semibold text-accent-text">{message}</p>}
      </section>

      <section className="card lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <h2 className="text-xl font-medium">Update your target</h2>
        <p className="mt-1 text-sm text-muted">Change your details, then recalculate. Nothing is saved until you press Save.</p>

        <div className="mt-5 grid gap-5">
          <fieldset>
            <legend className="text-sm font-semibold">How to set the target</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button aria-pressed={details.method === "calculated"} className={choiceClass(details.method === "calculated")} onClick={() => update({ method: "calculated" })} type="button">Calculate from my details</button>
              <button aria-pressed={details.method === "manual"} className={choiceClass(details.method === "manual")} onClick={() => update({ method: "manual" })} type="button">Enter my own target</button>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">Units</legend>
            <div className="mt-2 inline-flex rounded-xl border border-edge bg-field p-1">
              {(["metric", "imperial"] as const).map((option) => (
                <button
                  aria-pressed={details.units === option}
                  className={`rounded-md px-4 py-1.5 text-sm font-semibold ${details.units === option ? "bg-accent text-on-accent" : "text-muted hover:bg-line"}`}
                  key={option}
                  onClick={() => switchUnits(option)}
                  type="button"
                >
                  {option === "metric" ? "Metric (kg, cm)" : "Imperial (lb, ft, in)"}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              hint={latestWeightKg !== null ? "From your latest weigh-in. A new value is saved as a new weigh-in." : undefined}
              label={`Current weight (${weightUnit})`}
              onChange={(weight) => update({ weight })}
              value={details.weight}
            />
            {details.method === "manual" && <Field label="Calorie target (kcal)" onChange={(targetKcal) => update({ targetKcal })} value={details.targetKcal} />}
            {details.method === "calculated" && (
              <Field
                hint={profile.age_years !== null ? "The app never changes your age. Update it here." : undefined}
                label={profile.age_years !== null ? "Age last entered" : "Age"}
                onChange={(age) => update({ age })}
                value={details.age}
              />
            )}
          </div>

          {details.method === "calculated" && (
            <>
              {details.units === "metric" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Height (cm)" onChange={(height) => update({ height })} value={details.height} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Height (ft)" onChange={(feet) => update({ feet })} value={details.feet} />
                  <Field label="Height (in)" onChange={(inches) => update({ inches })} value={details.inches} />
                </div>
              )}

              <fieldset>
                <legend className="text-sm font-semibold">Sex (used in the calorie formula): Male / Female</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["male", "female"] as const).map((option) => (
                    <button aria-pressed={details.sex === option} className={`${choiceClass(details.sex === option)} capitalize`} key={option} onClick={() => update({ sex: option })} type="button">{option}</button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold">Activity level</legend>
                <div className="mt-2 grid gap-2">
                  {activityOptions.map((option) => (
                    <label className="flex cursor-pointer gap-3 rounded-xl border border-edge bg-field p-3" key={option.value}>
                      <input checked={details.activity === option.value} name="activity" onChange={() => update({ activity: option.value })} type="radio" value={option.value} />
                      <span><span className="block font-semibold">{option.title}</span><span className="block text-sm text-muted">{option.detail}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold">Goal</legend>
                <div className="mt-2 grid gap-2">
                  {goalOptions.map((option) => (
                    <button aria-pressed={details.goal === option.value} className={`${choiceClass(details.goal === option.value)} w-full`} key={option.value} onClick={() => update({ goal: option.value })} type="button">
                      <span className="block">{option.title}</span>
                      <span className="mt-1 block text-sm font-normal text-muted">{option.detail}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {details.goal !== "maintain" && (
                <fieldset>
                  <legend className="text-sm font-semibold">Pace</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["gradual", "steady"] as const).map((option) => (
                      <button aria-pressed={details.pace === option} className={`${choiceClass(details.pace === option)} capitalize`} key={option} onClick={() => update({ pace: option })} type="button">{option}</button>
                    ))}
                  </div>
                </fieldset>
              )}
            </>
          )}

          {error && <p aria-live="polite" className="rounded-lg bg-danger-bg p-3 text-sm text-danger">{error}</p>}
          {preview && preview.key !== detailsKey && <p className="text-sm text-muted">Your details changed. Recalculate to see the new target.</p>}
          <button className="btn-primary w-fit" onClick={recalculate} type="button">Recalculate</button>
        </div>
      </section>

      {showPreview && (
        <section aria-live="polite" className="card lg:col-start-1">
          <h2 className="text-xl font-medium">New target</h2>
          <p className="mt-3 text-3xl font-medium tracking-tight">{targetKcal.toLocaleString("en-US")} kcal</p>
          <p className="mt-1 text-sm text-muted">Not saved yet. This is a starting estimate, not an exact number.</p>
          {preview.computed.floor_explanation && <p className="mt-3 rounded-lg bg-warn-bg p-3 text-sm text-warn">{preview.computed.floor_explanation}</p>}
          {preview.computed.body_log && <p className="mt-3 text-sm text-muted">Your new weight will be saved as a weigh-in.</p>}

          <h3 className="mt-5 font-bold">Daily macros</h3>
          <p className="mt-1 text-sm text-muted">Edit grams if needed. Your calorie target stays at {targetKcal.toLocaleString("en-US")} kcal.</p>
          <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
            {macroFields.map(([name, label]) => (
              <Field key={name} label={`${label} (g)`} onChange={(value) => setMacros((text) => (text ? { ...text, [name]: value } : text))} value={macros[name]} />
            ))}
          </div>
          {macroError && <p className="mt-3 rounded-lg bg-danger-bg p-3 text-sm text-danger">{macroError}</p>}
          {mismatch?.ok && mismatch.data.warning && (
            <p className="mt-3 rounded-lg bg-warn-bg p-3 text-sm text-warn">Your macro calories differ from the target by more than 5%. This is a warning only; your calorie target has not changed.</p>
          )}
          <p className="mt-3 text-sm text-muted">Fiber is included in carbohydrates.</p>
          <button className="mt-4 btn-primary w-fit disabled:cursor-not-allowed disabled:opacity-60" disabled={saving || Boolean(macroError)} onClick={save} type="button">
            {saving ? "Saving…" : "Save new target"}
          </button>
        </section>
      )}
    </div>
  );
}
