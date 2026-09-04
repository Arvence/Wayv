import { describe, expect, it } from "vitest";

import { generateInitialMetric, generateNextMetric } from "@/server/db/metrics";

describe("metric generation", () => {
  it("keeps daily metrics from decreasing", () => {
    const initial = generateInitialMetric();
    const next = generateNextMetric(initial);

    expect(initial.views).toBeGreaterThan(0);
    expect(initial.likes).toBeLessThan(initial.views);
    expect(initial.comments).toBeLessThan(initial.likes);
    expect(next.views).toBeGreaterThan(initial.views);
    expect(next.likes).toBeGreaterThanOrEqual(initial.likes);
    expect(next.comments).toBeGreaterThanOrEqual(initial.comments);
  });
});
