import { describe, expect, it } from "vitest";
import { chartLayout, filterByRange, weightChange } from "./weight-chart";

const box = { width: 100, height: 60, left: 10, right: 10, top: 10, bottom: 10 };

describe("chartLayout", () => {
  it("needs at least two points", () => {
    expect(chartLayout([], box)).toBeNull();
    expect(chartLayout([{ time: 1, value: 80 }], box)).toBeNull();
  });

  it("places the first point at the left and the last at the right", () => {
    const layout = chartLayout([{ time: 0, value: 80 }, { time: 10, value: 82 }], box)!;
    expect(layout.points[0].x).toBe(10);
    expect(layout.points[1].x).toBe(90);
  });

  it("spaces points by time, not by order", () => {
    const layout = chartLayout([{ time: 0, value: 80 }, { time: 1, value: 80.5 }, { time: 10, value: 81 }], box)!;
    expect(layout.points[1].x).toBeCloseTo(18, 5);
  });

  it("uses whole numbers around the data and puts higher values higher up", () => {
    const layout = chartLayout([{ time: 0, value: 80.2 }, { time: 1, value: 81.7 }], box)!;
    expect([layout.yMin, layout.yMax]).toEqual([80, 82]);
    expect(layout.points[0].y).toBeGreaterThan(layout.points[1].y);
    // 82 is the top of the plot and 80 the bottom.
    const edges = chartLayout([{ time: 0, value: 80 }, { time: 1, value: 82 }], box)!;
    expect(edges.points[0].y).toBe(50);
    expect(edges.points[1].y).toBe(10);
  });

  it("draws a flat line in the middle when every weight is the same", () => {
    const layout = chartLayout([{ time: 0, value: 80 }, { time: 1, value: 80 }], box)!;
    expect([layout.yMin, layout.yMax]).toEqual([79, 81]);
    expect(layout.points.map((point) => point.y)).toEqual([30, 30]);
  });

  it("centres points that share the same time and skips unreadable ones", () => {
    const layout = chartLayout([{ time: 5, value: 80 }, { time: 5, value: 81 }, { time: Number.NaN, value: 90 }], box)!;
    expect(layout.points).toHaveLength(2);
    expect(layout.points.every((point) => point.x === 50)).toBe(true);
  });
});

describe("filterByRange", () => {
  const day = 24 * 60 * 60 * 1000;
  const now = 100 * day;
  const points = [
    { time: now - 40 * day, value: 80 },
    { time: now - 10 * day, value: 81 },
    { time: now - 2 * day, value: 82 },
  ];

  it("keeps only points inside the window", () => {
    expect(filterByRange(points, 7, now).map((point) => point.value)).toEqual([82]);
    expect(filterByRange(points, 30, now).map((point) => point.value)).toEqual([81, 82]);
  });

  it("keeps everything for null", () => {
    expect(filterByRange(points, null, now)).toHaveLength(3);
  });

  it("keeps a point saved after the window was computed", () => {
    expect(filterByRange([{ time: now + day, value: 90 }], 30, now)).toHaveLength(1);
  });
});

describe("weightChange", () => {
  const day = 24 * 60 * 60 * 1000;
  const now = 100 * day;

  it("needs a weigh-in in the first week and the last week of the window", () => {
    expect(weightChange([], 30, now)).toBeNull();
    expect(weightChange([{ time: now - day, value: 80 }], 30, now)).toBeNull();
    expect(weightChange([{ time: now - 28 * day, value: 80 }, { time: now - 15 * day, value: 79 }], 30, now)).toBeNull();
  });

  it("compares weekly averages, so one heavy day does not swing the result", () => {
    // First week: 80, 80.4, 79.6 (avg 80). Last week: 78.5, 80.5 (a salty-dinner spike), 78.5 (avg 79.17).
    const points = [
      { time: now - 29 * day, value: 80 },
      { time: now - 27 * day, value: 80.4 },
      { time: now - 25 * day, value: 79.6 },
      { time: now - 5 * day, value: 78.5 },
      { time: now - 3 * day, value: 80.5 },
      { time: now - day, value: 78.5 },
    ];
    expect(weightChange(points, 30, now)).toBeCloseTo(79.1667 - 80, 3);
    // First-vs-last would have said -1.5; the averages say about -0.8.
  });

  it("can be positive and ignores order and points outside the window", () => {
    const points = [{ time: now, value: 61.5 }, { time: now - 40 * day, value: 90 }, { time: now - 26 * day, value: 60 }];
    expect(weightChange(points, 30, now)).toBeCloseTo(1.5, 5);
  });
});
