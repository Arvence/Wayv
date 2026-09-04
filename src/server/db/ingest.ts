import { and, asc, desc, eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";

import { database } from "@/server/db/client";
import { generateNextMetric } from "@/server/db/metrics";
import { campaigns, submissionMetrics, submissions } from "@/server/db/schema";
import { calculatePayoutCents } from "@/server/payout";

type ApprovedSubmission = typeof submissions.$inferSelect;

export function parseIngestionDate(args: string[]) {
  const value = args.find((arg) => arg.startsWith("--date="))?.slice("--date=".length);
  const date = value ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (parsed.toISOString().slice(0, 10) !== date) {
    throw new Error("Date must be a real calendar date.");
  }

  return date;
}

export async function processApprovedSubmission(
  db: typeof database,
  submission: ApprovedSubmission,
  capturedAt: string,
) {
  return db.transaction(async (tx) => {
  const [existing] = await tx
    .select({ id: submissionMetrics.id })
    .from(submissionMetrics)
    .where(
      and(
        eq(submissionMetrics.submissionId, submission.id),
        eq(submissionMetrics.capturedAt, capturedAt),
      ),
    )
    .limit(1);

  if (existing) {
    return "skipped" as const;
  }

  const [previous] = await tx
    .select({
      views: submissionMetrics.views,
      likes: submissionMetrics.likes,
      comments: submissionMetrics.comments,
    })
    .from(submissionMetrics)
    .where(eq(submissionMetrics.submissionId, submission.id))
    .orderBy(desc(submissionMetrics.capturedAt))
    .limit(1);

  if (!previous) {
    throw new Error("No previous metric exists.");
  }

  const [campaign] = await tx
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, submission.campaignId))
    .for("update")
    .limit(1);
  if (!campaign) throw new Error("Campaign not found.");

  const latestMetrics = tx
    .selectDistinctOn([submissionMetrics.submissionId], {
      submissionId: submissionMetrics.submissionId,
      views: submissionMetrics.views,
    })
    .from(submissionMetrics)
    .orderBy(submissionMetrics.submissionId, desc(submissionMetrics.capturedAt))
    .as("ingest_latest_metric");
  const approved = await tx
    .select({ submissionId: submissions.id, views: latestMetrics.views })
    .from(submissions)
    .leftJoin(latestMetrics, eq(submissions.id, latestMetrics.submissionId))
    .where(and(eq(submissions.campaignId, campaign.id), eq(submissions.status, "approved")));
  const generated = generateNextMetric(previous);
  const otherSpend = approved
    .filter((row) => row.submissionId !== submission.id)
    .reduce(
      (total, row) =>
        total + calculatePayoutCents(Number(row.views ?? 0), campaign.payoutPer1kViews),
      0,
    );
  const available = Math.max(campaign.totalBudget - otherSpend, 0);
  const maxAffordableViews =
    campaign.payoutPer1kViews === 0
      ? generated.views
      : Math.floor(available / campaign.payoutPer1kViews) * 1_000;
  const safeViews = Math.max(
    Number(previous.views),
    Math.min(generated.views, maxAffordableViews),
  );

  await tx
    .insert(submissionMetrics)
    .values({
      submissionId: submission.id,
      capturedAt,
      ...generated,
      views: safeViews,
    })
    .onConflictDoNothing({
      target: [submissionMetrics.submissionId, submissionMetrics.capturedAt],
    });

  const spent = approved.reduce((total, row) => {
    const views = row.submissionId === submission.id ? safeViews : Number(row.views ?? 0);
    return total + calculatePayoutCents(views, campaign.payoutPer1kViews);
  }, 0);
  if (spent === campaign.totalBudget) {
    await tx.update(campaigns).set({ status: "completed" }).where(eq(campaigns.id, campaign.id));
  }
  return "inserted" as const;
  });
}

async function ingest() {
  const capturedAt = parseIngestionDate(process.argv.slice(2));
  const approved = await database
    .select()
    .from(submissions)
    .where(eq(submissions.status, "approved"))
    .orderBy(asc(submissions.createdAt));

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Ingesting metrics for ${capturedAt}...`);
  for (const submission of approved) {
    try {
      const result = await processApprovedSubmission(database, submission, capturedAt);
      if (result === "inserted") {
        inserted += 1;
        console.log(`✓ ${submission.id} inserted`);
      } else {
        skipped += 1;
        console.log(`- ${submission.id} skipped: metric already exists`);
      }
    } catch (error) {
      failed += 1;
      console.error(`✗ ${submission.id} failed:`, error);
    }
  }

  console.log(`Ingest complete:\nInserted: ${inserted}\nSkipped: ${skipped}\nFailed: ${failed}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ingest().catch((error) => {
    console.error(`Ingest failed: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
