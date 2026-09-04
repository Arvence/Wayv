import { and, eq } from "drizzle-orm";

import { database } from "./client";
import { campaigns, submissionMetrics, submissions, users } from "./schema";

const seedUserValues = [
  { email: "admin@wavy.test", role: "admin" as const },
  { email: "creator1@wavy.test", role: "creator" as const },
  { email: "creator2@wavy.test", role: "creator" as const },
];

const campaignDefinitions = [
  {
    title: "Autumn Streetwear Launch",
    platforms: ["tiktok", "instagram"] as const,
    payoutPer1kViews: 450,
    totalBudget: 320_000,
    startsAt: "2026-08-20T00:00:00Z",
    endsAt: "2026-10-15T23:59:59Z",
    submissions: [
      ["creator1@wavy.test", "tiktok", "2026-08-24T18:20:00Z", 3_200],
      ["creator2@wavy.test", "instagram", "2026-08-27T12:45:00Z", 11_800],
      ["creator1@wavy.test", "instagram", "2026-09-01T20:10:00Z", 24_500],
      ["creator2@wavy.test", "tiktok", "2026-09-03T16:35:00Z", 7_600],
    ],
  },
  {
    title: "Indie Game Release Clips",
    platforms: ["youtube", "tiktok"] as const,
    payoutPer1kViews: 700,
    totalBudget: 480_000,
    startsAt: "2026-08-10T00:00:00Z",
    endsAt: "2026-11-01T23:59:59Z",
    submissions: [
      ["creator2@wavy.test", "youtube", "2026-08-15T14:30:00Z", 18_400],
      ["creator1@wavy.test", "tiktok", "2026-08-21T19:05:00Z", 5_900],
      ["creator2@wavy.test", "youtube", "2026-08-29T11:15:00Z", 32_000],
      ["creator1@wavy.test", "tiktok", "2026-09-02T17:50:00Z", 13_700],
      ["creator2@wavy.test", "tiktok", "2026-09-04T10:25:00Z", 2_100],
    ],
  },
  {
    title: "Fitness Challenge Shorts",
    platforms: ["youtube", "instagram"] as const,
    payoutPer1kViews: 550,
    totalBudget: 260_000,
    startsAt: "2026-08-25T00:00:00Z",
    endsAt: "2026-10-05T23:59:59Z",
    submissions: [
      ["creator1@wavy.test", "instagram", "2026-08-26T07:40:00Z", 4_800],
      ["creator2@wavy.test", "youtube", "2026-08-30T08:10:00Z", 16_200],
      ["creator1@wavy.test", "youtube", "2026-09-01T06:55:00Z", 9_300],
    ],
  },
  {
    title: "Creator Tech Showcase",
    platforms: ["youtube", "instagram"] as const,
    payoutPer1kViews: 1_000,
    totalBudget: 600_000,
    startsAt: "2026-08-05T00:00:00Z",
    endsAt: "2026-12-15T23:59:59Z",
    submissions: [
      ["creator2@wavy.test", "youtube", "2026-08-08T13:20:00Z", 21_500],
      ["creator1@wavy.test", "instagram", "2026-08-18T15:45:00Z", 6_700],
      ["creator2@wavy.test", "instagram", "2026-08-28T18:05:00Z", 14_900],
      ["creator1@wavy.test", "youtube", "2026-09-03T21:30:00Z", 28_600],
      ["creator2@wavy.test", "youtube", "2026-09-04T09:00:00Z", 3_900],
      ["creator1@wavy.test", "instagram", "2026-09-04T12:40:00Z", 10_500],
    ],
  },
] as const;

function metricValues(views: number) {
  return {
    views,
    likes: Math.max(Math.floor(views * 0.08), 1),
    comments: Math.max(Math.floor(views * 0.008), 1),
  };
}

const approvedSubmissionIndexes = new Set([0, 5, 10, 14]);
const rejectedSubmissionIndexes = new Set([2, 7, 12, 17]);
const rejectionReasons = [
  "Clip does not match the campaign brief.",
  "Post does not meet the campaign content requirements.",
  "Clip quality does not meet the campaign requirements.",
  "Incorrect campaign content.",
];

function approvedMetricValues(initialViews: number, day: number) {
  return metricValues(initialViews + day * Math.floor(initialViews * 0.12));
}

async function seed() {
  await database.transaction(async (tx) => {
    await tx.delete(submissionMetrics);
    await tx.delete(submissions);
    await tx.delete(campaigns);

    await tx.insert(users).values(seedUserValues).onConflictDoNothing();

    const existingUsers = await tx
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.role, "creator"),
          eq(users.email, "creator1@wavy.test"),
        ),
      );
    const creator1 = existingUsers[0];
    const [creator2] = await tx
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.role, "creator"),
          eq(users.email, "creator2@wavy.test"),
        ),
      );

    if (!creator1 || !creator2) {
      throw new Error("Seed creator users could not be found.");
    }

    const creators = new Map([
      [creator1.email, creator1.id],
      [creator2.email, creator2.id],
    ]);

    let submissionIndex = 0;
    for (const [campaignIndex, definition] of campaignDefinitions.entries()) {
      const [campaign] = await tx
        .insert(campaigns)
        .values({
          title: definition.title,
          platforms: [...definition.platforms],
          payoutPer1kViews: definition.payoutPer1kViews,
          totalBudget: definition.totalBudget,
          status: "active",
          startsAt: new Date(definition.startsAt),
          endsAt: new Date(definition.endsAt),
        })
        .returning({ id: campaigns.id });

      if (!campaign) {
        throw new Error(`Campaign could not be created: ${definition.title}`);
      }

      for (const [creatorEmail, platform, createdAt, views] of definition.submissions) {
        const creatorId = creators.get(creatorEmail);
        if (!creatorId) throw new Error(`Unknown seed creator: ${creatorEmail}`);
        const isApproved = approvedSubmissionIndexes.has(submissionIndex);
        const isRejected = rejectedSubmissionIndexes.has(submissionIndex);

        const postUrl =
          platform === "tiktok"
            ? `https://www.tiktok.com/@${creatorEmail.split("@")[0]}/video/${campaignIndex}${Date.parse(createdAt)}`
            : platform === "instagram"
            ? `https://www.instagram.com/reel/${campaignIndex}${Date.parse(createdAt)}/`
            : `https://www.youtube.com/watch?v=${campaignIndex}${Date.parse(createdAt).toString(36)}`;

        const [submission] = await tx
          .insert(submissions)
          .values({
            campaignId: campaign.id,
            creatorId,
            postUrl,
            platform,
            status: isApproved ? "approved" : isRejected ? "rejected" : "pending",
            rejectionReason: isRejected
              ? rejectionReasons[submissionIndex % rejectionReasons.length]
              : null,
            createdAt: new Date(createdAt),
            updatedAt: new Date(createdAt),
          })
          .returning({ id: submissions.id });

        if (!submission) throw new Error("Submission could not be created.");

        const metricRows = isApproved
          ? Array.from({ length: 4 }, (_, day) => {
              const date = new Date(createdAt);
              date.setUTCDate(date.getUTCDate() + day);
              return {
                submissionId: submission.id,
                capturedAt: date.toISOString().slice(0, 10),
                ...approvedMetricValues(views, day),
              };
            })
          : [
              {
                submissionId: submission.id,
                capturedAt: createdAt.slice(0, 10),
                ...metricValues(views),
              },
            ];

        await tx.insert(submissionMetrics).values(metricRows);
        submissionIndex += 1;
      }
    }
  });

  console.log("Seed completed. 4 campaigns, 4 approved, 4 rejected, and 10 pending submissions created.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
