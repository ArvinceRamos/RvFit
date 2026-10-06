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
