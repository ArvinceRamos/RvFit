import { useState, type ReactNode } from "react";
import { Animated, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import {
  barPercent,
  DEMO_MEAL,
  DEMO_OWN_TARGET,
  DEMO_PROFILE_EDIT,
  DEMO_RESULT,
  DEMO_SWAP_KEYS,
  DEMO_TARGETS,
  DEMO_TODAY,
  DEMO_WEIGHT_RANGES,
  DEMO_WORKOUT,
  DEMO_WORKOUT_WEEKS,
  demoMacroWarning,
  demoWeightWindow,
} from "@/lib/demo-data";
import { chartLayout } from "@/lib/weight-chart";
import { getExercise } from "@/lib/workouts/exercises";
import { restText, schemeText } from "@/lib/workouts/format";
import type { MovementPattern } from "@/lib/workouts/types";
import { Icon } from "~/components/icon";
import { Alert, Card } from "~/components/ui";
import { useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";
import { DrawIn, FillBar, useDrawProgress } from "./landing-scroll";

// The web landing page's App previews (src/components/app-preview.tsx and preview-interactive.tsx), with the same
// fake data from src/lib/demo-data.ts. Not real user data, and nothing is saved. Each one mirrors a real screen
// and has the same small interaction as on the web.

const number = (value: number) => value.toLocaleString("en-US");

// The card around every preview. Always labelled App preview.
function PreviewFrame({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{title}</Text>
        <View style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 2 }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted }}>App preview</Text>
        </View>
      </View>
      <View style={{ marginTop: 16 }}>{children}</View>
    </Card>
  );
}

function Label({ children, tone = "muted", size = 14, weight = "regular", style, accessibilityLiveRegion }: { children: ReactNode; tone?: "muted" | "ink" | "accent"; size?: number; weight?: "regular" | "semibold" | "bold" | "mono"; style?: object; accessibilityLiveRegion?: "polite" }) {
  const { colors } = useTheme();
  const color = tone === "muted" ? colors.muted : tone === "accent" ? colors.accentText : colors.ink;
  const family = weight === "mono" ? fonts.mono : weight === "bold" ? fonts.bold : weight === "semibold" ? fonts.semibold : fonts.regular;
  return <Text accessibilityLiveRegion={accessibilityLiveRegion} style={[{ fontFamily: family, fontSize: size, lineHeight: Math.round(size * 1.45), color }, style]}>{children}</Text>;
}

// The web's pill buttons (Estimate / My own target, 7 / 30 / 90 days).
function Pill({ label, on, onPress, flex }: { label: string; on: boolean; onPress: () => void; flex?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: flex ? 1 : undefined,
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: on ? colors.accent : pressed ? colors.line : "transparent",
      })}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: on ? colors.onAccent : colors.muted }}>{label}</Text>
    </Pressable>
  );
}

// A bordered row, the web's "rounded-xl border border-line".
function Bordered({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useTheme();
  return <View style={[{ borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 }, style]}>{children}</View>;
}

/** Hero panel: mirrors Today's summary (calories and macros so far). The bars fill in on load. */
export function HeroPanel({ at }: { at: number | undefined }) {
  const { colors } = useTheme();
  return (
    <PreviewFrame title="Today">
      <DrawIn at={at}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 30, letterSpacing: -0.6, color: colors.ink }}>
          {number(DEMO_TODAY.calories)}
          <Text style={{ fontFamily: fonts.regular, fontSize: 16, letterSpacing: 0, color: colors.muted }}> of {number(DEMO_TARGETS.calories)} calories</Text>
        </Text>
        <View style={{ marginTop: 8 }}>
          <FillBar color={colors.accent} height={10} percent={barPercent(DEMO_TODAY.calories, DEMO_TARGETS.calories)} track={colors.track} />
        </View>
        <View style={{ marginTop: 24, gap: 12 }}>
          {DEMO_TODAY.macros.map((macro, i) => (
            <View key={macro.label}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Label>{macro.label}</Label>
                <Label tone="ink" weight="semibold">{macro.grams} of {macro.target} g</Label>
              </View>
              <View style={{ marginTop: 6 }}>
                <FillBar color={macro.lead ? colors.accent : colors.muted} delay={0.08 * (i + 1)} percent={barPercent(macro.grams, macro.target)} track={colors.track} />
              </View>
            </View>
          ))}
        </View>
      </DrawIn>
    </PreviewFrame>
  );
}

