// Rules for the landing page 3D ribbon. Kept free of three and the DOM so they can be tested.

// Below this width the static fallback shows instead (phones and tablets).
export const RIBBON_MIN_WIDTH = 1024;

export type RibbonEnv = {
  width: number;
  reducedMotion: boolean;
  saveData: boolean;
  webgl2: boolean;
};

// 3D is a desktop enhancement. Any one of these turns it off and the static fallback stays.
export function shouldRun3D(env: RibbonEnv): boolean {
  return env.width >= RIBBON_MIN_WIDTH && !env.reducedMotion && !env.saveData && env.webgl2;
}

// One keyframe per stop: the hero, the five stages, then the closing.
// t is the point on the ribbon the camera looks at (0 to 1). offset is where the camera sits from that point.
// shift moves the look point so the ribbon sits to one side. soft 0 is sharp lines (hero only),
// 1 is a dim blurred glow that keeps body text readable on top of it.
export type RibbonKeyframe = {
  t: number;
  offset: [number, number, number];
  shift: [number, number, number];
  soft: number;
};

export const RIBBON_KEYFRAMES: RibbonKeyframe[] = [
  { t: 0.12, offset: [0, 1, 10], shift: [-4.5, -1.5, 0], soft: 0 },
  { t: 0.25, offset: [-3, 3, 10], shift: [-4, 0, 0], soft: 1 },
  { t: 0.37, offset: [3, -2, 10], shift: [-4, 1, 0], soft: 1 },
  { t: 0.49, offset: [-2, 4, 11], shift: [-4, -1, 0], soft: 1 },
  { t: 0.61, offset: [4, 1, 10], shift: [-4, 0, 0], soft: 1 },
  { t: 0.73, offset: [-3, -3, 11], shift: [-4, 1, 0], soft: 1 },
  { t: 0.86, offset: [0, 2, 12], shift: [-5, 0, 0], soft: 1 },
];

function ease(x: number): number {
  return x * x * (3 - 2 * x);
}

function mix(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

function mix3(a: [number, number, number], b: [number, number, number], k: number): [number, number, number] {
  return [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
}

// Pose at a fractional stop index (0 = hero, 6 = closing). Eases between neighbouring keyframes.
export function poseAt(index: number, keyframes: RibbonKeyframe[] = RIBBON_KEYFRAMES): RibbonKeyframe {
  const last = keyframes.length - 1;
  const clamped = Math.min(Math.max(Number.isFinite(index) ? index : 0, 0), last);
  const i = Math.min(Math.floor(clamped), last - 1);
  const k = ease(clamped - i);
  const a = keyframes[i];
  const b = keyframes[i + 1];
  return {
    t: mix(a.t, b.t, k),
    offset: mix3(a.offset, b.offset, k),
    shift: mix3(a.shift, b.shift, k),
    soft: mix(a.soft, b.soft, k),
  };
}

// Turns the scroll position into a fractional stop index.
// stops are the scroll positions where each stop sits in the middle of the screen, in page order.
export function stopIndex(scrollY: number, stops: number[]): number {
  if (stops.length < 2) return 0;
  if (scrollY <= stops[0]) return 0;
  for (let i = 1; i < stops.length; i++) {
    if (scrollY < stops[i]) {
      const span = stops[i] - stops[i - 1];
      return span > 0 ? i - 1 + (scrollY - stops[i - 1]) / span : i;
    }
  }
  return stops.length - 1;
}
