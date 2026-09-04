"use client";

import { trpc } from "@/trpc/client";
import { getSubmissionStatusClasses } from "@/lib/submission-status";
import { Calendar, Eye } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";

function formatCents(value: number) {
  return (value / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function MySubmissions() {
  const me = trpc.auth.me.useQuery();
  const submissions = trpc.submission.mine.useQuery(undefined, {
    enabled: me.data?.role === "creator",
  });

  if (me.isPending || me.data?.role !== "creator") {
    return null;
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      <div>
        <h2 className="font-medium">My Submissions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your submitted clips and estimated earnings.
        </p>
      </div>

      {submissions.isPending ? (
        <p className="text-sm text-muted-foreground">Loading submissions...</p>
      ) : submissions.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load submissions: {submissions.error.message}
        </p>
      ) : submissions.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t submitted any clips yet.
        </p>
      ) : (
        <div className="space-y-3">
          {submissions.data.map((submission) => (
            <article key={submission.id} className="rounded-lg border bg-background/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{submission.campaignTitle}</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <PlatformIcon platform={submission.platform} />
                    <span className="capitalize">{submission.platform}</span>
                    <Eye className="size-4" aria-hidden="true" />
                    <span>{submission.currentViews.toLocaleString()} views</span>
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-1 text-xs ${getSubmissionStatusClasses(submission.status)}`}
                >
                  {submission.status}
                </span>
              </div>

              <a
                className="mt-3 block truncate text-sm underline"
                href={submission.postUrl}
                target="_blank"
                rel="noreferrer"
              >
                {submission.postUrl}
              </a>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div className="rounded-md border border-emerald-400/20 bg-emerald-950/20 px-3 py-2">
                  <span className="block text-xs text-muted-foreground">
                    Estimated Earnings
                  </span>
                  <strong className="mt-1 block text-lg text-emerald-300">
                    {formatCents(submission.estimatedEarningsCents)}
                  </strong>
                </div>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="size-4" aria-hidden="true" />
                  Submitted {new Date(submission.createdAt).toLocaleDateString()}
                </p>
              </div>

              {submission.rejectionReason && (
                <p className="mt-3 text-sm text-rose-300">
                  Rejection reason: {submission.rejectionReason}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
