import { router } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { calculationConfig } from "@/lib/calc/config";
import { checkInReady } from "@/lib/check-in";
import { loadDashboard } from "@/lib/dashboard-data";
import { greeting } from "@/lib/display-name";
import { formatKcal } from "@/lib/remaining-format";
import { goalPaceLabel } from "@/lib/target-options";
import { formatWeightKg } from "@/lib/weigh-in";
import { Icon, type IconName } from "~/components/icon";
import { ErrorView, LoadingView, Screen } from "~/components/screen";
import { Button, Card, Chip, Row, Stack, TextLink, Txt } from "~/components/ui";
import { BurnedTodayCard, OtherActivityCard, StepsSleepCard } from "~/features/activity-cards";
import { CheckInCard } from "~/features/check-in-card";
import { DayTotals } from "~/features/day-totals";
import { MealEatenToggle } from "~/features/meal-eaten-toggle";
import { DraftSaver, SetupCard, WeeklyReviewCard } from "~/features/today-cards";
import { useUser } from "~/lib/auth";
import { clockNow } from "~/lib/clock";
import { keys } from "~/lib/query";
import { sharedClient } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";
import { useTheme } from "~/theme/theme";

function CardTitle({ icon, children }: { icon: IconName; children: string }) {
  const { colors } = useTheme();
  return (
    <Row gap={8}>
      <Icon color={colors.accentText} name={icon} size={20} />
      <Txt variant="section">{children}</Txt>
    </Row>
  );
}