// Stage 1: mirrors Results and the two ways in on Start setup. Targets only, no calorie maths.
function ResultPreview() {
  const { colors } = useTheme();
  const [own, setOwn] = useState(false);
  const result = own ? DEMO_OWN_TARGET : { heading: DEMO_RESULT.heading, calories: DEMO_TARGETS.calories, macros: DEMO_RESULT.macros };
  const dot = (label: string) => {
    if (label === "Fiber") return { borderWidth: 2, borderColor: colors.muted };
    return { backgroundColor: label === "Protein" ? colors.accent : label === "Carbs" ? colors.accentSoft : colors.muted };
  };
  return (
    <PreviewFrame title={result.heading}>
      <View accessibilityLabel="Target type" style={{ flexDirection: "row", gap: 4, borderRadius: 12, backgroundColor: colors.field, padding: 4 }}>
        <Pill flex label="Estimate" on={!own} onPress={() => setOwn(false)} />
        <Pill flex label="My own target" on={own} onPress={() => setOwn(true)} />
      </View>
      <Text style={{ marginTop: 20, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.accentText }}>
        {own ? "Your target" : "Your starting estimate"}
      </Text>
      <Text accessibilityLiveRegion="polite" style={{ marginTop: 4, fontFamily: fonts.bold, fontSize: 36, letterSpacing: -0.8, color: colors.ink }}>
        {number(result.calories)} <Text style={{ fontFamily: fonts.regular, fontSize: 16, letterSpacing: 0, color: colors.muted }}>kcal a day</Text>
      </Text>
      <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {result.macros.map((macro) => (
          <Bordered key={macro.label} style={{ flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[{ width: 10, height: 10, borderRadius: 5 }, dot(macro.label)]} />
              <Label>{macro.label}</Label>
            </View>
            <Label tone="ink" weight="mono">{macro.grams} g</Label>
          </Bordered>
        ))}
      </View>
    </PreviewFrame>
  );
}

// Stage 2: mirrors the meal builder and the planner's eaten tick. Unticking takes the meal off today's calories.
function MealPreview({ at }: { at: number | undefined }) {
  const { colors } = useTheme();
  const [eaten, setEaten] = useState(true);
  const today = eaten ? DEMO_MEAL.dayCalories : DEMO_MEAL.eatenBefore;
  return (
    <PreviewFrame title={DEMO_MEAL.label}>
      <View style={{ gap: 8 }}>
        {DEMO_MEAL.slots.map((slot) => (
          <Bordered key={slot.slot} style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <Label>{slot.slot}</Label>
            <Label style={{ flexShrink: 1, textAlign: "right" }} tone="ink" weight="semibold">{slot.food} · {slot.grams} g</Label>
          </Bordered>
        ))}
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: eaten }} onPress={() => setEaten(!eaten)} style={{ marginTop: 12 }}>
        <Bordered style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Label tone="ink">Ate {DEMO_MEAL.label} · {DEMO_MEAL.mealCalories} calories</Label>
          <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: eaten ? 0 : 2, borderColor: colors.edge, backgroundColor: eaten ? colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
            {eaten ? <Icon color={colors.onAccent} name="check" size={14} /> : null}
          </View>
        </Bordered>
      </Pressable>
      <View style={{ marginTop: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Label>Today</Label>
          <Label accessibilityLiveRegion="polite" tone="ink" weight="semibold">{number(today)} of {number(DEMO_TARGETS.calories)} calories</Label>
        </View>
        <View style={{ marginTop: 8 }}>
          <DrawIn at={at}>
            <FillBar color={colors.accent} height={10} percent={barPercent(today, DEMO_TARGETS.calories)} track={colors.track} />
          </DrawIn>
        </View>
      </View>
    </PreviewFrame>
  );
}

// Short tags for the movement pattern each exercise trains (the same as the web).
const PATTERN_TAGS: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  single_leg: "Single leg",
  horizontal_push: "Push",
  incline_push: "Incline",
  vertical_push: "Press",
  horizontal_pull: "Pull",
  vertical_pull: "Pull-down",
  side_delt: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
  calves: "Calves",
};

