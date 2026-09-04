import { and, asc, desc, eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";

import { database } from "@/server/db/client";
import { generateNextMetric } from "@/server/db/metrics";
import { submissionMetrics, submissions } from "@/server/db/schema";

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
  const [existing] = await db
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

  const [previous] = await db
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

  await db
    .insert(submissionMetrics)
    .values({
      submissionId: submission.id,
      capturedAt,
      ...generateNextMetric(previous),
    })
    .onConflictDoNothing({
      target: [submissionMetrics.submissionId, submissionMetrics.capturedAt],
    });

  return "inserted" as const;
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
