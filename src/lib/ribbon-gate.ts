// Rules for the landing page 3D ribbon. Kept free of three and the DOM so they can be tested.

// Below this width phones and tablets get the lite scene: fewer pixels, fewer segments, 30 fps,
// and a camera pulled back so the ribbon fits a narrow screen.
export const RIBBON_MIN_WIDTH = 1024;

export type RibbonQuality = "full" | "lite";

export type RibbonEnv = {
  width: number;
  reducedMotion: boolean;
  saveData: boolean;
  webgl2: boolean;
};

// Any one of these turns 3D off and the static fallback stays. Screen width only picks the quality.
export function shouldRun3D(env: RibbonEnv): boolean {
  return !env.reducedMotion && !env.saveData && env.webgl2;
}

export function ribbonQuality(width: number): RibbonQuality {
  return width >= RIBBON_MIN_WIDTH ? "full" : "lite";
}

// The ribbon sits behind every page (root layout). How the camera moves depends on the page:
// journey: the landing page, one stop per section as you scroll.
// hero: the auth pages, the sharp hero pose behind the card.
// calm: everything else, a soft dim glow that drifts slowly as you scroll, so text stays easy to read.
export type RibbonRoute = "journey" | "hero" | "calm";

const HERO_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function ribbonRoute(pathname: string): RibbonRoute {
  if (pathname === "/") return "journey";
  return HERO_PATHS.includes(pathname) ? "hero" : "calm";
}

// Calm pages drift from stop 1 to stop 5, the soft keyframes, as the page scrolls from top to bottom.
export function calmIndex(scrollY: number, maxScroll: number): number {
  const progress = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;
  return 1 + 4 * progress;
}

// App pages show the ribbon a little brighter than the landing stages, so it reads through the glass cards,
// but still blurred enough that text between the cards stays easy to read.
export const CALM_SOFT = 0.22;

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

// The same path for narrow screens: the camera sits further back and looks closer to the ribbon,
// so it crosses the middle of a tall screen instead of leaving it.
export const RIBBON_KEYFRAMES_NARROW: RibbonKeyframe[] = RIBBON_KEYFRAMES.map((frame) => ({
  t: frame.t,
  offset: [frame.offset[0] * 0.5, frame.offset[1] * 0.5, frame.offset[2] + 6],
  // Looking a little above the ribbon puts it lower on screen, under the hero text on a phone.
  shift: [frame.shift[0] * 0.25, frame.shift[1] * 0.5 + 1.8, frame.shift[2]],
  soft: frame.soft,
}));

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
