import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { submissionRouter } from "@/server/api/routers/submission";
import { database } from "@/server/db/client";
import { campaigns, submissionMetrics, submissions, users } from "@/server/db/schema";

describe("submission approval concurrency", () => {
  it("allows only one approval when the budget covers one submission", async () => {
    const [admin] = await database
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    const [creator] = await database
      .select()
      .from(users)
      .where(eq(users.role, "creator"))
      .limit(1);

    if (!admin || !creator) {
      throw new Error("Test users are required.");
    }

    const [campaign] = await database
      .insert(campaigns)
      .values({
        title: `Concurrency test ${Date.now()}`,
        platforms: ["tiktok"],
        payoutPer1kViews: 100,
        totalBudget: 100,
        status: "active",
        startsAt: new Date("2026-01-01T00:00:00Z"),
        endsAt: new Date("2027-01-01T00:00:00Z"),
      })
      .returning();

    if (!campaign) throw new Error("Test campaign could not be created.");

    const createdSubmissions = await database
      .insert(submissions)
      .values([
        {
          campaignId: campaign.id,
          creatorId: creator.id,
          postUrl: `https://example.com/concurrency-a-${Date.now()}`,
          platform: "tiktok",
        },
        {
          campaignId: campaign.id,
          creatorId: creator.id,
          postUrl: `https://example.com/concurrency-b-${Date.now()}`,
          platform: "tiktok",
        },
      ])
      .returning();

    await database.insert(submissionMetrics).values(
      createdSubmissions.map((submission) => ({
        submissionId: submission.id,
        capturedAt: "2026-09-04",
        views: 1_000,
        likes: 10,
        comments: 1,
      })),
    );

    const caller = submissionRouter.createCaller({
      database,
      headers: new Headers(),
      resHeaders: new Headers(),
      user: admin,
    });

    try {
      const results = await Promise.allSettled(
        createdSubmissions.map((submission) =>
          caller.approve({ submissionId: submission.id }),
        ),
      );
      const successful = results.filter((result) => result.status === "fulfilled");
      const failed = results.filter((result) => result.status === "rejected");

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect((failed[0] as PromiseRejectedResult).reason.code).toBe("CONFLICT");

      const remaining = await database
        .select({ status: submissions.status })
        .from(submissions)
        .where(and(eq(submissions.campaignId, campaign.id)));
      expect(remaining.filter((submission) => submission.status === "approved")).toHaveLength(1);
      expect(remaining.filter((submission) => submission.status === "pending")).toHaveLength(1);
    } finally {
      await database
        .delete(submissionMetrics)
        .where(
          eq(submissionMetrics.submissionId, createdSubmissions[0]!.id),
        );
      await database
        .delete(submissions)
        .where(eq(submissions.campaignId, campaign.id));
      await database.delete(campaigns).where(eq(campaigns.id, campaign.id));
    }
  });
});
