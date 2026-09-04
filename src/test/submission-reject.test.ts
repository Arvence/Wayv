import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { submissionRouter } from "@/server/api/routers/submission";
import { database } from "@/server/db/client";
import { campaigns, submissions, users } from "@/server/db/schema";

describe("atomic submission rejection", () => {
  it("allows only one pending rejection to win", async () => {
    const [admin, creator] = await getUsers();
    const [campaign] = await database.insert(campaigns).values({
      title: `Reject test ${Date.now()}`, platforms: ["tiktok"], payoutPer1kViews: 100,
      totalBudget: 10_000, status: "active",
      startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2027-01-01T00:00:00Z"),
    }).returning();
    const [submission] = await database.insert(submissions).values({
      campaignId: campaign!.id, creatorId: creator.id,
      postUrl: `https://example.com/reject-${Date.now()}`, platform: "tiktok",
    }).returning();

    try {
      const caller = submissionRouter.createCaller({
        database, headers: new Headers(), resHeaders: new Headers(), user: admin,
      });
      const results = await Promise.allSettled([
        caller.reject({ submissionId: submission!.id, rejectionReason: "Reason A" }),
        caller.reject({ submissionId: submission!.id, rejectionReason: "Reason B" }),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter(
        (result) => result.status === "rejected" && result.reason.code === "CONFLICT",
      )).toHaveLength(1);
      const [final] = await database.select().from(submissions).where(eq(submissions.id, submission!.id));
      expect(final?.status).toBe("rejected");
      expect(["Reason A", "Reason B"]).toContain(final?.rejectionReason);

      await expect(caller.reject({
        submissionId: submission!.id, rejectionReason: "Overwrite",
      })).rejects.toMatchObject({ code: "CONFLICT" });
    } finally {
      await database.delete(submissions).where(eq(submissions.id, submission!.id));
      await database.delete(campaigns).where(eq(campaigns.id, campaign!.id));
    }
  });

  it("rejects an already approved submission", async () => {
    const [admin, creator] = await getUsers();
    const [campaign] = await database.insert(campaigns).values({
      title: `Reject approved test ${Date.now()}`, platforms: ["tiktok"], payoutPer1kViews: 100,
      totalBudget: 10_000, status: "active",
      startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2027-01-01T00:00:00Z"),
    }).returning();
    const [submission] = await database.insert(submissions).values({
      campaignId: campaign!.id, creatorId: creator.id,
      postUrl: `https://example.com/reject-approved-${Date.now()}`, platform: "tiktok", status: "approved",
    }).returning();
    try {
      await expect(submissionRouter.createCaller({
        database, headers: new Headers(), resHeaders: new Headers(), user: admin,
      }).reject({ submissionId: submission!.id, rejectionReason: "Overwrite" }))
        .rejects.toMatchObject({ code: "CONFLICT" });
    } finally {
      await database.delete(submissions).where(eq(submissions.id, submission!.id));
      await database.delete(campaigns).where(eq(campaigns.id, campaign!.id));
    }
  });
});

async function getUsers() {
  const [admin] = await database.select().from(users).where(eq(users.role, "admin")).limit(1);
  const [creator] = await database.select().from(users).where(eq(users.role, "creator")).limit(1);
  if (!admin || !creator) throw new Error("Test users are required.");
  return [admin, creator] as const;
}
