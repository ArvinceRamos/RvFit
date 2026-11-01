import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Stop, Text as SvgText } from "react-native-svg";
import type { ActivityBlock } from "@/lib/activity/progress";
import { calculationConfig } from "@/lib/calc/config";
import type { WeighInRow } from "@/lib/overview-data";
import type { KcalDay, WeekCount } from "@/lib/progress";
import type { ChartPoint } from "@/lib/progress-data";
import { formatKcal } from "@/lib/remaining-format";
import { chartLayout, chartRanges, DEFAULT_CHART_RANGE, filterByRange, weightChange, type ChartRangeKey } from "@/lib/weight-chart";
import { formatLengthCm, formatWeightKg, type PreferredUnits, type WeighInFields } from "@/lib/weigh-in";
import { formatCalendarDate } from "@/lib/workouts/format";
import { Alert, Button, Card, NumberField, Row, Segmented, Stack, TextLink, Txt } from "~/components/ui";
import { confirmAction, useAction } from "~/lib/actions";
import { fonts } from "~/theme/tokens";
import { saveWeighIn } from "~/services/account";
import { deleteWeighIn, fetchWeightChart } from "~/services/profile";
import { useTheme } from "~/theme/theme";

// Pieces of the Progress screen (web: src/components/progress-view.tsx and weigh-in-form.tsx).

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const shortDateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat("en", { weekday: "short" });

function inUnits(weightKg: number, units: PreferredUnits): number {
  return units === "metric" ? weightKg : weightKg / calculationConfig.unit_conversions.pounds_to_kilograms;
}

function plainDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const emptyFields: WeighInFields = { weight: "", waist: "", chest: "", hips: "" };

export function WeighInForm({ preferredUnits }: { preferredUnits: PreferredUnits }) {
  const [fields, setFields] = useState<WeighInFields>(emptyFields);
  const [message, setMessage] = useState<string>();
  const save = useAction(saveWeighIn, "Your weigh-in could not be saved. Please try again.");
  const weightUnit = preferredUnits === "metric" ? "kg" : "lb";
  const lengthUnit = preferredUnits === "metric" ? "cm" : "in";
  const update = (name: keyof WeighInFields) => (value: string) => setFields((current) => ({ ...current, [name]: value }));

  async function submit() {
    setMessage(undefined);
    const result = await save.run(fields, preferredUnits);
    if (!result.ok) return setMessage(result.error);
    setFields(emptyFields);
    setMessage("Weigh-in saved.");
  }

  return (
    <Card>
      <Stack gap={12}>
        <Txt variant="section">Add a weigh-in</Txt>
        <NumberField label={`Weight (${weightUnit})`} onChangeText={update("weight")} value={fields.weight} />
        <Row align="flex-start" gap={10}>
          <NumberField label={`Waist (${lengthUnit})`} onChangeText={update("waist")} style={{ flex: 1 }} value={fields.waist} />
          <NumberField label={`Chest (${lengthUnit})`} onChangeText={update("chest")} style={{ flex: 1 }} value={fields.chest} />
          <NumberField label={`Hips (${lengthUnit})`} onChangeText={update("hips")} style={{ flex: 1 }} value={fields.hips} />
        </Row>
        {message ? <Alert tone={message === "Weigh-in saved." ? "success" : "danger"}>{message}</Alert> : null}
        <Button loading={save.pending} loadingText="Saving…" onPress={submit}>Save weigh-in</Button>
      </Stack>
    </Card>
  );
}

const changeDays = 30;

