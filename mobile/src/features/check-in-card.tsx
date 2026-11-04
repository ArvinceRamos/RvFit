import { router } from "expo-router";
import { useState } from "react";
import { UNDERWEIGHT_LOSS_MESSAGE } from "@/lib/calc/calculate";
import { calculationConfig } from "@/lib/calc/config";
import type { CheckIn } from "@/lib/check-in";
import { formatKcal, formatWeeklyRate } from "@/lib/remaining-format";
import type { PreferredUnits } from "@/lib/weigh-in";
import { Alert, Button, Card, FormError, Stack, TextLink, Tile, Txt } from "~/components/ui";
import { useAction } from "~/lib/actions";
import { acceptCheckIn } from "~/services/profile";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

// Target check-in on Today, Progress and Me (web: src/components/check-in-card.tsx). It only suggests:
// a new target is saved only when the user presses "Use … kcal", keeping the goal, pace and macro split.
export function CheckInCard({ checkIn, units, onSaved }: { checkIn: CheckIn; units: PreferredUnits; onSaved?: () => void }) {
  const [savedKcal, setSavedKcal] = useState<number>();
  // The card is kept on screen before the reload, which would otherwise hide it (the new target has no check-in yet).
  const accept = useAction(acceptCheckIn, "Your target could not be saved. Please try again.", (result) => {
    if ("kcal" in result) {
      setSavedKcal(result.kcal);
      onSaved?.();
    }
  });
  if (checkIn.status === "no_goal" && savedKcal === undefined) return null;
  const { window_days, settle_days, min_weigh_in_days, min_span_days } = calculationConfig.check_in;

  async function use(kcal: number) {
    await accept.run(kcal);
  }

  const weighInLink = <TextLink onPress={() => router.push("/progress")}>Log a weigh-in</TextLink>;
  let body: React.ReactNode = null;
  if (savedKcal !== undefined) {
    body = (
      <Alert tone="success">
        {`New target saved: ${formatKcal(savedKcal)} a day. Your goal, pace and macro split stay the same. The next check-in starts from today, so give it about ${settle_days + min_span_days} days of weigh-ins.`}
      </Alert>
    );
  } else if (checkIn.status === "not_enough_data") {
    body = (
      <Txt tone="muted" variant="small">
        {`It needs weigh-ins on at least ${min_weigh_in_days} different days in the last ${window_days} days, spread over at least ${min_span_days} days. The first ${settle_days} days after a new target are skipped, because they are the noisiest. `}
        {checkIn.availableFrom
          ? `The earliest check-in is ${dateFormat.format(new Date(checkIn.availableFrom))}. `
          : `So far you have ${checkIn.weighInDays} ${checkIn.weighInDays === 1 ? "day" : "days"} with a weigh-in, over ${checkIn.spanDays} ${checkIn.spanDays === 1 ? "day" : "days"}. `}
        {weighInLink}
      </Txt>
    );
  } else if (checkIn.status !== "no_goal") {
    const trend = (
      <Txt tone="muted" variant="small">
        {`Over your last ${window_days} days, your weight trend is about `}
        <Txt variant="small" weight="semibold">{formatWeeklyRate(checkIn.observedKgPerWeek, units)}</Txt>
        {`. Your ${checkIn.expectedKgPerWeek === 0 ? "goal" : "pace"} aims for about `}
        <Txt variant="small" weight="semibold">{formatWeeklyRate(checkIn.expectedKgPerWeek, units)}</Txt>.
      </Txt>
    );
    if (checkIn.status === "on_track") {
      body = <>{trend}<Alert tone="success">That is close to your plan. No change needed. Keep going.</Alert></>;
    } else if (checkIn.status === "holding") {
      body = (
        <>
          {trend}
          <Alert tone="warn">Holding: not enough data to tell yet. Your weigh-ins move around more than the gap from your plan, so RvFit is not suggesting a change. Keep your target and keep weighing in; more weigh-ins make the trend clearer.</Alert>
        </>
      );
    } else if (checkIn.status === "underweight") {
      body = (
        <>
          {trend}
          <Alert tone="warn">{UNDERWEIGHT_LOSS_MESSAGE}</Alert>
          <Txt tone="muted" variant="xs"><TextLink onPress={() => router.push("/me")}>Change your goal in Profile</TextLink></Txt>
        </>
      );
    } else if (checkIn.status === "at_floor") {
      body = (
        <>
          {trend}
          <Alert tone="warn">{`Your target is already at the minimum of ${checkIn.floorKcal.toLocaleString("en-US")} kcal, so RvFit will not suggest eating less. A little more daily activity can help, or talk to a doctor or dietitian.`}</Alert>
        </>
      );
    } else {
      const sign = checkIn.changeKcal > 0 ? "+" : "−";
      const suggested = checkIn.suggestedKcal;
      body = (
        <>
          {trend}
          <Tile style={{ gap: 8, padding: 14 }}>
            <Txt weight="semibold">{`Suggestion: about ${formatKcal(suggested)} a day (about ${sign}${Math.round(Math.abs(checkIn.changeKcal) / 10) * 10} kcal)`}</Txt>
            <Txt tone="muted" variant="small">
              {checkIn.changeKcal < 0 ? "A little less food should move your trend toward your plan." : "A little more food should slow things to a steadier pace."} Daily weight swings with water and food, so give any change 2–3 weeks before judging it.
            </Txt>
            <Button loading={accept.pending} loadingText="Saving…" onPress={() => use(suggested)} size="sm">{`Use ${formatKcal(suggested)}`}</Button>
            <Txt tone="muted" variant="xs">Saves a new target. Your goal, pace and macro split stay the same.</Txt>
            <FormError message={accept.error} />
            <Txt tone="muted" variant="xs">
              Prefer another number? <TextLink onPress={() => router.push("/me")}>Change your target in Profile</TextLink>.
            </Txt>
          </Tile>
        </>
      );
    }
  }

  return (
    <Card>
      <Stack gap={10}>
        <Txt variant="section">Target check-in</Txt>
        <Txt tone="muted" variant="small">Every few weeks, RvFit compares your weight trend with the pace you chose and may suggest a small calorie change.</Txt>
        {body}
      </Stack>
    </Card>
  );
}
