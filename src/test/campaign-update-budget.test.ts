import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { campaignRouter } from "@/server/api/routers/campaign";
import { database } from "@/server/db/client";
import { campaigns, submissionMetrics, submissions, users } from "@/server/db/schema";

describe("campaign financial update safety", () => {
  it("rejects a budget lower than approved spend and leaves the campaign unchanged", async () => {
    const [admin, creator] = await getUsers();
    const [campaign] = await createCampaign(5_000, 100);
    const [submission] = await database
      .insert(submissions)
      .values({
        campaignId: campaign!.id,
        creatorId: creator.id,
        postUrl: `https://example.com/update-budget-${Date.now()}`,
        platform: "tiktok",
        status: "approved",
      })
      .returning();
    await database.insert(submissionMetrics).values({
      submissionId: submission!.id,
      capturedAt: "2026-09-04",
      views: 30_000,
      likes: 100,
      comments: 10,
    });

    try {
      const caller = campaignRouter.createCaller(context(admin));
      await expect(caller.update({ ...campaign!, totalBudget: 2_000 })).rejects.toMatchObject({
        code: "CONFLICT",
        message: "CAMPAIGN_BUDGET_CONFLICT",
      });
      const [unchanged] = await database.select().from(campaigns).where(eq(campaigns.id, campaign!.id));
      expect(unchanged?.totalBudget).toBe(5_000);
    } finally {
      await cleanup(campaign!.id);
    }
  });

  it("rejects a payout edit that would exceed the budget", async () => {
    const [admin, creator] = await getUsers();
    const [campaign] = await createCampaign(1_000, 100);
    const [submission] = await database.insert(submissions).values({
      campaignId: campaign!.id,
      creatorId: creator.id,
      postUrl: `https://example.com/update-payout-${Date.now()}`,
      platform: "tiktok",
      status: "approved",
    }).returning();
    await database.insert(submissionMetrics).values({
      submissionId: submission!.id, capturedAt: "2026-09-04", views: 5_000, likes: 10, comments: 1,
    });

    try {
      await expect(campaignRouter.createCaller(context(admin)).update({ ...campaign!, payoutPer1kViews: 300 }))
        .rejects.toMatchObject({ code: "CONFLICT", message: "CAMPAIGN_BUDGET_CONFLICT" });
    } finally {
      await cleanup(campaign!.id);
    }
  });

  it("marks the campaign completed when an edit exactly uses the budget", async () => {
    const [admin, creator] = await getUsers();
    const [campaign] = await createCampaign(1_000, 100);
    const [submission] = await database.insert(submissions).values({
      campaignId: campaign!.id, creatorId: creator.id,
      postUrl: `https://example.com/update-exact-${Date.now()}`, platform: "tiktok", status: "approved",
    }).returning();
    await database.insert(submissionMetrics).values({
      submissionId: submission!.id, capturedAt: "2026-09-04", views: 5_000, likes: 10, comments: 1,
    });

    try {
      const updated = await campaignRouter.createCaller(context(admin)).update({
        ...campaign!, totalBudget: 500,
      });
      expect(updated.status).toBe("completed");
    } finally {
      await cleanup(campaign!.id);
    }
  });
});

async function getUsers() {
  const [admin] = await database.select().from(users).where(eq(users.role, "admin")).limit(1);
  const [creator] = await database.select().from(users).where(eq(users.role, "creator")).limit(1);
  if (!admin || !creator) throw new Error("Test users are required.");
  return [admin, creator] as const;
}

async function createCampaign(totalBudget: number, payoutPer1kViews: number) {
  return database.insert(campaigns).values({
    title: `Campaign update test ${Date.now()}-${Math.random()}`,
    platforms: ["tiktok"], payoutPer1kViews, totalBudget, status: "active",
    startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2027-01-01T00:00:00Z"),
  }).returning();
}

function context(admin: typeof users.$inferSelect) {
  return { database, headers: new Headers(), resHeaders: new Headers(), user: admin };
}

async function cleanup(campaignId: string) {
  const rows = await database.select({ id: submissions.id }).from(submissions).where(eq(submissions.campaignId, campaignId));
  for (const row of rows) {
    await database.delete(submissionMetrics).where(eq(submissionMetrics.submissionId, row.id));
  }
  await database.delete(submissions).where(eq(submissions.campaignId, campaignId));
  await database.delete(campaigns).where(eq(campaigns.id, campaignId));
}