// Stage 3: mirrors one day card on Train. Names, cues and plan text come from the real workout code; Swap cycles
// the first exercise through other squats.
function WorkoutPreview() {
  const { colors } = useTheme();
  const [pick, setPick] = useState(0);
  const { exerciseKeys, scheme, holdScheme } = DEMO_WORKOUT;
  const keys = [DEMO_SWAP_KEYS[pick], ...exerciseKeys.slice(1)];
  const exercises = keys.map((key) => getExercise(key)).filter((exercise) => exercise !== undefined);
  const planFor = (exercise: { measure: string }) => (exercise.measure === "seconds" ? holdScheme : scheme);
  const totalSets = exercises.reduce((sum, exercise) => sum + planFor(exercise).sets, 0);
  const rests = exercises.map((exercise) => planFor(exercise).restSeconds);
  const stats = [
    { label: "Exercises", value: String(exercises.length) },
    { label: "Sets", value: String(totalSets) },
    { label: "Rest", value: `${Math.min(...rests)}–${Math.max(...rests)} s` },
  ];
  return (
    <PreviewFrame title={DEMO_WORKOUT.day}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {stats.map((stat) => (
          <View key={stat.label} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.tile, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Label size={12}>{stat.label}</Label>
            <Label size={16} tone="ink" weight="mono">{stat.value}</Label>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        {exercises.map((exercise, i) => {
          const plan = planFor(exercise);
          const unit = exercise.measure === "seconds" ? "sec" : "reps";
          const lastRow = i === exercises.length - 1;
          return (
            <View key={i} style={{ flexDirection: "row", gap: 12, paddingBottom: lastRow ? 0 : 16 }}>
              {!lastRow ? <View style={{ position: "absolute", top: 32, bottom: 4, left: 13, width: 1, backgroundColor: colors.line }} /> : null}
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.onAccent }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 }}>
                  <Label accessibilityLiveRegion={i === 0 ? "polite" : undefined} tone="ink" weight="semibold">{exercise.name}</Label>
                  <View style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 8 }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: colors.muted }}>{PATTERN_TAGS[exercise.pattern]}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <Text accessibilityLabel={schemeText(plan, exercise)} style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.ink }}>
                    {plan.sets} × {plan.reps.min}–{plan.reps.max}
                    <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}> {unit}</Text>
                  </Text>
                  <Label size={11}>{restText(plan)}</Label>
                </View>
                {exercise.cue ? <Label size={12}>{exercise.cue}</Label> : null}
                {i === 0 ? (
                  <Pressable
                    accessibilityLabel={`Swap ${exercise.name}`}
                    accessibilityRole="button"
                    onPress={() => setPick((pick + 1) % DEMO_SWAP_KEYS.length)}
                    style={({ pressed }) => ({
                      alignSelf: "flex-start",
                      marginTop: 4,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: "rgba(175,250,0,0.5)",
                      backgroundColor: pressed ? "rgba(175,250,0,0.2)" : "rgba(175,250,0,0.1)",
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                    })}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.accentText }}>↻ Swap</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
        <Label size={12}>Log each set&apos;s reps and weight on the next screen.</Label>
      </View>
    </PreviewFrame>
  );
}

// Reveals a chart from left to right as it draws in (the web draws its lines with a stroke animation).
function Reveal({ children, height }: { children: ReactNode; height: number }) {
  const progress = useDrawProgress();
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
      <Animated.View style={{ height, overflow: "hidden", width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }}>
        <View style={{ width, height }}>{children}</View>
      </Animated.View>
    </View>
  );
}

