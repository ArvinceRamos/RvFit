import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { checkMacroMismatch, validateMacroEdit, type DefaultMacros } from "@/lib/calc/calculate";
import { calculationConfig, type ActivityLevel, type FormulaBranch } from "@/lib/calc/config";
import { computeProfileTarget, heightFields, profileLossBlocked, weightField, type ComputedTarget, type ProfileFormInput } from "@/lib/profile-save";
import { goalPaceLabel } from "@/lib/target-options";
import type { PreferredUnits } from "@/lib/weigh-in";
import { ActivityPicker, GoalPicker, PacePicker, SexPicker } from "~/components/target-fields";
import { Alert, Button, Card, Choice, NumberField, Row, Segmented, Stack, Tile, Txt } from "~/components/ui";
import { useAction } from "~/lib/actions";
import { saveProfileAndTarget } from "~/services/profile";

// Profile and targets (web: src/components/profile-form.tsx). Details are edited, the target is
// recalculated on the phone to preview it, and the save recalculates it again from the details.

export type SavedProfile = { age_years: number | null; sex: FormulaBranch | null; height_cm: number | null; activity: ActivityLevel | null; units: PreferredUnits };
export type CurrentTarget = {
  source: "calculated" | "manual";
  fromCheckIn: boolean;
  kcal: number;
  goal: "lose" | "maintain" | "gain" | null;
  pace: "gradual" | "steady" | null;
  macros: DefaultMacros;
  created_at: string;
};

type MacroText = Record<keyof DefaultMacros, string>;
const macroFields: [keyof DefaultMacros, string][] = [["protein_g", "Protein"], ["carbs_g", "Carbohydrates"], ["fat_g", "Fat"], ["fiber_g", "Fiber"]];
const savedMessage = "New target saved.";
const { pounds_to_kilograms: lbToKg, inches_to_centimeters: inToCm, inches_per_foot: inPerFoot } = calculationConfig.unit_conversions;
const savedAtFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

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

