// When a landing page chart draws in. Kept free of the DOM so it can be tested.
// "armed" hides the lines and bars (styles in globals.css), "done" lets them draw in.

export type DrawState = "armed" | "done" | undefined;

// How much of the chart must be on screen before it draws in.
export const DRAW_IN_RATIO = 0.3;

// Fully off screen: arm it, so it draws in again next time. Enough on screen: draw it. Otherwise keep the current state.
export function nextDrawState(current: DrawState, isIntersecting: boolean, ratio: number): DrawState {
  if (!isIntersecting) return "armed";
  if (ratio >= DRAW_IN_RATIO) return "done";
  return current;
}