// The Fit Green tile. Black text on Fit Green only. The chip compares weekly averages in plain numbers.
export function LatestWeightTile({ history, units, now }: { history: WeighInRow[]; units: PreferredUnits; now: number }) {
  const { colors } = useTheme();
  const latest = history.find((row) => row.weight_kg !== null);
  const points = history.filter((row) => row.weight_kg !== null).map((row) => ({ time: new Date(row.logged_at).getTime(), value: inUnits(row.weight_kg as number, units) }));
  const change = weightChange(points, changeDays, now);
  const unit = units === "metric" ? "kg" : "lb";
  const chip = change === null ? null : Math.abs(change) < 0.05 ? `No change in ${changeDays} days (weekly avg)` : `${change < 0 ? "−" : "+"}${Math.abs(change).toFixed(1)} ${unit} in ${changeDays} days (weekly avg)`;
  return (
    <View style={{ borderRadius: 22, backgroundColor: colors.accent, padding: 16, gap: 4 }}>
      <Txt tone="onAccent" variant="small" weight="medium">Latest weight</Txt>
      <Txt tone="onAccent" variant="metric">{latest ? formatWeightKg(latest.weight_kg as number, units) : "—"}</Txt>
      <Row gap={8} wrap>
        <Txt tone="onAccent" variant="small">{latest ? dateFormat.format(new Date(latest.logged_at)) : "No weigh-ins yet"}</Txt>
        {chip ? (
          <View style={{ borderRadius: 999, backgroundColor: colors.onAccent, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Txt style={{ color: colors.accent }} variant="xs" weight="semibold">{chip}</Txt>
          </View>
        ) : null}
      </Row>
    </View>
  );
}

const chartError = "Your weight chart could not be loaded. Please try again.";
const chartWidth = 640;
const chartHeight = 300;
const chartBox = { width: chartWidth, height: chartHeight, left: 70, right: 24, top: 30, bottom: 50 };

// Recorded weigh-ins only: no smoothing, no goal line. Each range loads its own weigh-ins.
export function WeightChartCard({ hasWeighIns, initialPoints, units, now }: { hasWeighIns: boolean; initialPoints: ChartPoint[] | null; units: PreferredUnits; now: number }) {
  const { colors } = useTheme();
  const [range, setRange] = useState<ChartRangeKey>(DEFAULT_CHART_RANGE);
  const other = useQuery({ queryKey: ["progress", "chart", range], queryFn: () => fetchWeightChart(range), enabled: range !== DEFAULT_CHART_RANGE });
  const result = range === DEFAULT_CHART_RANGE
    ? initialPoints ? { ok: true as const, points: initialPoints } : { ok: false as const, error: chartError }
    : other.data ?? (other.isError ? { ok: false as const, error: chartError } : undefined);
  const loading = result === undefined;
  // Weigh-ins arrive newest first. The chart runs oldest to newest.
  const recorded = (result?.ok ? result.points : []).map((row) => ({ time: new Date(row.logged_at).getTime(), value: inUnits(row.weight_kg, units) })).sort((a, b) => a.time - b.time);
  const days = chartRanges.find((option) => option.key === range)?.days ?? null;
  const shown = filterByRange(recorded, days, now);
  // One point makes no line, so it is laid out as two identical points and drawn as a single dot.
  const layout = shown.length === 0 ? null : chartLayout(shown.length === 1 ? [shown[0], shown[0]] : shown, chartBox);
  const unit = units === "metric" ? "kg" : "lb";
  const baseline = chartHeight - chartBox.bottom;
  const plotRight = chartWidth - chartBox.right;
  const grid = (
    <>
      <Line stroke={colors.line} strokeWidth={1} x1={chartBox.left} x2={plotRight} y1={chartBox.top} y2={chartBox.top} />
      <Line stroke={colors.line} strokeWidth={1} x1={chartBox.left} x2={plotRight} y1={(chartBox.top + baseline) / 2} y2={(chartBox.top + baseline) / 2} />
      <Line stroke={colors.edge} strokeWidth={1} x1={chartBox.left} x2={plotRight} y1={baseline} y2={baseline} />
    </>
  );

  let body: React.ReactNode;
  if (result && !result.ok) {
    body = <Alert tone="danger">{result.error}</Alert>;
  } else if (!layout) {
    body = (
      <View>
        <Svg accessibilityElementsHidden height={undefined} importantForAccessibility="no-hide-descendants" style={{ width: "100%", aspectRatio: chartWidth / chartHeight, opacity: 0.4 }} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {grid}
          <Polyline fill="none" points="70,200 160,170 250,185 340,130 430,150 520,90 610,70" stroke={colors.muted} strokeDasharray="6 8" strokeLinecap="round" strokeWidth={3} />
        </Svg>
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <Txt center tone="muted" variant="small">{loading ? "Loading your chart…" : hasWeighIns ? "No weigh-ins in this range. Try a longer one." : "Add your first weigh-in to start your chart."}</Txt>
        </View>
      </View>
    );
  } else {
    const first = new Date(shown[0].time);
    const last = new Date(shown[shown.length - 1].time);
    const points = shown.length === 1 ? [layout.points[0]] : layout.points;
    const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const area = points.length > 1 ? `M${points[0].x.toFixed(1)},${baseline} ${points.map((point) => `L${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")} L${points[points.length - 1].x.toFixed(1)},${baseline} Z` : null;
    const latest = points[points.length - 1];
    const summary = shown.length === 1 ? `Weight in ${unit}, one weigh-in on ${dateFormat.format(first)}.` : `Weight in ${unit}, ${shown.length} weigh-ins from ${dateFormat.format(first)} to ${dateFormat.format(last)}.`;
    const label = { fill: colors.muted, fontSize: 20, fontFamily: fonts.regular };
    body = (
      <View accessibilityLabel={summary} accessibilityRole="image" accessible>
        <Svg style={{ width: "100%", aspectRatio: chartWidth / chartHeight }} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id="weightFill" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.45} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {grid}
          <SvgText {...label} textAnchor="end" x={chartBox.left - 10} y={chartBox.top + 7}>{String(layout.yMax)}</SvgText>
          <SvgText {...label} textAnchor="end" x={chartBox.left - 10} y={baseline + 7}>{String(layout.yMin)}</SvgText>
          <SvgText {...label} textAnchor="start" x={chartBox.left} y={chartHeight - 14}>{shortDateFormat.format(first)}</SvgText>
          {shown.length > 1 ? <SvgText {...label} textAnchor="end" x={plotRight} y={chartHeight - 14}>{shortDateFormat.format(last)}</SvgText> : null}
          {area ? <Path d={area} fill="url(#weightFill)" /> : null}
          {points.length > 1 ? <Polyline fill="none" points={line} stroke={colors.accentText} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} /> : null}
          {points.map((point, index) => <Circle cx={point.x} cy={point.y} fill={colors.accentText} key={index} r={index === points.length - 1 ? 7 : 4} />)}
          {/* The latest value, drawn twice: a card-coloured halo, then the text, so it stays readable over the line. */}
          <SvgText fill={colors.card} fontFamily={fonts.semibold} fontSize={20} stroke={colors.card} strokeLinejoin="round" strokeWidth={6} textAnchor={latest.x > chartWidth - 110 ? "end" : "middle"} x={latest.x} y={latest.y - 16}>
            {`${shown[shown.length - 1].value.toFixed(1)} ${unit}`}
          </SvgText>
          <SvgText fill={colors.ink} fontFamily={fonts.semibold} fontSize={20} textAnchor={latest.x > chartWidth - 110 ? "end" : "middle"} x={latest.x} y={latest.y - 16}>
            {`${shown[shown.length - 1].value.toFixed(1)} ${unit}`}
          </SvgText>
        </Svg>
      </View>
    );
  }

  return (
    <Card>
      <Stack gap={12}>
        <Txt variant="section">Weight chart</Txt>
        <Segmented label="Chart range" onChange={setRange} options={chartRanges.map((option) => ({ value: option.key, label: option.label }))} value={range} />
        {body}
      </Stack>
    </Card>
  );
}

export function WeighInHistory({ history, units }: { history: WeighInRow[]; units: PreferredUnits }) {
  const { colors } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const remove = useAction(deleteWeighIn, "The weigh-in could not be deleted. Please try again.");
  const shown = showAll ? history : history.slice(0, 5);

  async function removeRow(row: WeighInRow) {
    const when = dateFormat.format(new Date(row.logged_at));
    if (!(await confirmAction({ title: "Delete this weigh-in?", message: `${when} · ${row.weight_kg === null ? "No weight" : formatWeightKg(row.weight_kg, units)}`, confirmLabel: "Delete" }))) return;
    await remove.run(row.id);
  }

  return (
    <Card>
      <Stack gap={4}>
        <Txt variant="section">History</Txt>
        {history.length === 0 ? <Txt tone="muted" variant="small">No weigh-ins saved yet.</Txt> : null}
        {shown.map((row, index) => {
          const measurements = [
            row.waist_cm !== null && `Waist ${formatLengthCm(row.waist_cm, units)}`,
            row.chest_cm !== null && `Chest ${formatLengthCm(row.chest_cm, units)}`,
            row.hips_cm !== null && `Hips ${formatLengthCm(row.hips_cm, units)}`,
          ].filter(Boolean);
          return (
            <View key={row.id} style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.line, paddingVertical: 10, gap: 2 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt variant="small">{dateFormat.format(new Date(row.logged_at))}</Txt>
                <Txt variant="small" weight="semibold">{row.weight_kg === null ? "No weight" : formatWeightKg(row.weight_kg, units)}</Txt>
              </Row>
              {measurements.length > 0 ? <Txt tone="muted" variant="small">{measurements.join(" · ")}</Txt> : null}
              <TextLink onPress={() => removeRow(row)} tone="danger">Delete</TextLink>
            </View>
          );
        })}
        {history.length > 5 ? <Button onPress={() => setShowAll((value) => !value)} size="sm" variant="secondary">{showAll ? "Show fewer" : `Show all ${history.length}`}</Button> : null}
        {remove.error ? <Alert tone="danger">{remove.error}</Alert> : null}
      </Stack>
    </Card>
  );
}

// Eaten calories for the last 7 days. Plain numbers, no good or bad colours. Nothing ticked shows a dash.
export function KcalStrip({ days, targetKcal }: { days: KcalDay[]; targetKcal: number | null }) {
  const { colors } = useTheme();
  const most = Math.max(1, targetKcal ?? 0, ...days.map((day) => day.kcal));
  return (
    <Card>
      <Stack gap={14}>
        <Stack gap={2}>
          <Txt variant="section">Calories, last 7 days</Txt>
          <Txt tone="muted" variant="small">{targetKcal === null ? "Meals ticked as eaten" : <>Target <Txt variant="small" weight="semibold">{formatKcal(targetKcal)}</Txt> a day</>}</Txt>
        </Stack>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 150 }}>
          {days.map((day, index) => {
            const today = index === days.length - 1;
            return (
              <View accessibilityLabel={`${formatCalendarDate(day.date)}: ${day.logged ? formatKcal(day.kcal) : "nothing ticked as eaten"}`} accessible key={day.date} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4, height: "100%" }}>
                <Txt numberOfLines={1} style={{ fontSize: 10 }} tone={today ? "ink" : "muted"} variant="xs" weight={today ? "semibold" : "regular"}>{day.logged ? day.kcal.toLocaleString("en-US") : "—"}</Txt>
                <View style={{ width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: today ? colors.accent : colors.track, height: day.logged ? Math.max(4, (day.kcal / most) * 100) : 4 }} />
                <Txt tone="muted" variant="xs">{today ? "Today" : weekdayFormat.format(plainDate(day.date))}</Txt>
              </View>
            );
          })}
        </View>
      </Stack>
    </Card>
  );
}

