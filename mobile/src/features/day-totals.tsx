import { router } from "expo-router";
import { View } from "react-native";
import type { MealTotals } from "@/lib/meal";
import { remainingTargets } from "@/lib/suggestions";
import type { DailyTargets } from "@/lib/suggestions";
import { dayTypeLabel, type DayType } from "@/lib/calc/day-targets";
import { describeRemaining, formatGrams, progressPercent } from "@/lib/remaining-format";
import { ProgressBar, Row, Stack, TextLink, Tile, Txt } from "~/components/ui";
import { useTheme } from "~/theme/theme";

const number = (value: number) => (Math.round(value) || 0).toLocaleString("en-US");

// Eaten, target, and left for one day (web: DayTotals in src/components/today-summary.tsx).
// plannedKcal: meals saved for the day but not ticked as eaten yet. They are not in the totals.
export function DayTotals({ target, totals, plannedKcal = 0 }: { target: (DailyTargets & { day_type?: DayType | null }) | null; totals: MealTotals; plannedKcal?: number }) {
  const { colors } = useTheme();
  if (!target) {
    return (
      <Txt tone="muted" variant="small">
        Totals need a saved calorie target. <TextLink onPress={() => router.push("/start")}>Set up a target</TextLink>, then save it to your account.
      </Txt>
    );
  }
  const left = remainingTargets(target, totals);
  // Rounded like the text, so a colour never says "over" next to "Target reached".
  const caloriesOver = Math.round(left.kcal) < 0;
  // Fiber is null when any food that day has no fiber value, so a partial total is never shown.
  const tiles = [
    { name: "Protein", eaten: totals.protein_g as number | null, goal: target.protein_g, left: left.protein_g as number | null, primary: true },
    { name: "Carbs", eaten: totals.carbs_g as number | null, goal: target.carbs_g, left: left.carbs_g as number | null },
    { name: "Fat", eaten: totals.fat_g as number | null, goal: target.fat_g, left: left.fat_g as number | null },
    { name: "Fiber", eaten: totals.fiber_incomplete ? null : totals.fiber_g, goal: target.fiber_g, left: left.fiber_g },
  ];

  return (
    <Stack gap={14}>
      <Stack gap={6}>
        <Row style={{ justifyContent: "space-between", alignItems: "baseline" }} wrap>
          <Txt accessibilityRole="summary">
            <Txt variant="metric">{number(totals.kcal)}</Txt>
            <Txt tone="muted">  of {number(target.kcal)} kcal{target.day_type ? ` · ${dayTypeLabel[target.day_type]}` : ""}</Txt>
          </Txt>
          <Txt tone={caloriesOver ? "warn" : "ink"} weight="semibold">{describeRemaining(target.kcal - totals.kcal, "kcal")}</Txt>
        </Row>
        <ProgressBar color={caloriesOver ? colors.warn : colors.accent} label="Calories eaten" value={progressPercent(totals.kcal, target.kcal) / 100} />
        {plannedKcal > 0 ? <Txt tone="muted" variant="small">+{number(plannedKcal)} kcal planned, not ticked as eaten yet.</Txt> : null}
      </Stack>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {tiles.map((tile) => {
          const over = tile.left !== null && Math.round(tile.left) < 0;
          return (
            <Tile key={tile.name} style={{ flexBasis: "46%", flexGrow: 1, gap: 4 }}>
              <Txt tone="muted" variant="small">{tile.name}</Txt>
              <Txt style={{ fontSize: tile.eaten === null ? 16 : tile.primary ? 22 : 18, fontVariant: ["tabular-nums"] }} weight="bold">
                {tile.eaten === null ? "Incomplete" : formatGrams(tile.eaten)}
              </Txt>
              <Txt tone="muted" variant="small">of {formatGrams(tile.goal)}</Txt>
              {tile.eaten !== null ? (
                <>
                  <ProgressBar color={over ? colors.warn : colors.accent} height={6} value={progressPercent(tile.eaten, tile.goal) / 100} />
                  <Txt tone={over ? "warn" : "ink"} variant="small" weight="semibold">{describeRemaining(tile.goal - tile.eaten, "g")}</Txt>
                </>
              ) : null}
            </Tile>
          );
        })}
      </View>
      {totals.fiber_incomplete ? <Txt tone="muted" variant="small">Some foods have no fiber listed, so fiber is not totalled.</Txt> : null}
    </Stack>
  );
}
