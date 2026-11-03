import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, View } from "react-native";

// What the welcome screen's moving parts need from the scroll: the scroll position (driven on the native side,
// so the roadmap line follows the finger without waiting for JavaScript), the visible height, and whether the
// phone asks for reduced motion.
export type LandingScroll = {
  scrollY: Animated.Value;
  getScrollY: () => number;
  viewport: number;
  reducedMotion: boolean;
};

const LandingScrollContext = createContext<LandingScroll | null>(null);

export const LandingScrollProvider = LandingScrollContext.Provider;

export function useLandingScroll(): LandingScroll {
  const value = useContext(LandingScrollContext);
  if (!value) throw new Error("useLandingScroll must be used inside LandingScrollProvider");
  return value;
}

// 0 while a chart is waiting off screen, then up to 1 as it draws in.
const DrawProgress = createContext<Animated.Value>(new Animated.Value(1));

export function useDrawProgress(): Animated.Value {
  return useContext(DrawProgress);
}

// How much of the screen the chart's top must be above before it draws (the web draws at 30% visible).
const DRAW_AT = 0.85;

/**
 * The web's DrawIn: the lines and bars inside draw in when scrolled into view, and again after the chart has
 * left the screen below. `at` is the chart's top in scroll-content points; until it is measured nothing moves.
 * With reduced motion everything is simply shown.
 */
export function DrawIn({ at, children }: { at: number | undefined; children: ReactNode }) {
  const { scrollY, getScrollY, viewport, reducedMotion } = useLandingScroll();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    if (at === undefined || viewport <= 0) return;
    let drawn = false;
    const check = (y: number) => {
      if (!drawn && y + viewport * DRAW_AT >= at) {
        drawn = true;
        Animated.timing(progress, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      } else if (drawn && y + viewport < at) {
        // Off screen below again: re-arm out of sight, so it draws in on the way back.
        drawn = false;
        progress.stopAnimation();
        progress.setValue(0);
      }
    };
    check(getScrollY());
    const id = scrollY.addListener(({ value }) => check(value));
    return () => scrollY.removeListener(id);
  }, [at, viewport, reducedMotion, scrollY, getScrollY, progress]);

  return <DrawProgress.Provider value={progress}>{children}</DrawProgress.Provider>;
}

/** A track with a fill that grows from the left as its chart draws in (the web's draw-fill bars). */
export function FillBar({ percent, color, track, height = 8, delay = 0 }: { percent: number; color: string; track: string; height?: number; delay?: number }) {
  const progress = useDrawProgress();
  // A small stagger for bars in the same chart, as a share of the draw (the web uses transition delays).
  const grow = delay > 0 ? progress.interpolate({ inputRange: [0, Math.min(delay, 0.5), 1], outputRange: [0, 0, 1], extrapolate: "clamp" }) : progress;
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={{ width: `${percent}%`, height: "100%", borderRadius: height, backgroundColor: color, transformOrigin: "left", transform: [{ scaleX: grow }] }} />
    </View>
  );
}
