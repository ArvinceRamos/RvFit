import { router } from "expo-router";
import { View } from "react-native";
import { progressPercent } from "@/lib/remaining-format";
import { loadWeek } from "@/lib/week-data";
import { ErrorView, LoadingView, Screen } from "~/components/screen";
import { Card, ProgressBar, Row, Stack, TextLink, Txt } from "~/components/ui";
import { clockNow } from "~/lib/clock";
import { keys } from "~/lib/query";
import { sharedClient } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";
import { useTheme } from "~/theme/theme";

const weekdayFormat = new Intl.DateTimeFormat("en", { weekday: "long" });
const shortFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const kcal = (value: number) => Math.round(value).toLocaleString("en-US");

function dayParts(date: string): { weekday: string; short: string } {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day);
  return { weekday: weekdayFormat.format(value), short: shortFormat.format(value) };
}

// This week, Monday to Sunday (web: /week). Read-only: it shows what is saved and schedules nothing.
export default function Week() {
  const { colors } = useTheme();
  const { today } = clockNow();
  const screen = useScreenData([...keys.week, today], () => loadWeek(sharedClient, today));
  if (screen.loading) return <LoadingView label="Loading your week…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "Your week could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  const { target, days, plan } = screen.data;

  return (
    <Screen onRefresh={screen.refresh} refreshing={screen.refreshing}>
      <Txt tone="muted" variant="small">Monday to Sunday. This page only shows what you have saved. It does not schedule anything.</Txt>
      {days.map((day) => {
        const { weekday, short } = dayParts(day.date);
        const isToday = day.date === today;
        const over = target !== null && day.totals.kcal > target.kcal;
        return (
          <Card key={day.date} style={isToday ? { borderColor: colors.accent, borderWidth: 2 } : undefined}>
            <Stack gap={10}>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt variant="h2">{weekday} <Txt tone="muted" variant="small">{short}</Txt></Txt>
                {isToday ? (
                  <View style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Txt tone="onAccent" variant="xs" weight="bold">Today</Txt>
                  </View>
                ) : null}
              </Row>
              {day.meal_count === 0 ? (
                <Txt tone="muted" variant="small">No meals saved</Txt>
              ) : day.date > today ? (
                // Future days can only hold planned meals, which are not eaten yet.
                <Txt tone="muted" variant="small">{day.meal_count} planned · {kcal(day.planned_kcal)} kcal</Txt>
              ) : (
                <Stack gap={6}>
                  <Txt variant="small">
                    <Txt weight="bold">{kcal(day.totals.kcal)} kcal</Txt>
                    <Txt tone="muted" variant="small"> eaten{target ? ` of ${kcal(target.kcal)} kcal` : ""} · {day.eaten_count === day.meal_count ? `${day.meal_count} ${day.meal_count === 1 ? "meal" : "meals"}` : `${day.eaten_count} of ${day.meal_count} eaten`}</Txt>
                  </Txt>
                  {target ? <ProgressBar color={over ? colors.warn : colors.accent} value={progressPercent(day.totals.kcal, target.kcal) / 100} /> : null}
                </Stack>
              )}
              {day.workouts.length === 0 ? (
                <Txt tone="muted" variant="small">No workout logged</Txt>
              ) : (
                day.workouts.map((workout) => (
                  <Txt key={workout.id} variant="small">
                    <TextLink onPress={() => router.push(`/workout/${workout.id}`)}>{workout.day_name}</TextLink>
                    <Txt tone="muted" variant="small"> · {workout.set_count} {workout.set_count === 1 ? "set" : "sets"}</Txt>
                  </Txt>
                ))
              )}
            </Stack>
          </Card>
        );
      })}
      {!target ? <Txt tone="muted" variant="small">Add a saved calorie target to compare each day. <TextLink onPress={() => router.push("/start")}>Set up a target</TextLink></Txt> : null}
      <Card>
        <Stack gap={10}>
          <Txt variant="section">{"This week's plan"}</Txt>
          {plan === null ? (
            <Txt tone="muted" variant="small">Save your experience, equipment, and training days in Preferences to see your workout days here. <TextLink onPress={() => router.push("/preferences")}>Go to Preferences</TextLink></Txt>
          ) : (
            plan.days.map((day) => (
              <Row key={day.key} style={{ justifyContent: "space-between" }}>
                <Txt variant="small" weight="semibold">{day.name}</Txt>
                <Txt tone={day.count > 0 ? "accent" : "muted"} variant="small" weight={day.count > 0 ? "semibold" : "regular"}>
                  {day.count > 0 ? `Logged ${day.count} ${day.count === 1 ? "time" : "times"}` : "Not logged yet"}
                </Txt>
              </Row>
            ))
          )}
        </Stack>
      </Card>
    </Screen>
  );
}
