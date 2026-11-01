import { router } from "expo-router";
import { useState } from "react";
import { formatSleepMinutes } from "@/lib/activity/progress";
import { calculationConfig } from "@/lib/calc/config";
import { checkInReady } from "@/lib/check-in";
import { loadProgress } from "@/lib/progress-data";
import { goalPaceLabel } from "@/lib/target-options";
import { formatWeightKg } from "@/lib/weigh-in";
import { ErrorView, LoadingView, Screen } from "~/components/screen";
import { Stat, TextLink, Txt } from "~/components/ui";
import { CheckInCard } from "~/features/check-in-card";
import { ActivityListCard, KcalStrip, LatestWeightTile, WeighInForm, WeighInHistory, WeightChartCard, WorkoutBars, WorkoutsRingTile } from "~/features/progress-cards";
import { clockNow } from "~/lib/clock";
import { keys } from "~/lib/query";
import { sharedClient } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";

// Progress (web: /progress), in the web order: weigh in, latest weight and trend, chart and history,
// calories for the last 7 days, the target check-in, steps and sleep, then workouts per week.
export default function Progress() {
  const { today, now } = clockNow();
  const screen = useScreenData([...keys.progress, today], () => loadProgress(sharedClient, today, now));
  const [keepCheckIn, setKeepCheckIn] = useState(false);

  if (screen.loading) return <LoadingView label="Loading progress…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "Your progress could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  const { units, trend, history, weeks, plannedDays, goal, pace, checkIn, chart, kcalDays, targetKcal, activity } = screen.data;
  const goalLabel = goalPaceLabel(goal, pace);

  return (
    <Screen onRefresh={screen.refresh} refreshing={screen.refreshing} topInset>
      <Txt variant="title">Progress</Txt>
      {goalLabel ? (
        <Txt tone="muted" variant="small">
          Goal: <Txt variant="small" weight="semibold">{goalLabel}</Txt> · <TextLink onPress={() => router.push("/me")}>Target check-in</TextLink>
        </Txt>
      ) : null}
      <WeighInForm preferredUnits={units} />
      <LatestWeightTile history={history} now={now} units={units} />
      <Stat
        label="Weight trend"
        note={trend.status === "ok" ? `Average of ${trend.count} weigh-ins in the last ${calculationConfig.progress.trend_window_days} days` : "Not enough data yet"}
        value={<Txt variant="metric">{trend.status === "ok" ? formatWeightKg(trend.average_kg, units) : "—"}</Txt>}
      />
      <WeightChartCard hasWeighIns={history.some((row) => row.weight_kg !== null)} initialPoints={chart} now={now} units={units} />
      <WeighInHistory history={history} units={units} />
      <KcalStrip days={kcalDays} targetKcal={targetKcal} />
      {checkIn && (keepCheckIn || checkInReady(checkIn)) ? <CheckInCard checkIn={checkIn} onSaved={() => setKeepCheckIn(true)} units={units} /> : null}
      <ActivityListCard block={activity.steps} format={(value) => value.toLocaleString("en-US")} title="Steps" />
      <ActivityListCard block={activity.sleep} format={formatSleepMinutes} title="Sleep" />
      <WorkoutBars weeks={weeks} />
      <WorkoutsRingTile plannedDays={plannedDays} week={weeks[0]} />
    </Screen>
  );
}