// Steps or Sleep: the 7-day average (3 days minimum), then the last 7 dates, newest first.
export function ActivityListCard({ title, block, format }: { title: string; block: ActivityBlock; format: (value: number) => string }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Stack gap={6}>
        <Txt variant="section">{title}</Txt>
        <Txt tone="muted" variant="small">7-day average</Txt>
        {block.average.status === "ok" ? <Txt variant="metric">{format(block.average.value)}</Txt> : <Txt tone="muted">Not enough data yet.</Txt>}
        {block.days.map((day, index) => (
          <Row key={day.date} style={{ justifyContent: "space-between", borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.line, paddingVertical: 8 }}>
            <Txt variant="small">{formatCalendarDate(day.date)}</Txt>
            <Txt tone={day.value === null ? "muted" : "ink"} variant="small" weight={day.value === null ? "regular" : "semibold"}>{day.value === null ? "—" : format(day.value)}</Txt>
          </Row>
        ))}
      </Stack>
    </Card>
  );
}

export function WorkoutBars({ weeks }: { weeks: WeekCount[] }) {
  const { colors } = useTheme();
  const ordered = [...weeks].reverse();
  const most = Math.max(1, ...ordered.map((week) => week.count));
  return (
    <Card>
      <Stack gap={14}>
        <Txt variant="section">Workouts per week</Txt>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 160 }}>
          {ordered.map((week, index) => {
            const current = index === ordered.length - 1;
            return (
              <View accessibilityLabel={`Week of ${formatCalendarDate(week.week_start)}: ${week.count} ${week.count === 1 ? "workout" : "workouts"}${current ? " (this week)" : ""}`} accessible key={week.week_start} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4, height: "100%" }}>
                <Txt tone={current ? "ink" : "muted"} variant="small" weight={current ? "semibold" : "regular"}>{week.count}</Txt>
                <View style={{ width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: current ? colors.accent : colors.track, height: Math.max(4, (week.count / most) * 100) }} />
                <Txt numberOfLines={1} style={{ fontSize: 10 }} tone="muted" variant="xs">{shortDateFormat.format(plainDate(week.week_start))}</Txt>
              </View>
            );
          })}
        </View>
      </Stack>
    </Card>
  );
}

