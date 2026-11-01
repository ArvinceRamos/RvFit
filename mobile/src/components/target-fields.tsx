import type { GoalInput, PaceInput } from "@/lib/calc/calculate";
import type { ActivityLevel, FormulaBranch } from "@/lib/calc/config";
import { activityOptions, goalOptions, paceOptions } from "@/lib/target-options";
import { UNDERWEIGHT_LOSS_MESSAGE } from "@/lib/calc/calculate";
import { Alert, Choice, Row, Segmented, Stack, Txt } from "./ui";

// Choice groups shared by the guest calculator and Profile and targets, as on the web.

export type Units = "metric" | "imperial";

export function UnitsPicker({ value, onChange }: { value: Units; onChange: (value: Units) => void }) {
  return (
    <Stack gap={6}>
      <Txt variant="label">Units</Txt>
      <Segmented label="Units" onChange={onChange} options={[{ value: "metric", label: "Metric" }, { value: "imperial", label: "Imperial" }]} value={value} />
    </Stack>
  );
}

export function SexPicker({ value, onChange }: { value: FormulaBranch | ""; onChange: (value: FormulaBranch) => void }) {
  return (
    <Stack gap={6}>
      <Txt variant="label">Sex (used in the calorie formula): Male / Female</Txt>
      <Row gap={10}>
        {(["male", "female"] as FormulaBranch[]).map((option) => (
          <Choice key={option} onPress={() => onChange(option)} selected={value === option} style={{ flex: 1 }} title={option === "male" ? "Male" : "Female"} />
        ))}
      </Row>
    </Stack>
  );
}

export function ActivityPicker({ value, onChange }: { value: ActivityLevel; onChange: (value: ActivityLevel) => void }) {
  return (
    <Stack gap={8}>
      <Txt variant="label">Activity level</Txt>
      {activityOptions.map((option) => (
        <Choice detail={option.detail} key={option.value} onPress={() => onChange(option.value)} selected={value === option.value} title={option.title} />
      ))}
    </Stack>
  );
}

export function GoalPicker({ value, onChange, noLoss }: { value: GoalInput; onChange: (value: GoalInput) => void; noLoss: boolean }) {
  return (
    <Stack gap={8}>
      <Txt variant="label">Goal</Txt>
      {goalOptions
        .filter((option) => !noLoss || option.value !== "lose")
        .map((option) => (
          <Choice detail={option.detail} key={option.value} onPress={() => onChange(option.value)} selected={value === option.value} title={option.title} />
        ))}
      {noLoss ? <Alert tone="warn">{UNDERWEIGHT_LOSS_MESSAGE}</Alert> : null}
    </Stack>
  );
}

export function PacePicker({ goal, value, onChange }: { goal: "lose" | "gain"; value: PaceInput; onChange: (value: PaceInput) => void }) {
  return (
    <Stack gap={8}>
      <Txt variant="label">How fast?</Txt>
      {paceOptions[goal].map((option) => (
        <Choice detail={option.detail} key={option.value} onPress={() => onChange(option.value)} selected={value === option.value} title={option.title} />
      ))}
    </Stack>
  );
}
