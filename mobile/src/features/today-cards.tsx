import { router } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import { calculationConfig } from "@/lib/calc/config";
import { checkInReady, type CheckIn } from "@/lib/check-in";
import { formatKcal, formatWeeklyRate } from "@/lib/remaining-format";
import { setupComplete, setupSteps, type SetupFlags } from "@/lib/setup-steps";
import type { PreferredUnits } from "@/lib/weigh-in";
import { REVIEW_DAYS, type WeeklyReview } from "@/lib/weekly-review";
import { Icon } from "~/components/icon";
import { Alert, Button, Card, ProgressBar, Row, Stack, TextLink, Tile, Txt } from "~/components/ui";
import { clearDraft, storedDraft } from "~/lib/guest-draft-store";
import { refreshAll } from "~/lib/query";
import { toAppRoute } from "~/lib/routes";
import { saveGuestDraft } from "~/services/account";
import { useTheme } from "~/theme/theme";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

// Saves a finished guest target from this phone after sign-in, once (web: AccountDraftSave).
// It says nothing when there is nothing to save.
export function DraftSaver() {
  const sent = useRef(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "info" | "danger"; profileLink?: boolean }>();

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const draft = storedDraft();
    if (!draft) return;
    void saveGuestDraft(draft)
      .then(async (result) => {
        if (!result.ok) {
          setMessage({ text: result.error, tone: "danger" });
          return;
        }
        clearDraft();
        if (result.status === "saved") {
          setMessage({ text: "Your targets are saved to your account.", tone: "success" });
          await refreshAll();
        } else if (result.status === "saved_target_exists") {
          setMessage({ text: "Your account already had saved targets, so the numbers from this phone were not saved. To change your target, use", tone: "info", profileLink: true });
        }
      })
      .catch(() => setMessage({ text: "Your targets could not be saved right now. They are still on this phone, so pull down to refresh and try again.", tone: "danger" }));
  }, []);

  if (!message) return null;
  return (
    <Alert tone={message.tone === "info" ? "warn" : message.tone}>
      <Txt tone={message.tone === "danger" ? "danger" : message.tone === "info" ? "warn" : "ink"} variant="small">
        {message.text}
        {message.profileLink ? <> <TextLink onPress={() => router.push("/me")}>Profile and targets</TextLink>.</> : null}
      </Txt>
    </Alert>
  );
}

// Hiding is a per-phone convenience. The card also disappears for good once every step is done.
const hiddenKey = "rvfit-setup-hidden";
const hiddenListeners = new Set<() => void>();
function readHidden(): boolean {
  try {
    return globalThis.localStorage?.getItem(hiddenKey) === "1";
  } catch {
    return false;
  }
}
function hideSetup() {
  try {
    globalThis.localStorage?.setItem(hiddenKey, "1");
  } catch {}
  hiddenListeners.forEach((listener) => listener());
}
function subscribeHidden(listener: () => void) {
  hiddenListeners.add(listener);
  return () => {
    hiddenListeners.delete(listener);
  };
}

export function SetupCard({ flags }: { flags: SetupFlags }) {
  const { colors } = useTheme();
  const hidden = useSyncExternalStore(subscribeHidden, readHidden, readHidden);
  if (setupComplete(flags) || hidden) return null;
  const steps = setupSteps(flags);
  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  return (
    <Card>
      <Stack gap={12}>
        <Row style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <Txt variant="section">Get set up</Txt>
          <Txt tone="muted" variant="small">{doneCount} of {steps.length} done</Txt>
        </Row>
        <ProgressBar height={6} value={doneCount / steps.length} />
        {steps.map((step, index) => (
          <View
            key={step.key}
            style={{ borderRadius: 12, borderWidth: 1, borderColor: step === next ? colors.selectedEdge : colors.line, backgroundColor: step === next ? colors.selected : "transparent", padding: 12, gap: 6 }}
          >
            <Row gap={8}>
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: step.done ? colors.accent : "transparent", borderWidth: step.done ? 0 : 1, borderColor: colors.edge }}>
                {step.done ? <Icon color={colors.onAccent} name="check" size={12} strokeWidth={3} /> : <Txt tone="muted" variant="xs">{index + 1}</Txt>}
              </View>
              <Txt accessibilityRole="text" style={step.done ? { textDecorationLine: "line-through" } : undefined} tone={step.done ? "muted" : "ink"} variant="label">
                {step.title}
              </Txt>
            </Row>
            {!step.done ? (
              <>
                <Txt tone="muted" variant="small">{step.detail}</Txt>
                <Button onPress={() => router.push(toAppRoute(step.href))} size="sm" variant={step === next ? "primary" : "secondary"}>{step.action}</Button>
              </>
            ) : null}
          </View>
        ))}
        <TextLink onPress={hideSetup} tone="muted">Hide these steps</TextLink>
      </Stack>
    </Card>
  );
}

// The last 7 days in plain numbers. No streaks and no scores.
export function WeeklyReviewCard({ review, targetKcal, units, checkIn }: { review: WeeklyReview; targetKcal: number | null; units: PreferredUnits; checkIn: CheckIn | null }) {
  const { colors } = useTheme();
  const rate = review.weightChangeKg === null ? null : formatWeeklyRate(review.weightChangeKg, units);
  const tiles: { label: string; value: string; note: React.ReactNode }[] = [
    { label: "Days logged", value: `${review.daysLogged} of ${REVIEW_DAYS}`, note: "Days with a meal ticked as eaten" },
    {
      label: "Workouts",
      value: review.plannedWorkouts !== null ? `${review.workouts} of ${review.plannedWorkouts}` : String(review.workouts),
      note: review.plannedWorkouts !== null ? "Against your training days a week" : <TextLink onPress={() => router.push("/preferences")}>Set training days</TextLink>,
    },
    { label: "Average intake", value: review.averageKcal !== null ? formatKcal(review.averageKcal) : "—", note: targetKcal !== null ? `On logged days · target ${formatKcal(targetKcal)}` : "On logged days" },
    {
      label: "Weekly average weight",
      value: rate === null ? "—" : /^[+−]/.test(rate) ? rate : "No change",
      note: rate !== null ? "Change from the week before" : `Needs ${calculationConfig.progress.trend_min_weigh_ins} weigh-ins in each of the last two weeks`,
    },
  ];
  return (
    <Card>
      <Stack gap={12}>
        <Row gap={8}>
          <Icon color={colors.accentText} name="week" size={20} />
          <Txt variant="section">Last {REVIEW_DAYS} days</Txt>
        </Row>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {tiles.map((tile) => (
            <Tile key={tile.label} style={{ flexBasis: "46%", flexGrow: 1, gap: 2 }}>
              <Txt tone="muted" variant="small">{tile.label}</Txt>
              <Txt variant="h2">{tile.value}</Txt>
              {typeof tile.note === "string" ? <Txt tone="muted" variant="xs">{tile.note}</Txt> : tile.note}
            </Tile>
          ))}
        </View>
        {checkIn && checkIn.status !== "no_goal" ? (
          <Txt tone="muted" variant="small">
            Target check-in:{" "}
            {checkInReady(checkIn) ? (
              <Txt variant="small" weight="semibold">ready, see it below.</Txt>
            ) : checkIn.status === "not_enough_data" && checkIn.availableFrom ? (
              `not ready yet. The earliest is ${dateFormat.format(new Date(checkIn.availableFrom))}.`
            ) : (
              <>not ready yet. It needs more weigh-ins. <TextLink onPress={() => router.push("/progress")}>Log a weigh-in</TextLink></>
            )}
          </Txt>
        ) : null}
      </Stack>
    </Card>
  );
}
