"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  calculateDefaultMacros,
  calculateTarget,
  checkMacroMismatch,
  convertAndValidateInputs,
  convertWeightToKg,
  createManualTarget,
  validateMacroEdit,
  type GoalInput,
  type MacroEdit,
  type PaceInput,
} from "@/lib/calc/calculate";
import { type ActivityLevel, type FormulaBranch } from "@/lib/calc/config";
import {
  GUEST_DRAFT_EVENT,
  readGuestDraft,
  updateGuestDraft,
  type GuestDraft,
} from "@/lib/guest-draft";
import { createClient } from "@/lib/supabase/client";
import { activityOptions, goalOptions, paceOptions } from "@/lib/target-options";
import { AuthFrame } from "./auth-frame";

type Screen = "start" | "calculate" | "manual" | "results";
type Units = "metric" | "imperial";

function getDraft(): GuestDraft {
  return readGuestDraft(window.localStorage);
}

function saveDraft(update: (draft: GuestDraft) => GuestDraft): GuestDraft {
  const draft = updateGuestDraft(window.localStorage, update);
  window.dispatchEvent(new Event(GUEST_DRAFT_EVENT));
  return draft;
}

function subscribeToGuestDraft(onStoreChange: () => void) {
  window.addEventListener(GUEST_DRAFT_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(GUEST_DRAFT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function useGuestDraft() {
  return useSyncExternalStore(
    subscribeToGuestDraft,
    getDraft,
    () => undefined,
  );
}

// The guest pages share the app frame: same header, theme toggle, and floating card as log-in.
function Frame({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-4 alert-danger" role="alert">{message}</p>;
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        className="field mt-2 w-full"
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function AdultGate() {
  const draft = useGuestDraft();
  const confirmed = Boolean(draft?.adult_confirmed_at);

  function setAdultConfirmed(value: boolean) {
    saveDraft((draft) => ({
      ...draft,
      adult_confirmed_at: value ? draft.adult_confirmed_at ?? new Date().toISOString() : undefined,
    }));
  }

  return (
    <Frame>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-text">Start setup</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose how to set your target</h1>
      <p className="mt-3 leading-7 text-muted">
        You can start with an estimate or enter a calorie target you already use.
      </p>
      <label className="choice mt-8 flex gap-3 p-4 text-sm font-semibold">
        <input
          checked={confirmed}
          className="mt-0.5 size-5 accent-accent"
          onChange={(event) => setAdultConfirmed(event.target.checked)}
          type="checkbox"
        />
        I am 18 or older
      </label>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          aria-disabled={!confirmed}
          className={`btn-primary ${confirmed ? "" : "pointer-events-none !bg-track !text-muted"}`}
          href="/calculate"
        >
          Calculate my estimate
        </Link>
        <Link
          aria-disabled={!confirmed}
          className={`btn-secondary ${confirmed ? "" : "pointer-events-none opacity-60"}`}
          href="/manual"
        >
          Enter my own target
        </Link>
      </div>
      {!confirmed && <p className="mt-3 text-sm text-muted">Confirm your age to continue.</p>}
    </Frame>
  );
}

function Calculator() {
  const draft = useGuestDraft();
  if (!draft) return <Frame><p className="text-muted">Loading your draft…</p></Frame>;
  return <CalculatorForm draft={draft} key={draft.guest_draft_id} />;
}

function CalculatorForm({ draft }: { draft: GuestDraft }) {
  const router = useRouter();
  const saved = draft.setup_inputs?.calculate;
  const [units, setUnits] = useState<Units>(saved?.units ?? draft.profile?.preferred_units ?? "metric");
  const [age, setAge] = useState(saved?.age ?? draft.profile?.age_years?.toString() ?? "");
  const [height, setHeight] = useState(saved?.height ?? draft.profile?.height_cm?.toString() ?? "");
  const [feet, setFeet] = useState(saved?.feet ?? "");
  const [inches, setInches] = useState(saved?.inches ?? "");
  const [weight, setWeight] = useState(saved?.weight ?? draft.profile?.weight_kg?.toString() ?? "");
  const [sex, setSex] = useState<FormulaBranch | "">(saved?.sex ?? draft.profile?.sex_formula_branch ?? "");
  const [activity, setActivity] = useState<ActivityLevel>(saved?.activity ?? draft.profile?.activity_level ?? "sedentary");
  const [goal, setGoal] = useState<GoalInput>(saved?.goal ?? "maintain");
  const [pace, setPace] = useState<PaceInput>(saved?.pace ?? "gradual");
  const [error, setError] = useState<string>();

  useEffect(() => {
    saveDraft((current) => ({
      ...current,
      setup_inputs: {
        ...current.setup_inputs,
        calculate: { age, height, feet, inches, weight, sex, activity, goal, pace, units },
      },
    }));
  }, [activity, age, feet, goal, height, inches, pace, sex, units, weight]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!getDraft().adult_confirmed_at) {
      setError("Confirm that you are 18 or older before calculating a target.");
      return;
    }
    if (!sex) {
      setError("Choose Male or Female for the calorie formula.");
      return;
    }

    const numericAge = Number(age);
    const heightInput = units === "metric"
      ? { unit: "cm" as const, value: Number(height) }
      : { unit: "ft-in" as const, feet: Number(feet), inches: Number(inches) };
    const weightInput = units === "metric"
      ? { unit: "kg" as const, value: Number(weight) }
      : { unit: "lb" as const, value: Number(weight) };
    const target = calculateTarget({
      age_years: numericAge,
      height: heightInput,
      weight: weightInput,
      sex,
      activity_level: activity,
      goal,
      pace: goal === "maintain" ? undefined : pace,
    });
    if (!target.ok) {
      setError(target.error);
      return;
    }
    const validated = convertAndValidateInputs({ age_years: numericAge, height: heightInput, weight: weightInput });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    const macros = calculateDefaultMacros(target.data.target_kcal, validated.data.weight_kg);
    if (!macros.ok) {
      setError(macros.error);
      return;
    }
    saveDraft((draft) => ({
      ...draft,
      profile: {
        age_years: numericAge,
        height_cm: validated.data.height_cm,
        weight_kg: validated.data.weight_kg,
        sex_formula_branch: sex,
        activity_level: activity,
        preferred_units: units,
      },
      initial_body_log: { weight_kg: validated.data.weight_kg },
      target: {
        source: "calculated",
        target_kcal: target.data.target_kcal,
        goal,
        pace: goal === "maintain" ? null : pace,
        formula_branch: target.data.formula_branch,
        floor_applied: target.data.floor_applied,
        floor_explanation: target.data.floor_explanation,
        config_version: target.data.config_version,
        macros: macros.data,
      },
    }));
    router.push("/results");
  }

  return (
    <Frame>
      <Link className="text-sm font-semibold text-muted underline" href="/start">← Back</Link>
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Calculate my estimate</h1>
      <p className="mt-2 text-muted">Use your current details for a starting estimate.</p>
      <form className="mt-8 space-y-6" onSubmit={submit}>
        <NumberField label="Age" onChange={setAge} value={age} />
        <fieldset>
          <legend className="text-sm font-semibold">Units</legend>
          <div className="segmented mt-2 flex text-sm">
            {(["metric", "imperial"] as Units[]).map((option) => (
              <button aria-pressed={units === option} className="flex-1 capitalize" key={option} onClick={() => setUnits(option)} type="button">{option}</button>
            ))}
          </div>
        </fieldset>
        {units === "metric" ? <NumberField label="Height (cm)" onChange={setHeight} value={height} /> : <div className="grid grid-cols-2 gap-3"><NumberField label="Height (ft)" onChange={setFeet} value={feet} /><NumberField label="Height (in)" onChange={setInches} value={inches} /></div>}
        <NumberField label={`Current weight (${units === "metric" ? "kg" : "lb"})`} onChange={setWeight} value={weight} step="0.1" />
        <fieldset>
          <legend className="text-sm font-semibold">Sex (used in the calorie formula): Male / Female</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["male", "female"] as FormulaBranch[]).map((option) => <button aria-pressed={sex === option} className="choice py-3 text-center font-semibold capitalize" key={option} onClick={() => setSex(option)} type="button">{option}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">Activity level</legend>
          <div className="mt-2 space-y-2">
            {activityOptions.map((option) => <label className="choice flex cursor-pointer gap-3" key={option.value}><input checked={activity === option.value} name="activity" onChange={() => setActivity(option.value)} type="radio" value={option.value} /><span><span className="block font-semibold">{option.title}</span><span className="block text-sm text-muted">{option.detail}</span></span></label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">Goal</legend>
          <div className="mt-2 space-y-2">
            {goalOptions.map((option) => <button aria-pressed={goal === option.value} className="choice w-full" key={option.value} onClick={() => setGoal(option.value)} type="button"><span className="block font-semibold">{option.title}</span><span className="mt-1 block text-sm text-muted">{option.detail}</span></button>)}
          </div>
        </fieldset>
        {goal !== "maintain" && <fieldset><legend className="text-sm font-semibold">How fast?</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{paceOptions[goal].map((option) => <button aria-pressed={pace === option.value} className="choice w-full" key={option.value} onClick={() => setPace(option.value)} type="button"><span className="block font-semibold">{option.title}</span><span className="mt-1 block text-sm text-muted">{option.detail}</span></button>)}</div></fieldset>}
        <ErrorMessage message={error} />
        <button className="btn-primary w-full" type="submit">See my estimate</button>
      </form>
    </Frame>
  );
}

function ManualTarget() {
  const draft = useGuestDraft();
  if (!draft) return <Frame><p className="text-muted">Loading your draft…</p></Frame>;
  return <ManualTargetForm draft={draft} key={draft.guest_draft_id} />;
}

function ManualTargetForm({ draft }: { draft: GuestDraft }) {
  const router = useRouter();
  const saved = draft.setup_inputs?.manual;
  const [units, setUnits] = useState<Units>(saved?.units ?? draft.profile?.preferred_units ?? "metric");
  const [targetKcal, setTargetKcal] = useState(saved?.target_kcal ?? "");
  const [weight, setWeight] = useState(saved?.weight ?? draft.profile?.weight_kg?.toString() ?? "");
  const [error, setError] = useState<string>();

  useEffect(() => {
    saveDraft((current) => ({
      ...current,
      setup_inputs: {
        ...current.setup_inputs,
        manual: { target_kcal: targetKcal, weight, units },
      },
    }));
  }, [targetKcal, units, weight]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!getDraft().adult_confirmed_at) {
      setError("Confirm that you are 18 or older before entering a target.");
      return;
    }
    const weightInput = units === "metric" ? { unit: "kg" as const, value: Number(weight) } : { unit: "lb" as const, value: Number(weight) };
    const target = createManualTarget({ target_kcal: Number(targetKcal), current_weight: weightInput });
    if (!target.ok) { setError(target.error); return; }
    const metricWeight = convertWeightToKg(weightInput);
    if (!metricWeight.ok) { setError(metricWeight.error); return; }
    saveDraft((draft) => ({
      ...draft,
      profile: { ...draft.profile, weight_kg: metricWeight.data, preferred_units: units },
      initial_body_log: { weight_kg: metricWeight.data },
      target: { source: "manual", target_kcal: target.data.target_kcal, goal: null, pace: null, formula_branch: null, floor_applied: false, floor_explanation: null, config_version: target.data.config_version, macros: target.data.macros },
    }));
    router.push("/results");
  }

  return <Frame><Link className="text-sm font-semibold text-muted underline" href="/start">← Back</Link><h1 className="mt-5 text-3xl font-bold tracking-tight">Enter my own target</h1><p className="mt-2 text-muted">We will use your current weight to set starting macros. Sex is not needed for this path.</p><form className="mt-8 space-y-6" onSubmit={submit}><NumberField label="Calorie target (kcal)" onChange={setTargetKcal} value={targetKcal} /><fieldset><legend className="text-sm font-semibold">Units</legend><div className="segmented mt-2 flex text-sm">{(["metric", "imperial"] as Units[]).map((option) => <button aria-pressed={units === option} className="flex-1 capitalize" key={option} onClick={() => setUnits(option)} type="button">{option}</button>)}</div></fieldset><NumberField label={`Current weight (${units === "metric" ? "kg" : "lb"})`} onChange={setWeight} step="0.1" value={weight} /><ErrorMessage message={error} /><button className="btn-primary w-full" type="submit">See my target</button></form></Frame>;
}

type AccountState = "checking" | "guest" | "no-target" | "has-target";

// Who is looking at the results, so the save action fits: a guest creates an account,
// a signed-in user without targets saves straight to the account, and a user who already
// has targets is pointed to Profile instead of being told to sign up.
function useAccountState(): AccountState {
  const [state, setState] = useState<AccountState>("checking");
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setState("guest");
        return;
      }
      const { data, error } = await supabase.from("calorie_targets").select("id").limit(1);
      // On a read error, offer the save; the dashboard checks again before saving anything.
      if (active) setState(!error && data && data.length > 0 ? "has-target" : "no-target");
    })();
    return () => {
      active = false;
    };
  }, []);
  return state;
}

