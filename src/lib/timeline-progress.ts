// Math for the landing page roadmap line. Kept free of the DOM so it can be tested.
// All positions are in screen pixels from the top of the viewport (getBoundingClientRect).

// How much of the line is filled, 0 to 1: from the line's top down to the marker (the middle of the screen).
export function timelineFill(lineTop: number, lineHeight: number, marker: number): number {
  if (!(lineHeight > 0) || !Number.isFinite(lineTop) || !Number.isFinite(marker)) return 0;
  return Math.min(Math.max((marker - lineTop) / lineHeight, 0), 1);
}

// The last stage whose dot is at or above the marker, or -1 before the first one.
// dotTops are in page order, so the stages above it count as reached.
export function activeStage(dotTops: readonly number[], marker: number): number {
  let active = -1;
  dotTops.forEach((top, i) => {
    if (top <= marker) active = i;
  });
  return active;
}