export function CurrentTargetCard({ current, message }: { current: CurrentTarget | null; message?: string }) {
  const goalLabel = current ? goalPaceLabel(current.goal, current.pace) : null;
  return (
    <Card>
      <Stack gap={10}>
        <Txt variant="section">Current target</Txt>
        {current ? (
          <>
            <Txt variant="metric">{current.kcal.toLocaleString("en-US")} kcal</Txt>
            <Txt tone="muted" variant="small">
              {current.fromCheckIn ? "Adjusted by a check-in" : current.source === "calculated" ? "Calculated from your details" : "Entered by you"} · saved {savedAtFormat.format(new Date(current.created_at))}
            </Txt>
            {goalLabel ? <Txt variant="small" weight="semibold">Goal: {goalLabel}</Txt> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {macroFields.map(([name, label]) => (
                <Tile key={name} style={{ flexBasis: "46%", flexGrow: 1 }}>
                  <Txt tone="muted" variant="small">{label}</Txt>
                  <Txt variant="h2">{current.macros[name]} g</Txt>
                </Tile>
              ))}
            </View>
            <Txt tone="muted" variant="small">This is a starting estimate, not an exact number. Fiber is included in carbohydrates.</Txt>
          </>
        ) : (
          <Txt tone="muted" variant="small">No target saved yet.</Txt>
        )}
        {message ? <Txt tone="accent" variant="small" weight="semibold">{message}</Txt> : null}
      </Stack>
    </Card>
  );
}

export function ProfileForm({ profile, current, latestWeightKg, scrollRef }: { profile: SavedProfile; current: CurrentTarget | null; latestWeightKg: number | null; scrollRef?: React.RefObject<ScrollView | null> }) {
  const [enteredDetails, setDetails] = useState<ProfileFormInput>(() => initialDetails(profile, current, latestWeightKg));
  // Under the BMI guard, Lose weight is hidden and a saved "lose" goal falls back to Maintain.
  const noLoss = enteredDetails.method === "calculated" && profileLossBlocked(enteredDetails);
  const details: ProfileFormInput = noLoss && enteredDetails.goal === "lose" ? { ...enteredDetails, goal: "maintain" } : enteredDetails;
  const [preview, setPreview] = useState<{ key: string; computed: ComputedTarget }>();
  const [macros, setMacros] = useState<MacroText>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const save = useAction(saveProfileAndTarget, "Your target could not be saved. Please try again.");
  const resultY = useRef(0);

  // A newly saved target (from this form or the check-in card) becomes the start for "Enter my own target".
  const savedAt = current?.created_at ?? null;
  const [seenSavedAt, setSeenSavedAt] = useState(savedAt);
  if (savedAt !== seenSavedAt) {
    setSeenSavedAt(savedAt);
    if (current) setDetails((currentDetails) => ({ ...currentDetails, targetKcal: String(current.kcal) }));
  }

  const detailsKey = JSON.stringify(details);
  const showPreview = preview && preview.key === detailsKey && macros;
  const weightUnit = details.units === "metric" ? "kg" : "lb";

  function update(changes: Partial<ProfileFormInput>) {
    setDetails((currentDetails) => ({ ...currentDetails, ...changes }));
    setMessage(undefined);
  }

  // Keeps the same height and weight when switching units. The pre-filled weight stays the pre-filled
  // weight, so switching units alone never creates a new weigh-in.
  function switchUnits(next: PreferredUnits) {
    if (next === details.units) return;
    const from = details.units;
    let weight = details.weight;
    if (latestWeightKg !== null && weight === weightField(latestWeightKg, from)) weight = weightField(latestWeightKg, next);
    else if (weight.trim() !== "" && Number.isFinite(Number(weight))) weight = weightField(from === "metric" ? Number(weight) : Number(weight) * lbToKg, next);
    const cm = from === "metric" ? Number(details.height) : (Number(details.feet) * inPerFoot + (details.inches.trim() === "" ? 0 : Number(details.inches))) * inToCm;
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
    // The result sits below the long form, so bring it into view.
    setTimeout(() => scrollRef?.current?.scrollTo({ y: resultY.current, animated: true }), 50);
  }

  const parsedMacros = macros ? fromText(macros) : null;
  const targetKcal = preview?.computed.target.target_kcal ?? 0;
  const macroCheck = parsedMacros ? validateMacroEdit(parsedMacros, targetKcal) : null;
  const macroError = !macros ? undefined : !parsedMacros ? "Enter whole grams for each macro." : macroCheck && !macroCheck.ok ? macroCheck.error : undefined;
  const mismatch = parsedMacros && macroCheck?.ok ? checkMacroMismatch(parsedMacros, targetKcal) : null;

  async function submit() {
    if (!showPreview || !parsedMacros || macroError || save.pending) return;
    const result = await save.run({ details, macros: parsedMacros });
    if (!result.ok) return;
    setPreview(undefined);
    setMacros(undefined);
    setMessage(savedMessage);
    scrollRef?.current?.scrollTo({ y: 0, animated: true });
  }

  return (
    <>
      <CurrentTargetCard current={current} message={message} />
      <Stack gap={4}>
        <Txt variant="section">Update your target</Txt>
        <Txt tone="muted" variant="small">Change your details, then recalculate. Nothing is saved until you press Save.</Txt>
      </Stack>
      <Card>
        <Stack gap={16}>
          <Stack gap={8}>
            <Txt variant="label">How to set the target</Txt>
            <Choice onPress={() => update({ method: "calculated" })} selected={details.method === "calculated"} title="Calculate from my details" />
            <Choice onPress={() => update({ method: "manual" })} selected={details.method === "manual"} title="Enter my own target" />
          </Stack>
          <Stack gap={6}>
            <Txt variant="label">Units</Txt>
            <Segmented label="Units" onChange={switchUnits} options={[{ value: "metric", label: "Metric (kg, cm)" }, { value: "imperial", label: "Imperial (lb, ft, in)" }]} value={details.units} />
          </Stack>
        </Stack>
      </Card>
      <Card>
        <Stack gap={14}>
          <Txt variant="label">Your details</Txt>
          <NumberField
            hint={latestWeightKg !== null ? "From your latest weigh-in. A new value is saved as a new weigh-in." : undefined}
            label={`Current weight (${weightUnit})`}
            onChangeText={(weight) => update({ weight })}
            value={details.weight}
          />
          {details.method === "manual" ? <NumberField decimal={false} label="Calorie target (kcal)" onChangeText={(value) => update({ targetKcal: value })} value={details.targetKcal} /> : null}
          {details.method === "calculated" ? (
            <>
              <NumberField
                decimal={false}
                hint={profile.age_years !== null ? "The app never changes your age. Update it here." : undefined}
                label={profile.age_years !== null ? "Age last entered" : "Age"}
                onChangeText={(age) => update({ age })}
                value={details.age}
              />
              {details.units === "metric" ? (
                <NumberField label="Height (cm)" onChangeText={(height) => update({ height })} value={details.height} />
              ) : (
                <Row align="flex-start">
                  <NumberField decimal={false} label="Height (ft)" onChangeText={(feet) => update({ feet })} style={{ flex: 1 }} value={details.feet} />
                  <NumberField label="Height (in)" onChangeText={(inches) => update({ inches })} style={{ flex: 1 }} value={details.inches} />
                </Row>
              )}
              <SexPicker onChange={(sex) => update({ sex })} value={details.sex} />
            </>
          ) : null}
        </Stack>
      </Card>
      {details.method === "calculated" ? (
        <>
          <Card><ActivityPicker onChange={(activity) => update({ activity })} value={(details.activity || "sedentary") as ActivityLevel} /></Card>
          <Card>
            <Stack gap={16}>
              <GoalPicker noLoss={noLoss} onChange={(goal) => update({ goal })} value={details.goal} />
              {details.goal === "lose" || details.goal === "gain" ? <PacePicker goal={details.goal} onChange={(pace) => update({ pace })} value={details.pace} /> : null}
            </Stack>
          </Card>
        </>
      ) : null}
      <Stack gap={10}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {preview && preview.key !== detailsKey ? <Txt tone="muted" variant="small">Your details changed. Recalculate to see the new target.</Txt> : null}
        <Button full onPress={recalculate}>Recalculate</Button>
      </Stack>

      {showPreview ? (
        <View onLayout={(event) => (resultY.current = event.nativeEvent.layout.y)}>
          <Card>
            <Stack gap={12}>
              <Txt variant="section">New target</Txt>
              <Txt variant="metric">{targetKcal.toLocaleString("en-US")} kcal</Txt>
              <Txt tone="muted" variant="small">Not saved yet. This is a starting estimate, not an exact number.</Txt>
              {preview.computed.floor_explanation ? <Alert tone="warn">{preview.computed.floor_explanation}</Alert> : null}
              {preview.computed.body_log ? <Txt tone="muted" variant="small">Your new weight will be saved as a weigh-in.</Txt> : null}
              <Txt weight="bold">Daily macros</Txt>
              <Txt tone="muted" variant="small">Edit grams if needed. Your calorie target stays at {targetKcal.toLocaleString("en-US")} kcal.</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {macroFields.map(([name, label]) => (
                  <NumberField decimal={false} key={name} label={`${label} (g)`} onChangeText={(value) => setMacros((text) => (text ? { ...text, [name]: value } : text))} style={{ flexBasis: "46%", flexGrow: 1 }} value={macros[name]} />
                ))}
              </View>
              {macroError ? <Alert tone="danger">{macroError}</Alert> : null}
              {mismatch?.ok && mismatch.data.warning ? <Alert tone="warn">Your macro calories differ from the target by more than 5%. This is a warning only; your calorie target has not changed.</Alert> : null}
              <Txt tone="muted" variant="small">Fiber is included in carbohydrates.</Txt>
              {save.error ? <Alert tone="danger">{save.error}</Alert> : null}
              <Button disabled={Boolean(macroError)} full loading={save.pending} loadingText="Saving…" onPress={submit}>Save new target</Button>
            </Stack>
          </Card>
        </View>
      ) : null}
    </>
  );
}
