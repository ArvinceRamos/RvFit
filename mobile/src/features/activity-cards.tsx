import { router } from "expo-router";
import { useEffect, useState } from "react";
import { burnedToday } from "@/lib/activity/burn";
import { sleepFields } from "@/lib/activity/inputs";
import type { TodayBurnBase } from "@/lib/activity/today";
import { calculationConfig } from "@/lib/calc/config";
import type { ActivityEntry } from "@/lib/dashboard-data";
import { formatKcal } from "@/lib/remaining-format";
import { Icon } from "~/components/icon";
import { Alert, Button, Card, Chip, NumberField, Row, Stack, TextLink, Tile, Txt } from "~/components/ui";
import { confirmAction, useAction } from "~/lib/actions";
import { clockNow } from "~/lib/clock";
import { addActivity, deleteActivity, saveSleep, saveSteps } from "~/services/activity";
import { useTheme } from "~/theme/theme";
import { View } from "react-native";

const SAVED = "Saved.";

function SectionTitle({ icon, children }: { icon: "calories" | "dashboard" | "workouts"; children: string }) {
  const { colors } = useTheme();
  return (
    <Row gap={8}>
      <Icon color={colors.accentText} name={icon} size={20} />
      <Txt variant="section">{children}</Txt>
    </Row>
  );
}

// Minutes since midnight on the phone's clock, read again once a minute.
function useMinutes(): number {
  const [minutes, setMinutes] = useState(() => clockNow().minutes);
  useEffect(() => {
    const timer = setInterval(() => setMinutes(clockNow().minutes), 60_000);
    return () => clearInterval(timer);
  }, []);
  return minutes;
}

