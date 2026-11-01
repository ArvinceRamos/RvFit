import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  calculateDefaultMacros,
  calculateTarget,
  convertAndValidateInputs,
  lossBlocked,
  type GoalInput,
  type PaceInput,
} from "@/lib/calc/calculate";
import type { ActivityLevel, FormulaBranch } from "@/lib/calc/config";
import { Screen } from "~/components/screen";
import { ActivityPicker, GoalPicker, PacePicker, SexPicker, UnitsPicker, type Units } from "~/components/target-fields";
import { Button, FormError, NumberField, Row, Stack, Txt } from "~/components/ui";
import { getDraft, saveDraft, useGuestDraft } from "~/lib/guest-draft-store";

// The guest calculator (web: GuestFlow "calculate"). Answers are kept in the draft as they are typed,
// so leaving and coming back keeps them.
export default function Calculate() {
  const draft = useGuestDraft();
  const saved = draft.setup_inputs?.calculate;
  const [units, setUnits] = useState<Units>(saved?.units ?? draft.profile?.preferred_units ?? "metric");
  const [age, setAge] = useState(saved?.age ?? draft.profile?.age_years?.toString() ?? "");
  const [height, setHeight] = useState(saved?.height ?? draft.profile?.height_cm?.toString() ?? "");
  const [feet, setFeet] = useState(saved?.feet ?? "");
  const [inches, setInches] = useState(saved?.inches ?? "");
  const [weight, setWeight] = useState(saved?.weight ?? draft.profile?.weight_kg?.toString() ?? "");
  const [sex, setSex] = useState<FormulaBranch | "">(saved?.sex ?? draft.profile?.sex_formula_branch ?? "");
  const [activity, setActivity] = useState<ActivityLevel>(saved?.activity ?? draft.profile?.activity_level ?? "sedentary");
  const [chosenGoal, setGoal] = useState<GoalInput>(saved?.goal ?? "maintain");
  const [pace, setPace] = useState<PaceInput>(saved?.pace ?? "gradual");
  const [error, setError] = useState<string>();

  useEffect(() => {
    saveDraft((current) => ({
      ...current,
      setup_inputs: { ...current.setup_inputs, calculate: { age, height, feet, inches, weight, sex, activity, goal: chosenGoal, pace, units } },
    }));
  }, [activity, age, chosenGoal, feet, height, inches, pace, sex, units, weight]);

  const heightInput = units === "metric" ? { unit: "cm" as const, value: Number(height) } : { unit: "ft-in" as const, feet: Number(feet), inches: Number(inches) };
  const weightInput = units === "metric" ? { unit: "kg" as const, value: Number(weight) } : { unit: "lb" as const, value: Number(weight) };
  // Under the BMI guard, Lose weight is hidden and a saved "lose" choice falls back to Maintain.
  const noLoss = lossBlocked(heightInput, weightInput);
  const goal = noLoss && chosenGoal === "lose" ? "maintain" : chosenGoal;

  function submit() {
    if (!getDraft().adult_confirmed_at) {
      setError("Confirm that you are 18 or older before calculating a target.");
      return;
    }
    if (!sex) {
      setError("Choose Male or Female for the calorie formula.");
      return;
    }
    const numericAge = Number(age);
    const target = calculateTarget({ age_years: numericAge, height: heightInput, weight: weightInput, sex, activity_level: activity, goal, pace: goal === "maintain" ? undefined : pace });
    if (!target.ok) return setError(target.error);
    const validated = convertAndValidateInputs({ age_years: numericAge, height: heightInput, weight: weightInput });
    if (!validated.ok) return setError(validated.error);
    const macros = calculateDefaultMacros(target.data.target_kcal, validated.data.weight_kg, validated.data.height_cm);
    if (!macros.ok) return setError(macros.error);
    setError(undefined);
    saveDraft((current) => ({
      ...current,
      profile: { age_years: numericAge, height_cm: validated.data.height_cm, weight_kg: validated.data.weight_kg, sex_formula_branch: sex, activity_level: activity, preferred_units: units },
      initial_body_log: { weight_kg: validated.data.weight_kg },
      target: {
        source: "calculated",
        target_kcal: target.data.target_kcal,
        goal,
        pace: goal === "maintain" ? null : pace,
        formula_branch: target.data.formula_branch,
        floor_applied: target.data.floor_applied,
        floor_explanation: target.data.floor_explanation,
        maintenance_kcal: target.data.maintenance_kcal,
        config_version: target.data.config_version,
        macros: macros.data,
      },
    }));
    router.push("/results");
  }

  return (
    <Screen footer={<Stack gap={10}><FormError message={error} /><Button full onPress={submit}>See my estimate</Button></Stack>}>
      <Txt tone="muted">Use your current details for a starting estimate.</Txt>
      <NumberField decimal={false} label="Age" onChangeText={setAge} returnKeyType="done" value={age} />
      <UnitsPicker onChange={setUnits} value={units} />
      {units === "metric" ? (
        <NumberField label="Height (cm)" onChangeText={setHeight} value={height} />
      ) : (
        <Row align="flex-start">
          <NumberField decimal={false} label="Height (ft)" onChangeText={setFeet} style={{ flex: 1 }} value={feet} />
          <NumberField label="Height (in)" onChangeText={setInches} style={{ flex: 1 }} value={inches} />
        </Row>
      )}
      <NumberField label={`Current weight (${units === "metric" ? "kg" : "lb"})`} onChangeText={setWeight} value={weight} />
      <SexPicker onChange={setSex} value={sex} />
      <ActivityPicker onChange={setActivity} value={activity} />
      <GoalPicker noLoss={noLoss} onChange={setGoal} value={goal} />
      {goal !== "maintain" ? <PacePicker goal={goal} onChange={setPace} value={pace} /> : null}
    </Screen>
  );
}
