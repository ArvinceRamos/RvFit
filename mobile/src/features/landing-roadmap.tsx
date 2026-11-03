import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, Text, View, type LayoutChangeEvent } from "react-native";
import { STAGES } from "@/lib/landing-content";
import { StageIcon } from "~/components/stage-icon";
import { Button, Txt } from "~/components/ui";
import { useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";
import { StagePreview } from "./landing-previews";
import { useLandingScroll } from "./landing-scroll";

// The web's roadmap (src/components/roadmap-timeline.tsx and timeline-progress.tsx): a vertical line with one
// stage per dot. A lime line fills down the grey one as you scroll, reached dots turn lime and the current one
// glows. Each stage has its title, its App preview, then its features and link, as on a phone-width web page.

// The dot sits 15 points below the top of each stage and is 10 points across (the web's top-[15px] h-2.5).
const DOT_TOP = 15;
const DOT = 10;

type Measure = { y: number; height: number };

/**
 * `top` is the section's top in scroll-content points. onPreviewCenters reports the middle of each stage's
 * preview, which the ribbon uses as its stops (the web's data-preview-slot).
 */
export function LandingRoadmap({ top, onPreviewCenters }: { top: number | undefined; onPreviewCenters: (centers: number[]) => void }) {
  const { colors } = useTheme();
  const { scrollY, viewport, reducedMotion } = useLandingScroll();
  const [list, setList] = useState<Measure>();
  const [stages, setStages] = useState<Measure[]>([]);
  const [slots, setSlots] = useState<Measure[]>([]);
  const [pulse] = useState(() => new Animated.Value(1));

  const listTop = top !== undefined && list ? top + list.y : undefined;
  const slotTops = useMemo(
    () => STAGES.map((_, i) => (listTop !== undefined && stages[i] && slots[i] ? listTop + stages[i].y + slots[i].y : undefined)),
    [listTop, stages, slots],
  );

  useEffect(() => {
    if (slotTops.some((value) => value === undefined)) return;
    onPreviewCenters(slotTops.map((value, i) => (value ?? 0) + slots[i].height / 2));
  }, [slotTops, slots, onPreviewCenters]);

  // The current dot breathes, like the web's dot-glow.
  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion]);

  // Scroll positions where each dot reaches the middle of the screen (the web's marker).
  const reachAt = listTop !== undefined && viewport > 0 && stages.length === STAGES.length ? stages.map((stage) => listTop + stage.y + DOT_TOP + DOT / 2 - viewport / 2) : undefined;
  const fill =
    listTop !== undefined && list && list.height > 0 && viewport > 0
      ? scrollY.interpolate({ inputRange: [listTop - viewport / 2, listTop + list.height - viewport / 2], outputRange: [0, 1], extrapolate: "clamp" })
      : undefined;

  const setAt = (setter: typeof setStages, index: number) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setter((current) => {
      const next = [...current];
      next[index] = { y, height };
      return next;
    });
  };

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, paddingVertical: 64 }}>
      <Text style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase", color: colors.accentText }}>roadmap</Text>
      <Text accessibilityRole="header" style={{ marginTop: 12, fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink }}>
        Five stages, in order.
      </Text>

      <View onLayout={(event) => setList(event.nativeEvent.layout)} style={{ marginTop: 48, borderLeftWidth: 1, borderLeftColor: colors.line }}>
        {fill ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: -1.5,
              width: 2,
              borderRadius: 999,
              backgroundColor: colors.accent,
              boxShadow: "0px 0px 10px rgba(175,250,0,0.5)",
              transformOrigin: "top",
              transform: [{ scaleY: fill }],
            }}
          />
        ) : null}
        {STAGES.map((stage, i) => (
          <View key={stage.number} onLayout={setAt(setStages, i)} style={{ paddingLeft: 24, paddingBottom: i === STAGES.length - 1 ? 0 : 56 }}>
            <StageDot index={i} pulse={pulse} reachAt={reachAt} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <StageIcon stage={stage.number} />
              <Text style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase", color: colors.accentText }}>{stage.label}</Text>
            </View>
            <Text accessibilityRole="header" style={{ marginTop: 12, fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.ink }}>{stage.title}</Text>
            <Txt style={{ marginTop: 12, fontSize: 16, lineHeight: 28 }} tone="muted">{stage.sentence}</Txt>

            {/* Phones: title, then the preview, then the details, as on the web. */}
            <View onLayout={setAt(setSlots, i)} style={{ marginTop: 24 }}>
              <StagePreview at={slotTops[i]} stage={stage.number} />
            </View>

            <View style={{ marginTop: 24, gap: 8 }}>
              {stage.features.map((line) => (
                <View key={line} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ marginTop: 9, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
                  <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 24, color: colors.ink }}>{line}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 24, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 8 }}>
              {/* Only stage 1 works without an account; the others go to Log in first, as the web's links do. */}
              <Button onPress={() => router.push(stage.href === "/start" ? "/start" : "/login")} variant="secondary">{stage.linkLabel}</Button>
              {stage.href !== "/start" ? <Txt tone="muted" variant="xs">Needs a free account</Txt> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// A grey dot that turns lime once the scroll reaches it, and glows while it is the current stage.
function StageDot({ index, reachAt, pulse }: { index: number; reachAt: number[] | undefined; pulse: Animated.Value }) {
  const { colors } = useTheme();
  const { scrollY } = useLandingScroll();
  const base = { position: "absolute" as const, left: -DOT / 2 - 0.5, top: DOT_TOP, width: DOT, height: DOT, borderRadius: DOT / 2 };
  if (!reachAt) return <View style={[base, { backgroundColor: colors.accent }]} />;

  const at = reachAt[index];
  const next = reachAt[index + 1];
  const reached = scrollY.interpolate({ inputRange: [at - 1, at], outputRange: [0, 1], extrapolate: "clamp" });
  const active =
    next !== undefined && next - 1 > at
      ? scrollY.interpolate({ inputRange: [at - 1, at, next - 1, next], outputRange: [0, 1, 1, 0], extrapolate: "clamp" })
      : reached;
  const scale = active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });

  return (
    <Animated.View style={[base, { backgroundColor: colors.track, transform: [{ scale }] }]}>
      <Animated.View style={{ position: "absolute", inset: 0, borderRadius: DOT / 2, backgroundColor: colors.accent, opacity: reached }} />
      <Animated.View
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: DOT / 2,
          boxShadow: "0px 0px 0px 4px rgba(175,250,0,0.18), 0px 0px 18px 2px rgba(175,250,0,0.7)",
          opacity: Animated.multiply(active, pulse),
        }}
      />
    </Animated.View>
  );
}