// Rough calories burned today, for information only: they never change the target, the "left"
// numbers, the check-in or the meal planner (docs/ACTIVITY.md). Resting grows with the time of day.
export function BurnedTodayCard({ burn }: { burn: TodayBurnBase }) {
  const minutesSinceMidnight = useMinutes();
  const result = burnedToday({ ...burn, minutesSinceMidnight });
  const weighInLink = <TextLink onPress={() => router.push("/progress")}>Log a weigh-in</TextLink>;
  const restingMissing = burn.hasDetails ? weighInLink : <TextLink onPress={() => router.push("/me")}>Add your details in Profile</TextLink>;
  const parts = [
    { name: "Resting", value: result.resting, missing: restingMissing },
    { name: "Workouts", value: result.workouts, missing: weighInLink },
    { name: "Steps", value: result.steps, missing: weighInLink },
    { name: "Other activity", value: result.other, missing: weighInLink },
  ];
  return (
    <Card>
      <Stack gap={12}>
        <SectionTitle icon="calories">Burned today (estimate)</SectionTitle>
        {result.total !== null ? (
          <Txt>
            <Txt variant="metric">{Math.round(result.total).toLocaleString("en-US")}</Txt>
            <Txt tone="muted">  kcal</Txt>
          </Txt>
        ) : null}
        {result.endOfDay !== null ? <Txt tone="muted" variant="small">About {formatKcal(result.endOfDay)} by end of day</Txt> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {parts.map((part) => (
            <Tile key={part.name} style={{ flexBasis: "46%", flexGrow: 1, gap: 2 }}>
              <Txt tone="muted" variant="small">{part.name}</Txt>
              {part.value === null ? part.missing : <Txt style={{ fontVariant: ["tabular-nums"] }} variant="h2">{formatKcal(part.value)}</Txt>}
            </Tile>
          ))}
        </View>
        <Txt tone="muted" variant="small">Burned calories are rough estimates. They do not change your calorie target.</Txt>
      </Stack>
    </Card>
  );
}

function Message({ message }: { message?: string }) {
  if (!message) return null;
  return <Alert tone={message === SAVED ? "success" : "danger"}>{message}</Alert>;
}

// Steps today and Sleep last night, each saved on the phone's local date. Saving again replaces the value.
export function StepsSleepCard({ steps, sleepMinutes }: { steps: number | null; sleepMinutes: number | null }) {
  const [stepsValue, setSteps] = useState(steps === null ? "" : String(steps));
  const [sleep, setSleep] = useState(sleepFields(sleepMinutes));
  const [stepsMessage, setStepsMessage] = useState<string>();
  const [sleepMessage, setSleepMessage] = useState<string>();
  const stepsAction = useAction(saveSteps, "Your steps could not be saved. Please try again.");
  const sleepAction = useAction(saveSleep, "Your sleep could not be saved. Please try again.");

  async function submitSteps() {
    setStepsMessage(undefined);
    const result = await stepsAction.run(clockNow().today, stepsValue);
    setStepsMessage(result.ok ? SAVED : result.error);
  }
  async function submitSleep() {
    setSleepMessage(undefined);
    const result = await sleepAction.run(clockNow().today, sleep.hours, sleep.minutes);
    setSleepMessage(result.ok ? SAVED : result.error);
  }

  return (
    <Card>
      <Stack gap={14}>
        <SectionTitle icon="dashboard">Steps and sleep</SectionTitle>
        <Stack gap={10}>
          <NumberField decimal={false} label="Steps today" onChangeText={setSteps} onSubmitEditing={submitSteps} returnKeyType="done" value={stepsValue} />
          <Message message={stepsMessage} />
          <Button loading={stepsAction.pending} loadingText="Saving…" onPress={submitSteps} size="sm">Save</Button>
        </Stack>
        <Stack gap={10}>
          <Txt variant="label">Sleep last night</Txt>
          <Row align="flex-start">
            <NumberField decimal={false} label="Hours" onChangeText={(hours) => setSleep((current) => ({ ...current, hours }))} style={{ flex: 1 }} value={sleep.hours} />
            <NumberField decimal={false} label="Minutes" onChangeText={(minutes) => setSleep((current) => ({ ...current, minutes }))} style={{ flex: 1 }} value={sleep.minutes} />
          </Row>
          <Message message={sleepMessage} />
          <Button loading={sleepAction.pending} loadingText="Saving…" onPress={submitSleep} size="sm">Save</Button>
        </Stack>
      </Stack>
    </Card>
  );
}

const activities = calculationConfig.activity.other_activities;

function activityLabel(key: string): string {
  return activities.find((activity) => activity.key === key)?.label ?? key;
}

// Add an Other activity on today's local date, and list today's entries with Delete. No walking: steps count it.
export function OtherActivityCard({ entries }: { entries: ActivityEntry[] }) {
  const [key, setKey] = useState<string>(activities[0].key);
  const [minutes, setMinutes] = useState("");
  const [message, setMessage] = useState<string>();
  const add = useAction(addActivity, "Your activity could not be saved. Please try again.");
  const remove = useAction(deleteActivity, "The activity could not be deleted. Please try again.");

  async function submit() {
    setMessage(undefined);
    const result = await add.run(clockNow().today, key, minutes);
    if (result.ok) setMinutes("");
    setMessage(result.ok ? SAVED : result.error);
  }

  async function removeEntry(entry: ActivityEntry) {
    const label = activityLabel(entry.activity_key);
    if (!(await confirmAction({ title: `Delete ${label}?`, message: `${entry.minutes} min today.`, confirmLabel: "Yes, delete" }))) return;
    await remove.run(entry.id);
  }

  return (
    <Card>
      <Stack gap={14}>
        <SectionTitle icon="workouts">Other activity</SectionTitle>
        <Stack gap={8}>
          <Txt variant="label">Activity</Txt>
          <Row gap={8} wrap>
            {activities.map((activity) => (
              <Chip key={activity.key} label={activity.label} onPress={() => setKey(activity.key)} selected={key === activity.key} />
            ))}
          </Row>
        </Stack>
        <NumberField decimal={false} label="Minutes" onChangeText={setMinutes} onSubmitEditing={submit} returnKeyType="done" value={minutes} />
        <Message message={message} />
        <Button loading={add.pending} loadingText="Saving…" onPress={submit} size="sm">Add activity</Button>
        <Stack gap={8}>
          <Txt variant="label">Today</Txt>
          {entries.length === 0 ? (
            <Txt tone="muted" variant="small">No activity added today.</Txt>
          ) : (
            entries.map((entry) => (
              <Row key={entry.id} style={{ justifyContent: "space-between" }}>
                <Txt variant="small">
                  <Txt variant="small" weight="bold">{activityLabel(entry.activity_key)}</Txt>
                  <Txt tone="muted" variant="small"> · {entry.minutes} min</Txt>
                </Txt>
                <Button accessibilityLabel={`Delete ${activityLabel(entry.activity_key)}`} disabled={remove.pending} onPress={() => removeEntry(entry)} size="sm" variant="dangerOutline">Delete</Button>
              </Row>
            ))
          )}
          {remove.error ? <Alert tone="danger">{remove.error}</Alert> : null}
        </Stack>
      </Stack>
    </Card>
  );
}
