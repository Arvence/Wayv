"use client";

import { useState } from "react";

import { submissionStatuses } from "@/schemas/submission";
import { trpc } from "@/trpc/client";
import { CampaignDetailDialog } from "@/components/campaign-detail-dialog";
import { getSubmissionStatusClasses } from "@/lib/submission-status";
import { calculateBudgetImpactPercent } from "@/lib/budget-impact";
import { Calendar, Eye } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";

const statusLabels: Record<(typeof submissionStatuses)[number], string> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  paid: "paid",
};

export function SubmissionList() {
  const [status, setStatus] = useState<(typeof submissionStatuses)[number] | "">("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [detailCampaign, setDetailCampaign] = useState<string | null>(null);
  const me = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const submissions = trpc.submission.list.useQuery(
    { status: status || undefined },
    { enabled: me.data?.role === "admin" },
  );
  const approve = trpc.submission.approve.useMutation({
    onSuccess: async () => utils.submission.list.invalidate(),
  });
  const reject = trpc.submission.reject.useMutation({
    onSuccess: async () => {
      setRejectingId(null);
      setReason("");
      await utils.submission.list.invalidate();
    },
  });

  if (me.isPending || me.data?.role !== "admin") {
    return null;
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-medium">Submission review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review creator submissions.
          </p>
        </div>
        <label className="text-sm">
          <span className="sr-only">Filter submissions by status</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as (typeof submissionStatuses)[number] | "")
            }
          >
            <option value="">All</option>
            {submissionStatuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {approve.isError && (
        <p className="text-sm text-destructive" role="alert">
          {approve.error.data?.code === "CONFLICT" &&
          approve.error.message.includes("BUDGET_EXCEEDED")
            ? "This campaign does not have enough remaining budget to approve this submission."
            : `Could not approve submission: ${approve.error.message}`}
        </p>
      )}
      {reject.isError && (
        <p className="text-sm text-destructive" role="alert">
          Could not reject submission: {reject.error.message}
        </p>
      )}
      {submissions.isPending ? (
        <p className="text-sm text-muted-foreground">Loading submissions...</p>
      ) : submissions.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load submissions: {submissions.error.message}
        </p>
      ) : submissions.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions found.</p>
      ) : (
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Campaign</th>
                <th className="px-3 py-2 font-medium">Creator</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Post URL</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Views</th>
                <th className="px-3 py-2 font-medium">Estimated Payout</th>
                <th className="px-3 py-2 font-medium">Budget Impact</th>
                <th className="px-3 py-2 font-medium">Submitted At</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.data.map((submission) => (
                <tr key={submission.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium">
                    <button
                      className="cursor-pointer underline"
                      type="button"
                      onClick={() => setDetailCampaign(submission.campaignId)}
                    >
                      {submission.campaignTitle}
                    </button>
                  </td>
                  <td className="px-3 py-3">{submission.creatorEmail}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 capitalize">
                      <PlatformIcon platform={submission.platform} />
                      {submission.platform}
                    </span>
                  </td>
                  <td className="max-w-56 truncate px-3 py-3">
                    <a className="underline" href={submission.postUrl} target="_blank" rel="noreferrer">
                      {submission.postUrl}
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs ${getSubmissionStatusClasses(submission.status)}`}
                    >
                      {statusLabels[submission.status]}
                    </span>
                    {submission.rejectionReason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {submission.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-4" aria-hidden="true" />
                      {submission.currentViews.toLocaleString()}
                    </span>
                    {submission.metricCapturedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.metricCapturedAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {(submission.estimatedPayoutCents / 100).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {submission.status !== "pending" && submission.status !== "approved" ? (
                      "—"
                    ) : (() => {
                        const impact = calculateBudgetImpactPercent(
                          submission.estimatedPayoutCents,
                          submission.totalBudget,
                        );

                        const fitsBudget = submission.status === "approved" ||
                          submission.estimatedPayoutCents <=
                          submission.remainingBudgetCents;
                        return (
                          <span
                            className={
                              fitsBudget
                                ? "rounded-md border border-emerald-400/30 bg-emerald-950/40 px-2 py-1 text-emerald-300"
                                : "rounded-md border border-rose-400/30 bg-rose-950/40 px-2 py-1 text-rose-300"
                            }
                          >
                            {impact.toFixed(1)}%
                          </span>
                        );
                      })()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-4" aria-hidden="true" />
                      {new Date(submission.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {submission.status === "pending" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            className="rounded-md border px-3 py-1 disabled:opacity-50"
                            type="button"
                            disabled={approve.isPending || reject.isPending}
                            onClick={() => approve.mutate({ submissionId: submission.id })}
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-md border px-3 py-1 disabled:opacity-50"
                            type="button"
                            disabled={approve.isPending || reject.isPending}
                            onClick={() => setRejectingId(submission.id)}
                          >
                            Reject
                          </button>
                        </div>
                        {rejectingId === submission.id && (
                          <div className="space-y-2">
                            <textarea
                              className="w-full rounded-md border px-2 py-1"
                              placeholder="Rejection reason"
                              value={reason}
                              onChange={(event) => setReason(event.target.value)}
                            />
                            <button
                              className="rounded-md bg-destructive px-3 py-1 text-destructive-foreground disabled:opacity-50"
                              type="button"
                              disabled={reject.isPending || reason.trim().length === 0}
                              onClick={() =>
                                reject.mutate({
                                  submissionId: submission.id,
                                  rejectionReason: reason,
                                })
                              }
                            >
                              {reject.isPending ? "Rejecting..." : "Confirm reject"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CampaignDetailDialog
        campaignId={detailCampaign}
        onClose={() => setDetailCampaign(null)}
      />
    </section>
  );
}
