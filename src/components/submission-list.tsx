"use client";

import { useState } from "react";

import { submissionStatuses } from "@/schemas/submission";
import { trpc } from "@/trpc/client";

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
          Could not approve submission: {approve.error.message}
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Campaign</th>
                <th className="px-3 py-2 font-medium">Creator</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Post URL</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Submitted At</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.data.map((submission) => (
                <tr key={submission.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium">{submission.campaignTitle}</td>
                  <td className="px-3 py-3">{submission.creatorEmail}</td>
                  <td className="px-3 py-3 capitalize">{submission.platform}</td>
                  <td className="max-w-56 truncate px-3 py-3">
                    <a className="underline" href={submission.postUrl} target="_blank" rel="noreferrer">
                      {submission.postUrl}
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {statusLabels[submission.status]}
                    </span>
                    {submission.rejectionReason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {submission.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {new Date(submission.createdAt).toLocaleString()}
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
    </section>
  );
}
