import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { processApprovedSubmission } from "@/server/db/ingest";
import { database } from "@/server/db/client";
import { campaigns, submissionMetrics, submissions, users } from "@/server/db/schema";
import { calculatePayoutCents } from "@/server/payout";

describe("ingest budget growth safety", () => {
  it("caps persisted growth so approved spend never exceeds the budget", async () => {
    const [creator] = await database.select().from(users).where(eq(users.role, "creator")).limit(1);
    if (!creator) throw new Error("A creator test user is required.");

    const [campaign] = await database
      .insert(campaigns)
      .values({
        title: `Ingest budget test ${Date.now()}`,
        platforms: ["tiktok"],
        payoutPer1kViews: 100,
        totalBudget: 1_000,
        status: "active",
        startsAt: new Date("2026-01-01T00:00:00Z"),
        endsAt: new Date("2027-01-01T00:00:00Z"),
      })
      .returning();
    if (!campaign) throw new Error("Test campaign could not be created.");

    const [submissionA, submissionB] = await database
      .insert(submissions)
      .values([
        { campaignId: campaign.id, creatorId: creator.id, postUrl: `https://example.com/ingest-a-${Date.now()}`, platform: "tiktok", status: "approved" },
        { campaignId: campaign.id, creatorId: creator.id, postUrl: `https://example.com/ingest-b-${Date.now()}`, platform: "tiktok", status: "approved" },
      ])
      .returning();
    if (!submissionA || !submissionB) throw new Error("Test submissions could not be created.");

    await database.insert(submissionMetrics).values([
      { submissionId: submissionA.id, capturedAt: "2026-09-03", views: 5_000, likes: 100, comments: 10 },
      { submissionId: submissionB.id, capturedAt: "2026-09-03", views: 4_000, likes: 100, comments: 10 },
    ]);

    try {
      await processApprovedSubmission(database, submissionA, "2026-09-04");
      const metrics = await database.select().from(submissionMetrics).where(
        eq(submissionMetrics.submissionId, submissionA.id),
      );
      const spent = (
        await database.select().from(submissionMetrics).where(
          and(eq(submissionMetrics.submissionId, submissionA.id)),
        )
      );
      const latestA = metrics.sort((first, second) => second.capturedAt.localeCompare(first.capturedAt))[0]!;
      const totalSpend = calculatePayoutCents(Number(latestA.views), 100) + 400;

      expect(Number(latestA.views)).toBeGreaterThanOrEqual(5_000);
      expect(totalSpend).toBeLessThanOrEqual(1_000);
      expect(spent.length).toBe(2);

      const [updatedCampaign] = await database.select().from(campaigns).where(eq(campaigns.id, campaign.id));
      expect((updatedCampaign?.totalBudget ?? 0) - totalSpend).toBeGreaterThanOrEqual(0);
      if (totalSpend === 1_000) expect(updatedCampaign?.status).toBe("completed");
    } finally {
      await database.delete(submissionMetrics).where(eq(submissionMetrics.submissionId, submissionA.id));
      await database.delete(submissionMetrics).where(eq(submissionMetrics.submissionId, submissionB.id));
      await database.delete(submissions).where(eq(submissions.campaignId, campaign.id));
      await database.delete(campaigns).where(eq(campaigns.id, campaign.id));
    }
  });
});