// Stage 4: mirrors the weight chart on Progress: weigh-ins, the 7-day average and the range buttons.
function WeightPreview({ at }: { at: number | undefined }) {
  const { colors } = useTheme();
  const [days, setDays] = useState<number>(30);
  const box = { width: 320, height: 150, left: 34, right: 8, top: 10, bottom: 10 };
  const { weights, averages, offset } = demoWeightWindow(days);
  const layout = chartLayout(
    [...weights.map((value, i) => ({ time: i, value })), ...averages.map((value, i) => ({ time: i + offset, value }))],
    box,
  );
  if (!layout) return null;
  const raw = layout.points.slice(0, weights.length);
  const avg = layout.points.slice(weights.length);
  const path = (points: { x: number; y: number }[]) => points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <PreviewFrame title="Weight (kg)">
      <View accessibilityLabel="Chart range" style={{ flexDirection: "row", gap: 4, marginBottom: 12 }}>
        {DEMO_WEIGHT_RANGES.map((option) => (
          <Pill key={option} label={`${option} days`} on={days === option} onPress={() => setDays(option)} />
        ))}
      </View>
      <DrawIn at={at}>
        <View accessibilityLabel={`Sample weight chart for the last ${days} days: daily weigh-ins and a 7-day average`} accessibilityRole="image" style={{ aspectRatio: box.width / box.height }}>
          <Svg height="100%" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute" }} viewBox={`0 0 ${box.width} ${box.height}`} width="100%">
            <SvgText fill={colors.muted} fontSize={10} textAnchor="end" x={box.left - 6} y={box.top + 4}>{String(layout.yMax)}</SvgText>
            <SvgText fill={colors.muted} fontSize={10} textAnchor="end" x={box.left - 6} y={box.height - box.bottom}>{String(layout.yMin)}</SvgText>
            <Line stroke={colors.line} x1={box.left} x2={box.width - box.right} y1={box.height - box.bottom} y2={box.height - box.bottom} />
          </Svg>
          <ChartLines avg={path(avg)} box={box} days={days} raw={raw} rawPath={path(raw)} />
        </View>
      </DrawIn>
      <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", columnGap: 20, rowGap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted }} />
          <Label size={12}>Weigh-ins</Label>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 16, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
          <Label size={12}>7-day average</Label>
        </View>
      </View>
    </PreviewFrame>
  );
}

// The two lines and the dots, revealed together as the chart draws in.
function ChartLines({ raw, rawPath, avg, box, days }: { raw: { x: number; y: number }[]; rawPath: string; avg: string; box: { width: number; height: number }; days: number }) {
  const { colors } = useTheme();
  const [height, setHeight] = useState(0);
  return (
    <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)} style={{ flex: 1 }}>
      {height > 0 ? (
        <Reveal height={height}>
          <Svg height="100%" preserveAspectRatio="xMidYMid meet" viewBox={`0 0 ${box.width} ${box.height}`} width="100%">
            <Path d={rawPath} fill="none" stroke={colors.muted} strokeWidth={days > 30 ? 1 : 1.5} />
            {raw.map((p, i) => <Circle cx={p.x} cy={p.y} fill={colors.muted} key={i} r={days > 30 ? 1.2 : 2} />)}
            <Path d={avg} fill="none" stroke={colors.accent} strokeLinecap="round" strokeWidth={3} />
          </Svg>
        </Reveal>
      ) : null}
    </View>
  );
}

// Stage 4: mirrors the workouts-per-week bars on Progress. The current week is green; bars grow one after another.
function WorkoutsPerWeekPreview({ at }: { at: number | undefined }) {
  const { colors } = useTheme();
  const { counts, planned } = DEMO_WORKOUT_WEEKS;
  const now = counts[counts.length - 1];
  const most = Math.max(1, ...counts);
  const plotHeight = 94;
  return (
    <PreviewFrame title="Workouts per week">
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 30, letterSpacing: -0.6, color: colors.ink }}>{now}</Text>
        <Label>/ {planned} planned this week</Label>
      </View>
      <DrawIn at={at}>
        <View accessibilityLabel={`Sample workouts per week for the last ${counts.length} weeks: ${counts.join(", ")}`} accessibilityRole="image" style={{ flexDirection: "row" }}>
          {counts.map((count, i) => {
            const current = i === counts.length - 1;
            const height = Math.max(4, (count / most) * plotHeight);
            return <WeekBar current={current} count={count} height={height} index={i} key={i} plotHeight={plotHeight} />;
          })}
        </View>
      </DrawIn>
    </PreviewFrame>
  );
}

