import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// The phone's reduce-motion setting, kept up to date while the screen is open. The ribbon stays still and the
// welcome screen's charts and timeline appear without moving, like the web's prefers-reduced-motion.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
