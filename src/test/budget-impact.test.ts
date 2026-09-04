import { describe, expect, it } from "vitest";

import {
  calculateBudgetImpactPercent,
  calculateBudgetPercentage,
} from "@/lib/budget-impact";

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
});
