import { describe, expect, it } from "vitest";

import {
  calculateBudgetImpactPercent,
  calculateBudgetPercentage,
} from "@/lib/budget-impact";
import {
  calculateViewsTrend,
  calculateTotalApprovedViews,
  getLatestCumulativeApprovedViews,
  getLatestActiveDailyViews,
} from "@/lib/approved-views";

describe("calculateBudgetImpactPercent", () => {
  it("calculates the percentage of total campaign budget", () => {
    expect(calculateBudgetImpactPercent(25_000, 100_000)).toBe(25);
    expect(calculateBudgetImpactPercent(16_500, 250_000)).toBeCloseTo(6.6, 1);
  });

  it("handles zero payout and zero total budget", () => {
    expect(calculateBudgetImpactPercent(0, 0)).toBe(0);
    expect(calculateBudgetImpactPercent(0, 62_000)).toBe(0);
    expect(calculateBudgetImpactPercent(1, 0)).toBe(0);
  });

  it("calculates spent and remaining percentages from the total budget", () => {
    expect(calculateBudgetPercentage(40_000, 100_000)).toBe(40);
    expect(calculateBudgetPercentage(60_000, 100_000)).toBe(60);
  });

  it("sums approved views as numbers and ignores trailing zero days", () => {
    const activity = getLatestActiveDailyViews([
      { date: "2026-09-04", views: 7_600 },
      { date: "2026-09-05", views: 10_200 },
      { date: "2026-09-06", views: 14_500 },
      { date: "2026-09-07", views: 0 },
      { date: "2026-09-08", views: 0 },
    ]);

    expect(
      calculateTotalApprovedViews([
        { status: "approved", views: 4_352 },
        { status: "approved", views: 7_600 },
        { status: "rejected", views: 24_500 },
        { status: "pending", views: 3_200 },
      ]),
    ).toBe(11_952);
    expect(activity).toEqual({ latest: 14_500, previous: 10_200 });
    expect(calculateViewsTrend(activity.latest, activity.previous)).toBeCloseTo(42.1568, 3);
  });

  it("handles missing previous activity without infinity", () => {
    expect(calculateViewsTrend(7_600, null)).toBeNull();
    expect(calculateViewsTrend(7_600, 0)).toBeNull();
    expect(calculateViewsTrend(0, 0)).toBe(0);
  });

  it("compares cumulative approved-view snapshots", () => {
    const snapshots = getLatestCumulativeApprovedViews([
      { submissionId: "a", capturedAt: "2026-08-20", views: 5_900 },
      { submissionId: "a", capturedAt: "2026-08-21", views: 6_608 },
      { submissionId: "a", capturedAt: "2026-08-22", views: 7_316 },
      { submissionId: "a", capturedAt: "2026-08-23", views: 8_024 },
      { submissionId: "b", capturedAt: "2026-08-28", views: 32_000 },
      { submissionId: "c", capturedAt: "2026-09-03", views: 2_100 },
    ]);

    expect(snapshots).toEqual({ latest: 42_124, previous: 40_024 });
    expect(calculateViewsTrend(snapshots.latest, snapshots.previous)).toBeCloseTo(5.2, 1);
  });
});
