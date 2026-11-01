import { router } from "expo-router";
import { useEffect, useState } from "react";
import { convertWeightToKg, createManualTarget } from "@/lib/calc/calculate";
import { Screen } from "~/components/screen";
import { UnitsPicker, type Units } from "~/components/target-fields";
import { Button, FormError, NumberField, Stack, Txt } from "~/components/ui";
import { getDraft, saveDraft, useGuestDraft } from "~/lib/guest-draft-store";

// Enter my own target (web: GuestFlow "manual"). Sex is not needed; the target is checked against the
// configured floor and database bounds, never recalculated.
export default function Manual() {
  const draft = useGuestDraft();
  const saved = draft.setup_inputs?.manual;
  const [units, setUnits] = useState<Units>(saved?.units ?? draft.profile?.preferred_units ?? "metric");
  const [targetKcal, setTargetKcal] = useState(saved?.target_kcal ?? "");
  const [weight, setWeight] = useState(saved?.weight ?? draft.profile?.weight_kg?.toString() ?? "");
  const [error, setError] = useState<string>();

  useEffect(() => {
    saveDraft((current) => ({ ...current, setup_inputs: { ...current.setup_inputs, manual: { target_kcal: targetKcal, weight, units } } }));
  }, [targetKcal, units, weight]);

  function submit() {
    if (!getDraft().adult_confirmed_at) {
      setError("Confirm that you are 18 or older before entering a target.");
      return;
    }
    const weightInput = units === "metric" ? { unit: "kg" as const, value: Number(weight) } : { unit: "lb" as const, value: Number(weight) };
    const target = createManualTarget({ target_kcal: Number(targetKcal), current_weight: weightInput });
    if (!target.ok) return setError(target.error);
    const metricWeight = convertWeightToKg(weightInput);
    if (!metricWeight.ok) return setError(metricWeight.error);
    setError(undefined);
    saveDraft((current) => ({
      ...current,
      profile: { ...current.profile, weight_kg: metricWeight.data, preferred_units: units },
      initial_body_log: { weight_kg: metricWeight.data },
      target: { source: "manual", target_kcal: target.data.target_kcal, goal: null, pace: null, formula_branch: null, floor_applied: false, floor_explanation: null, config_version: target.data.config_version, macros: target.data.macros },
    }));
    router.push("/results");
  }

  return (
    <Screen footer={<Stack gap={10}><FormError message={error} /><Button full onPress={submit}>See my target</Button></Stack>}>
      <Txt tone="muted">We will use your current weight to set starting macros. Sex is not needed for this path.</Txt>
      <NumberField decimal={false} label="Calorie target (kcal)" onChangeText={setTargetKcal} value={targetKcal} />
      <UnitsPicker onChange={setUnits} value={units} />
      <NumberField label={`Current weight (${units === "metric" ? "kg" : "lb"})`} onChangeText={setWeight} value={weight} />
    </Screen>
  );
}
