import { useIsFocused } from "expo-router";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useEffect, useRef, useState } from "react";
import { Animated, AppState, View, useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { logError } from "@/lib/log";
import type { RibbonHandle } from "~/features/ribbon-scene";
import { useReducedMotion } from "~/lib/use-reduced-motion";

// The web's light ribbon behind the welcome and log-in screens (src/components/ribbon-background.tsx).
// A static ribbon shows first; the GL scene fades in over it once its first frame is drawn. With the phone's
// reduce-motion setting on, or if GL fails, the static ribbon stays. The scene pauses while its screen is
// hidden (another screen on top) or the app is in the background, so only one ribbon ever animates.

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => subscription.remove();
  }, []);
  return active;
}

/**
 * getIndex returns the fractional stop for the camera (the welcome screen's scroll position); the auth
 * screens leave it out and hold the hero pose.
 */
export function RibbonBackground({ getIndex }: { getIndex?: () => number }) {
  // The window's size, not the screen's: the ribbon keeps its size when the keyboard opens, so it does not
  // jump (the parent just covers its lower part).
  const { width, height } = useWindowDimensions();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));
  const sceneRef = useRef<RibbonHandle | null>(null);
  const getIndexRef = useRef(getIndex);
  const run = !reducedMotion && !failed;
  const playing = run && focused && appActive;
  const playingRef = useRef(playing);

  useEffect(() => {
    getIndexRef.current = getIndex;
  }, [getIndex]);

  useEffect(() => {
    playingRef.current = playing;
    sceneRef.current?.setPlaying(playing);
  }, [playing]);

  // Stop the scene when its GL view goes away (reduce motion turned on, or the screen closes).
  const liveRef = useRef(false);
  useEffect(() => {
    if (!run) return;
    liveRef.current = true;
    return () => {
      liveRef.current = false;
      sceneRef.current?.stop();
      sceneRef.current = null;
      fade.setValue(0);
    };
  }, [run, fade]);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    try {
      // Loaded on first use, so screens without the ribbon never run three's code.
      const { startRibbon } = await import("~/features/ribbon-scene");
      if (!liveRef.current) return;
      sceneRef.current = startRibbon(gl, {
        getIndex: () => getIndexRef.current?.() ?? 0,
        onReady: () => Animated.timing(fade, { toValue: 1, duration: 1000, useNativeDriver: true }).start(),
      });
      sceneRef.current.setPlaying(playingRef.current);
    } catch (caught) {
      logError("ribbon.start", caught);
      setFailed(true);
    }
  };

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, width, height }}>
      <Animated.View style={{ opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
        <StaticRibbon height={Math.min(height, 960)} width={width} />
      </Animated.View>
      {run ? (
        <Animated.View style={{ position: "absolute", top: 0, left: 0, width, height, opacity: fade }}>
          <GLView onContextCreate={onContextCreate} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

// The web's CSS ribbon (.ribbon-static): two soft, dim bands of Fit Green, drawn as glowing ellipses.
function StaticRibbon({ width, height }: { width: number; height: number }) {
  return (
    <Svg height={height} width={width}>
      <Defs>
        <RadialGradient id="band" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#affa00" stopOpacity={0.14} />
          <Stop offset="0.6" stopColor="#cfed89" stopOpacity={0.07} />
          <Stop offset="1" stopColor="#cfed89" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="thread" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#cfed89" stopOpacity={0.1} />
          <Stop offset="1" stopColor="#cfed89" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width * 0.8} cy={height * 0.4 + 55} fill="url(#band)" origin={`${width * 0.8}, ${height * 0.4 + 55}`} rotation={-16} rx={width * 0.45 + 40} ry={95} />
      <Ellipse cx={width * 0.8} cy={height * 0.52 + 18} fill="url(#thread)" origin={`${width * 0.8}, ${height * 0.52 + 18}`} rotation={-10} rx={width * 0.45 + 16} ry={34} />
    </Svg>
  );
}
