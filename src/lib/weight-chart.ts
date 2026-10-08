export type ChartPoint = { time: number; value: number };

export type ChartLayout = {
  /** Pixel positions in the same order as the input points. */
  points: { x: number; y: number }[];
  /** Whole numbers at the bottom and top of the chart, for the axis labels. */
  yMin: number;
  yMax: number;
};

type Box = { width: number; height: number; left: number; right: number; top: number; bottom: number };

// Lays recorded weigh-ins out on a line chart. Only recorded points are drawn: no smoothing, no goal line.
// The vertical range is the lowest whole number below the data up to the highest whole number above it.
// Returns null when there are fewer than two points, because one point makes no line.
export function chartLayout(points: readonly ChartPoint[], box: Box): ChartLayout | null {
  const usable = points.filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value));
  if (usable.length < 2) return null;

  const times = usable.map((point) => point.time);
  const values = usable.map((point) => point.value);
  const firstTime = Math.min(...times);
  const timeSpan = Math.max(...times) - firstTime;

  let yMin = Math.floor(Math.min(...values));
  let yMax = Math.ceil(Math.max(...values));
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }

  const plotWidth = box.width - box.left - box.right;
  const plotHeight = box.height - box.top - box.bottom;
  return {
    yMin,
    yMax,
    points: usable.map((point) => ({
      x: box.left + (timeSpan === 0 ? plotWidth / 2 : ((point.time - firstTime) / timeSpan) * plotWidth),
      y: box.top + (1 - (point.value - yMin) / (yMax - yMin)) * plotHeight,
    })),
  };
}

export const chartRanges = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All", days: null },
] as const;

export type ChartRangeKey = (typeof chartRanges)[number]["key"];

// Keeps the points from the last `days` days. null keeps every point. There is no upper limit, so a weigh-in
// saved after the page opened still shows.
export function filterByRange(points: readonly ChartPoint[], days: number | null, now: number): ChartPoint[] {
  if (days === null) return [...points];
  const since = now - days * 24 * 60 * 60 * 1000;
  return points.filter((point) => point.time >= since);
}

// Change over the last "days" days, as the average of the most recent week minus the average of the
// first week of the window. Daily weight swings by 1-2 kg with water and food, so comparing two single
// weigh-ins is mostly noise; weekly averages match the 7-day trend used elsewhere.
// null unless both weeks have at least one weigh-in. Plain arithmetic only: it says what changed, not
// whether the change is good.
export function weightChange(points: readonly ChartPoint[], days: number, now: number, weekDays = 7): number | null {
  const dayMs = 24 * 60 * 60 * 1000;
  const valid = points.filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value));
  const start = now - days * dayMs;
  const early = valid.filter((point) => point.time >= start && point.time < start + weekDays * dayMs);
  const recent = valid.filter((point) => point.time >= now - weekDays * dayMs);
  if (early.length === 0 || recent.length === 0) return null;
  const average = (list: readonly ChartPoint[]) => list.reduce((sum, point) => sum + point.value, 0) / list.length;
  return average(recent) - average(early);
}