const macroNotes: Record<keyof MacroEdit, string> = {
  protein_g: "Helps keep and build muscle.",
  carbs_g: "Main fuel for training and daily energy.",
  fat_g: "Needed for hormones and absorbing vitamins.",
  fiber_g: "Helps fullness and digestion. Counted inside carbs.",
};

function SaveTargets({ state }: { state: AccountState }) {
  if (state === "checking") return <div aria-hidden className="mt-8 h-32" />;
  if (state === "has-target") {
    return (
      <section className="tile mt-8 p-5">
        <h2 className="text-lg font-bold">You already have saved targets</h2>
        <p className="mt-2 text-sm text-muted">These new numbers are not saved. To change your target, recalculate it in Profile and targets.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/profile">Go to Profile and targets</Link>
          <Link className="btn-secondary" href="/dashboard">Back to Dashboard</Link>
        </div>
      </section>
    );
  }
  if (state === "no-target") {
    return (
      <section className="tile mt-8 p-5">
        <h2 className="text-lg font-bold">Save these targets</h2>
        <p className="mt-2 text-sm text-muted">They will be used for your meals, suggestions, and progress.</p>
        {/* The dashboard saves the draft from this browser and confirms it. */}
        <Link className="btn-primary mt-4 w-full text-center sm:w-auto" href="/dashboard">Save to my account</Link>
      </section>
    );
  }
  return (
    <section className="tile mt-8 p-5">
      <h2 className="text-lg font-bold">Keep these numbers</h2>
      <p className="mt-2 text-sm text-muted">
        A free account saves your targets and unlocks meal plans, beginner workouts, and progress tracking.
        Until then, they stay only in this browser.
      </p>
      <Link className="btn-primary mt-4 block w-full text-center sm:inline-block sm:w-auto" href="/signup">Save my targets (free account)</Link>
      <p className="mt-3 text-sm text-muted">Already have an account? <Link className="font-semibold text-ink underline" href="/login">Log in to save them</Link></p>
    </section>
  );
}