function WeekBar({ count, height, current, index, plotHeight }: { count: number; height: number; current: boolean; index: number; plotHeight: number }) {
  const { colors } = useTheme();
  const progress = useDrawProgress();
  const start = Math.min(index * 0.08, 0.5);
  const grow = progress.interpolate({ inputRange: [0, start, 1], outputRange: [0, 0, 1], extrapolate: "clamp" });
  const tone = current ? colors.ink : colors.muted;
  const family = current ? fonts.bold : fonts.regular;
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ height: plotHeight + 16, justifyContent: "flex-end", alignItems: "center" }}>
        <Animated.Text style={{ fontFamily: family, fontSize: 10, color: tone, marginBottom: 4, opacity: grow }}>{count}</Animated.Text>
        <Animated.View style={{ width: 32, height, borderRadius: 6, backgroundColor: current ? colors.accent : colors.track, transformOrigin: "bottom", transform: [{ scaleY: grow }] }} />
      </View>
      <Text style={{ marginTop: 6, fontFamily: family, fontSize: 10, color: tone }}>{current ? "Now" : `W${index + 1}`}</Text>
    </View>
  );
}

// Stage 5: mirrors the macro edit on Profile and targets, with −/+ on carbs and the 5% warning (the same check).
function ProfilePreview() {
  const { colors } = useTheme();
  const start = DEMO_PROFILE_EDIT.macros.find((m) => m.label === "Carbs")?.grams ?? DEMO_TARGETS.carbs;
  const [carbs, setCarbs] = useState<number>(start);
  const { carbStep, carbMin, carbMax } = DEMO_PROFILE_EDIT;
  const warn = demoMacroWarning(carbs);
  const stepButton = (label: string, symbol: string, disabled: boolean, onPress: () => void) => (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: pressed ? colors.accent : colors.btn2Edge,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, lineHeight: 18, color: colors.ink }}>{symbol}</Text>
    </Pressable>
  );
  return (
    <PreviewFrame title="Edit your macros">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {DEMO_PROFILE_EDIT.macros.map((macro) => (
          <View
            key={macro.label}
            style={{ flexBasis: "45%", flexGrow: 1, borderRadius: 12, borderWidth: 1, borderColor: macro.edited ? colors.selectedEdge : colors.line, backgroundColor: macro.edited ? colors.selected : "transparent", paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Label size={12}>{macro.label}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              <Text accessibilityLiveRegion={macro.edited ? "polite" : undefined} style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink }}>
                {macro.label === "Carbs" ? carbs : macro.grams} g
              </Text>
              {macro.edited ? (
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {stepButton(`Lower carbs by ${carbStep} g`, "−", carbs <= carbMin, () => setCarbs(Math.max(carbs - carbStep, carbMin)))}
                  {stepButton(`Raise carbs by ${carbStep} g`, "+", carbs >= carbMax, () => setCarbs(Math.min(carbs + carbStep, carbMax)))}
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
      {warn ? <Alert style={{ marginTop: 16 }} tone="warn">{DEMO_PROFILE_EDIT.warning}</Alert> : null}
    </PreviewFrame>
  );
}

/** The preview for one roadmap stage. `at` is the preview's top in scroll-content points, for the draw-in. */
export function StagePreview({ stage, at }: { stage: number; at: number | undefined }) {
  if (stage === 1) return <ResultPreview />;
  if (stage === 2) return <MealPreview at={at} />;
  if (stage === 3) return <WorkoutPreview />;
  if (stage === 4) {
    return (
      <View style={{ gap: 20 }}>
        <WeightPreview at={at} />
        <WorkoutsPerWeekPreview at={at === undefined ? undefined : at + 300} />
      </View>
    );
  }
  if (stage === 5) return <ProfilePreview />;
  return null;
}
