import { describe, expect, it } from "vitest";

import { calculatePayoutCents, isBudgetAvailable } from "@/server/payout";

describe("calculatePayoutCents", () => {
  it("applies the per-thousand floor rule", () => {
    expect(calculatePayoutCents(999, 500)).toBe(0);
    expect(calculatePayoutCents(1_000, 500)).toBe(500);
    expect(calculatePayoutCents(1_999, 500)).toBe(500);
    expect(calculatePayoutCents(2_000, 500)).toBe(1_000);
    expect(calculatePayoutCents(11_823, 500)).toBe(5_500);
  });

  it("checks the campaign budget ceiling", () => {
    expect(isBudgetAvailable(2_000, 22_000, 25_000)).toBe(true);
    expect(isBudgetAvailable(3_000, 22_000, 25_000)).toBe(true);
    expect(isBudgetAvailable(4_000, 22_000, 25_000)).toBe(false);
  });
});