// Today (web: /dashboard). The same loader as the web page, run with the phone's date and clock.
export default function Today() {
  const user = useUser();
  const { today, now } = clockNow();
  const screen = useScreenData([...keys.dashboard, today], () => loadDashboard(sharedClient, today, now));
  // After a check-in is accepted, its card stays to show the confirmation while Today reloads.
  const [keepCheckIn, setKeepCheckIn] = useState(false);

  const header = (
    <Stack gap={4}>
      <Txt variant="title">Today</Txt>
      <Txt tone="muted" variant="small">{greeting(user.user_metadata)}</Txt>
    </Stack>
  );

  // Quick actions as a scrolling row of chips near the top, where a thumb reaches them.
  const quickActions = (
    <ScrollView contentContainerStyle={{ gap: 8 }} horizontal showsHorizontalScrollIndicator={false}>
      <Button icon="plus" onPress={() => router.push("/meal/new")} size="sm">New meal</Button>
      <Chip label="Log a workout" onPress={() => router.push("/train")} />
      <Chip label="Log a weigh-in" onPress={() => router.push("/progress")} />
      <Chip label="This week" onPress={() => router.push("/week")} />
    </ScrollView>
  );

  if (screen.loading) return <LoadingView label="Loading Today…" />;
  if (screen.error || !screen.data) {
    return screen.offline ? <ErrorView message="" offline onRetry={screen.retry} /> : (
      <Screen onRefresh={screen.refresh} refreshing={screen.refreshing} topInset>
        {header}
        <Card danger><Txt tone="danger">{screen.error ?? "Your dashboard could not be loaded. Please try again."}</Txt></Card>
        <Button onPress={screen.retry}>Try again</Button>
        {quickActions}
      </Screen>
    );
  }

  const { target, totals, planned_kcal, meals, workouts, trend, units, setup, nextUp, checkIn, review, activity } = screen.data;
  const goalLabel = target ? goalPaceLabel(target.goal, target.pace) : null;

  return (
    <Screen onRefresh={screen.refresh} refreshing={screen.refreshing} topInset>
      {header}
      <DraftSaver />
      {quickActions}
      <SetupCard flags={setup} />

      <Card>
        <Stack gap={14}>
          <Row style={{ justifyContent: "space-between" }} wrap>
            <CardTitle icon="calories">Eaten today</CardTitle>
            {goalLabel ? <Txt tone="muted" variant="small">Goal: <Txt variant="small" weight="semibold">{goalLabel}</Txt></Txt> : null}
          </Row>
          <DayTotals plannedKcal={planned_kcal} target={target} totals={totals} />
        </Stack>
      </Card>

      <Card>
        <Stack gap={12}>
          <CardTitle icon="meals">Meals</CardTitle>
          {meals.length === 0 ? (
            <Txt tone="muted" variant="small">No meals saved today. <TextLink onPress={() => router.push("/meal/new")}>Add a meal</TextLink></Txt>
          ) : (
            meals.map((meal) => (
              <Row key={meal.id} style={{ justifyContent: "space-between" }}>
                <Row gap={10} style={{ flex: 1 }}>
                  <MealEatenToggle eaten={meal.eaten} future={false} label={meal.label} mealId={meal.id} />
                  <Txt style={{ flex: 1 }} variant="small">
                    <Txt variant="small" weight="bold">{meal.label}</Txt>
                    <Txt tone="muted" variant="small"> · {formatKcal(meal.totals.kcal)}{meal.eaten ? "" : " · planned"}</Txt>
                  </Txt>
                </Row>
                <TextLink onPress={() => router.push(`/meal/${meal.id}`)}>Edit</TextLink>
              </Row>
            ))
          )}
        </Stack>
      </Card>

      <Card>
        <Stack gap={10}>
          <CardTitle icon="workouts">Workout</CardTitle>
          {workouts.length === 0 ? (
            nextUp?.status === "next" ? (
              <Stack gap={8}>
                <Txt tone="muted" variant="small">Next up · {nextUp.done} of {nextUp.planned} done this week</Txt>
                <Button onPress={() => router.push(`/workout/new?day=${nextUp.dayKey}`)} size="sm">{`Log ${nextUp.dayName}`}</Button>
              </Stack>
            ) : nextUp?.status === "done" ? (
              <Txt tone="muted" variant="small">All {nextUp.planned} planned workouts are done this week. Rest well. <TextLink onPress={() => router.push("/train")}>See your plan</TextLink></Txt>
            ) : setup.hasPreferences ? (
              <Txt tone="muted" variant="small">No workout logged today. <TextLink onPress={() => router.push("/train")}>Go to Train</TextLink></Txt>
            ) : (
              <Txt tone="muted" variant="small">Save your training preferences to get a workout plan. <TextLink onPress={() => router.push("/preferences")}>Set preferences</TextLink></Txt>
            )
          ) : (
            workouts.map((workout) => (
              <Row key={workout.id} style={{ justifyContent: "space-between" }}>
                <Txt variant="small">
                  <Txt variant="small" weight="bold">{workout.day_name}</Txt>
                  <Txt tone="muted" variant="small"> · {workout.set_count} {workout.set_count === 1 ? "set" : "sets"}</Txt>
                </Txt>
                <TextLink onPress={() => router.push(`/workout/${workout.id}`)}>Edit</TextLink>
              </Row>
            ))
          )}
        </Stack>
      </Card>

      <Card>
        <Stack gap={8}>
          <CardTitle icon="progress">Weight trend</CardTitle>
          {trend.status === "ok" ? (
            <>
              <Txt variant="metric">{formatWeightKg(trend.average_kg, units)}</Txt>
              <Txt tone="muted" variant="small">Average of {trend.count} weigh-ins in the last {calculationConfig.progress.trend_window_days} days.</Txt>
            </>
          ) : (
            <Txt tone="muted" variant="small">
              Needs {calculationConfig.progress.trend_min_weigh_ins} weigh-ins in {calculationConfig.progress.trend_window_days} days (you have {trend.count}).{" "}
              <TextLink onPress={() => router.push("/progress")}>Log a weigh-in</TextLink>
            </Txt>
          )}
        </Stack>
      </Card>

      <WeeklyReviewCard checkIn={checkIn} review={review} targetKcal={target?.kcal ?? null} units={units} />
      {/* Shown only when the check-in has a result; Me shows it while it waits for weigh-ins. */}
      {checkIn && (keepCheckIn || checkInReady(checkIn)) ? <CheckInCard checkIn={checkIn} onSaved={() => setKeepCheckIn(true)} units={units} /> : null}

      {/* For information only: burned calories never change the target or the "left" numbers above. */}
      <BurnedTodayCard burn={activity.burn} />
      <StepsSleepCard sleepMinutes={activity.sleep_minutes} steps={activity.steps} />
      <OtherActivityCard entries={activity.entries} />
    </Screen>
  );
}