function Results() {
  const draft = useGuestDraft();
  const account = useAccountState();
  const [macros, setMacros] = useState<MacroEdit>();
  const [error, setError] = useState<string>();

  const displayedMacros = macros ?? draft?.target?.macros;

  function editMacro(name: keyof MacroEdit, value: string) {
    if (!draft?.target || !displayedMacros) return;
    const next = { ...displayedMacros, [name]: Number(value) };
    const validation = validateMacroEdit(next, draft.target.target_kcal);
    if (!validation.ok) { setError(validation.error); return; }
    setError(undefined);
    setMacros(validation.data);
    saveDraft((current) => current.target ? { ...current, target: { ...current.target, macros: validation.data } } : current);
  }

  if (!draft?.target || !displayedMacros) {
    return (
      <Frame>
        <h1 className="text-3xl font-bold">No target yet</h1>
        <p className="mt-3 text-muted">
          {account === "has-target" || account === "no-target"
            ? "Nothing is waiting to be saved here. If you already saved your targets, find them on your Dashboard."
            : "Start by choosing a target method."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/start">Start setup</Link>
          {(account === "has-target" || account === "no-target") && <Link className="btn-secondary" href="/dashboard">Go to Dashboard</Link>}
        </div>
      </Frame>
    );
  }
  const mismatch = checkMacroMismatch(displayedMacros, draft.target.target_kcal);
  return (
    <Frame>
      <Link className="text-sm font-semibold text-muted underline" href="/start">Start over</Link>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-accent-text">Your starting estimate</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{draft.target.target_kcal.toLocaleString()} kcal</h1>
      <p className="mt-3 leading-7 text-muted">This is a starting estimate, not an exact number. Compare it with your weight trend over time, then decide whether to edit your target.</p>
      {draft.target.floor_explanation && <p className="mt-4 alert-warn" role="note">{draft.target.floor_explanation}</p>}
      <section className="mt-8">
        <h2 className="text-xl font-bold">Daily macros</h2>
        <p className="mt-1 text-sm text-muted">These are suggested grams. Editing is optional. Your calorie target stays at {draft.target.target_kcal.toLocaleString()} kcal.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {([["protein_g", "Protein"], ["carbs_g", "Carbohydrates"], ["fat_g", "Fat"], ["fiber_g", "Fiber"]] as [keyof MacroEdit, string][]).map(([name, label]) => (
            <div key={name}>
              <NumberField label={`${label} (g)`} onChange={(value) => editMacro(name, value)} value={displayedMacros[name].toString()} />
              <p className="mt-1 text-xs text-muted">{macroNotes[name]}</p>
            </div>
          ))}
        </div>
        <ErrorMessage message={error} />
        {mismatch.ok && mismatch.data.warning && <p className="mt-4 alert-warn">Your macro calories differ from the target by more than 5%. This is a warning only; your calorie target has not changed.</p>}
      </section>
      <SaveTargets state={account} />
    </Frame>
  );
}

export function GuestFlow({ screen }: { screen: Screen }) {
  if (screen === "start") return <AdultGate />;
  if (screen === "calculate") return <Calculator />;
  if (screen === "manual") return <ManualTarget />;
  return <Results />;
}