// This week's workouts against the training days saved in Preferences. The ring stops at full.
export function WorkoutsRingTile({ week, plannedDays }: { week: WeekCount; plannedDays: number | null }) {
  const { colors } = useTheme();
  const ring = 26;
  const circumference = 2 * Math.PI * ring;
  const share = plannedDays ? Math.min(week.count / plannedDays, 1) : 0;
  return (
    <Card compact>
      <Row gap={16}>
        {plannedDays ? (
          <View accessibilityLabel={`${week.count} of ${plannedDays} planned workouts this week`} accessibilityRole="image" accessible>
            <Svg height={64} style={{ transform: [{ rotate: "-90deg" }] }} viewBox="0 0 64 64" width={64}>
              <Circle cx={32} cy={32} fill="none" r={ring} stroke={colors.track} strokeWidth={7} />
              <Circle cx={32} cy={32} fill="none" r={ring} stroke={colors.accentText} strokeDasharray={`${circumference}`} strokeDashoffset={circumference * (1 - share)} strokeLinecap="round" strokeWidth={share === 0 ? 0 : 7} />
            </Svg>
          </View>
        ) : null}
        <Stack gap={2} style={{ flex: 1 }}>
          <Txt tone="muted" variant="small">Workouts this week</Txt>
          <Txt variant="metric">{week.count}{plannedDays ? <Txt tone="muted" variant="h2"> / {plannedDays}</Txt> : null}</Txt>
          {plannedDays ? <Txt tone="muted" variant="small">Week of {formatCalendarDate(week.week_start)}</Txt> : <TextLink onPress={() => router.push("/preferences")}>Set training days</TextLink>}
        </Stack>
      </Row>
    </Card>
  );
}
