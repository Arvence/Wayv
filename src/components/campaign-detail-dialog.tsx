"use client";

import { trpc } from "@/trpc/client";
import { getSubmissionStatusClasses } from "@/lib/submission-status";
import { calculateBudgetPercentage } from "@/lib/budget-impact";
import { Calendar, Eye } from "lucide-react";

function formatCents(value: number) {
  return (value / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getBudgetHealthClasses(percent: number, type: "spent" | "remaining") {
  const isHealthy =
    type === "spent" ? percent <= 50 : percent >= 50;
  const isRisky =
    type === "spent" ? percent > 80 : percent < 20;

  if (isRisky) {
    return "border-rose-400/20 bg-rose-950/20 text-rose-300";
  }
  if (!isHealthy) {
    return "border-amber-400/20 bg-amber-950/20 text-amber-300";
  }
  return "border-emerald-400/20 bg-emerald-950/20 text-emerald-300";
}

function getCampaignStatusClasses(status: string) {
  if (status === "active") {
    return "border-emerald-400/30 bg-emerald-950/40 text-emerald-300";
  }
  if (status === "paused") {
    return "border-amber-400/30 bg-amber-950/40 text-amber-300";
  }
  if (status === "completed") {
    return "border-sky-400/30 bg-sky-950/40 text-sky-300";
  }
  return "border-slate-400/30 bg-slate-950/40 text-slate-300";
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "instagram") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect width="18" height="18" x="3" y="3" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    );
  }

  if (platform === "youtube") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.6 7.2a2.9 2.9 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.9 2.9 0 0 0-2 2C2 9 2 12 2 12s0 3 .4 4.8a2.9 2.9 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.9 2.9 0 0 0 2-2c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" />
      </svg>
    );
  }

  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.6 3c.2 1.7 1.1 2.7 2.8 2.8v2.6a7 7 0 0 1-2.8-.7v5.8a5.5 5.5 0 1 1-4.8-5.5v2.7a2.8 2.8 0 1 0 2.1 2.8V3h2.7Z" />
    </svg>
  );
}

type CampaignDetailDialogProps = {
  campaignId: string | null;
  onClose: () => void;
};

export function CampaignDetailDialog({
  campaignId,
  onClose,
}: CampaignDetailDialogProps) {
  const detail = trpc.campaign.detail.useQuery(
    { campaignId: campaignId ?? "" },
    { enabled: campaignId !== null },
  );

  if (!campaignId) return null;

  const sortedSubmissions = detail.data
    ? [...detail.data.submissions].sort((first, second) => {
        const firstImpact = calculateBudgetPercentage(
          first.estimatedPayoutCents,
          detail.data.campaign.totalBudget,
        );
        const secondImpact = calculateBudgetPercentage(
          second.estimatedPayoutCents,
          detail.data.campaign.totalBudget,
        );

        if (secondImpact !== firstImpact) return secondImpact - firstImpact;
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
      })
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 id="campaign-detail-title" className="text-lg font-semibold">
              {detail.data?.campaign.title ?? "Campaign Details"}
            </h2>
            {detail.data?.campaign.status && (
              <span
                className={`rounded-full border px-2 py-1 text-xs capitalize ${getCampaignStatusClasses(
                  detail.data.campaign.status,
                )}`}
              >
                {detail.data.campaign.status}
              </span>
            )}
          </div>
          <button className="rounded-md border px-3 py-1" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {detail.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading campaign details...</p>
        ) : detail.isError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            Could not load campaign details: {detail.error.message}
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                {detail.data.campaign.platforms.map((platform) => (
                  <span key={platform} className="inline-flex items-center gap-1">
                    <PlatformIcon platform={platform} />
                    <span className="capitalize">{platform}</span>
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Calendar className="size-4" aria-hidden="true" />
                {new Date(detail.data.campaign.startsAt).toLocaleDateString()} -{" "}
                {new Date(detail.data.campaign.endsAt).toLocaleDateString()}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <p className="rounded-md border p-3 text-sm">
                <span className="block text-muted-foreground">Payout / 1k views</span>
                <strong>{formatCents(detail.data.campaign.payoutPer1kViews)}</strong>
              </p>
              <p className="rounded-md border p-3 text-sm">
                <span className="block text-muted-foreground">Total budget</span>
                <strong>{formatCents(detail.data.campaign.totalBudget)}</strong>
              </p>
              <p
                className={`rounded-md border p-3 text-sm ${getBudgetHealthClasses(
                  calculateBudgetPercentage(
                    detail.data.spentCents,
                    detail.data.campaign.totalBudget,
                  ),
                  "spent",
                )}`}
              >
                <span className="block text-muted-foreground">Spent</span>
                <strong>{formatCents(detail.data.spentCents)}</strong>
                <span className="mt-1 block text-xs">
                  {calculateBudgetPercentage(
                    detail.data.spentCents,
                    detail.data.campaign.totalBudget,
                  ).toFixed(1)}%
                </span>
              </p>
              <p
                className={`rounded-md border p-3 text-sm ${getBudgetHealthClasses(
                  calculateBudgetPercentage(
                    detail.data.remainingCents,
                    detail.data.campaign.totalBudget,
                  ),
                  "remaining",
                )}`}
              >
                <span className="block text-muted-foreground">Remaining</span>
                <strong>{formatCents(detail.data.remainingCents)}</strong>
                <span className="mt-1 block text-xs">
                  {calculateBudgetPercentage(
                    detail.data.remainingCents,
                    detail.data.campaign.totalBudget,
                  ).toFixed(1)}%
                </span>
              </p>
            </div>

            <div>
              <h3 className="font-medium">Submissions ({sortedSubmissions.length})</h3>
              {sortedSubmissions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No submissions found.</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {sortedSubmissions.map((submission) => (
                    <div key={submission.id} className="rounded-lg border bg-background/40 p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{submission.creatorEmail}</span>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs ${getSubmissionStatusClasses(submission.status)}`}
                        >
                          {submission.status}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                        <PlatformIcon platform={submission.platform} />
                        <span className="capitalize">{submission.platform}</span>
                        <span aria-hidden="true">·</span>
                        <Eye className="size-4" aria-hidden="true" />
                        <span>{submission.views.toLocaleString()} views</span>
                      </p>
                      <a
                        className="mt-3 block truncate underline"
                        href={submission.postUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {submission.postUrl}
                      </a>
                      {submission.status === "rejected" ? (
                        <p className="mt-3 text-muted-foreground">No budget impact</p>
                      ) : (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-md border border-slate-400/20 bg-slate-950/30 p-3">
                            <span className="block text-xs text-muted-foreground">
                              Estimated Payout
                            </span>
                            <strong className="mt-1 block text-base">
                              {formatCents(submission.estimatedPayoutCents)}
                            </strong>
                          </div>
                          <div className="rounded-md border border-emerald-400/20 bg-emerald-950/20 p-3">
                            <span className="block text-xs text-muted-foreground">
                              {submission.status === "pending"
                                ? "Potential Impact"
                                : "Budget Impact"}
                            </span>
                            <strong className="mt-1 block text-base text-emerald-300">
                              {calculateBudgetPercentage(
                                submission.estimatedPayoutCents,
                                detail.data.campaign.totalBudget,
                              ).toFixed(1)}
                              %
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
