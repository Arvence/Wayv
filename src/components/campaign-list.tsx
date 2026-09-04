"use client";

import { useState } from "react";

import { campaignStatuses } from "@/schemas/campaign";
import { trpc } from "@/trpc/client";
import { CampaignForm } from "@/components/campaign-form";
import { SubmissionForm } from "@/components/submission-form";

const statusLabels: Record<(typeof campaignStatuses)[number], string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

function formatCents(value: number) {
  return (value / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CampaignList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof campaignStatuses)[number] | "">("");
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [submittingCampaign, setSubmittingCampaign] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const me = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const campaigns = trpc.campaign.list.useQuery(
    {
      page,
      pageSize: 25,
      search,
      status: me.data?.role === "admin" ? status || undefined : undefined,
    },
    { enabled: me.data?.role === "admin" || me.data?.role === "creator" },
  );
  const createCampaign = trpc.campaign.create.useMutation({
    onSuccess: async () => {
      setIsCreating(false);
      await utils.campaign.list.invalidate();
    },
  });
  const updateCampaign = trpc.campaign.update.useMutation({
    onSuccess: async () => {
      setEditingCampaign(null);
      await utils.campaign.list.invalidate();
    },
  });
  const submitClip = trpc.submission.create.useMutation({
    onSuccess: async () => {
      setSubmittingCampaign(null);
      await utils.submission.mine.invalidate();
    },
  });

  if (me.isPending) {
    return <p className="text-sm text-muted-foreground">Loading account...</p>;
  }

  if (!me.data) {
    return <p className="text-sm text-muted-foreground">Please sign in to view campaigns.</p>;
  }
  const isAdmin = me.data.role === "admin";

  const campaignTable = (adminView: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Platforms</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Budget</th>
            <th className="px-3 py-2 font-medium">Dates</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.data?.items.map((campaign) => (
            <tr key={campaign.id} className="border-b last:border-0">
              <td className="px-3 py-3 font-medium">{campaign.title}</td>
              <td className="px-3 py-3 capitalize">{campaign.platforms.join(", ")}</td>
              <td className="px-3 py-3">{statusLabels[campaign.status]}</td>
              <td className="px-3 py-3">{formatCents(campaign.totalBudget)}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                {new Date(campaign.startsAt).toLocaleDateString()} -{" "}
                {new Date(campaign.endsAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-3">
                {adminView ? (
                  <button
                    className="rounded-md border px-3 py-1"
                    type="button"
                    onClick={() => setEditingCampaign(campaign.id)}
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    className="rounded-md border px-3 py-1 cursor-pointer disabled:opacity-50"
                    type="button"
                    onClick={() => setSubmittingCampaign(campaign.id)}
                  >
                    Submit clip
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const campaignState = () =>
    campaigns.isPending ? (
      <p className="text-sm text-muted-foreground">Loading campaigns...</p>
    ) : campaigns.isError ? (
      <p className="text-sm text-destructive" role="alert">
        Could not load campaigns: {campaigns.error.message}
      </p>
    ) : campaigns.data.items.length === 0 ? (
      <p className="text-sm text-muted-foreground">No campaigns found.</p>
    ) : (
      campaignTable(isAdmin)
    );

  const adminView = () => (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-medium">Campaigns</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage and review all campaigns.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={() => setIsCreating(true)}
            type="button"
          >
            New campaign
          </button>
          <label className="text-sm">
            <span className="sr-only">Search campaigns</span>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 sm:w-56"
              placeholder="Search by title"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="sr-only">Filter by status</span>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 sm:w-36"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as (typeof campaignStatuses)[number] | "")
              }
            >
              <option value="">All statuses</option>
              {campaignStatuses.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {isCreating && (
        <CampaignForm
          isPending={createCampaign.isPending}
          onCancel={() => setIsCreating(false)}
          onSubmit={(values) => createCampaign.mutate(values)}
        />
      )}
      {createCampaign.isError && <p className="text-sm text-destructive" role="alert">Could not create campaign: {createCampaign.error.message}</p>}
      {updateCampaign.isError && <p className="text-sm text-destructive" role="alert">Could not update campaign: {updateCampaign.error.message}</p>}
      {campaignState()}
      {editingCampaign && campaigns.data && (
        <CampaignForm
          initialValues={{
            ...campaigns.data.items.find((campaign) => campaign.id === editingCampaign)!,
            startsAt: new Date(campaigns.data.items.find((campaign) => campaign.id === editingCampaign)!.startsAt),
            endsAt: new Date(campaigns.data.items.find((campaign) => campaign.id === editingCampaign)!.endsAt),
          }}
          isPending={updateCampaign.isPending}
          onCancel={() => setEditingCampaign(null)}
          onSubmit={(values) => updateCampaign.mutate({ id: editingCampaign, ...values })}
        />
      )}
    </>
  );

  const creatorView = () => (
    <>
      <div>
        <h2 className="font-medium">Campaigns</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse active campaigns and submit your clips.
        </p>
      </div>
      {submitClip.isError && (
        <p className="text-sm text-destructive" role="alert">
          Could not submit clip: {submitClip.error.message}
        </p>
      )}
      {submitClip.isSuccess && (
        <p className="text-sm text-green-600" role="status">
          Clip submitted successfully.
        </p>
      )}
      {campaignState()}
      {submittingCampaign && campaigns.data && (
        <SubmissionForm
          campaignId={submittingCampaign}
          platforms={
            campaigns.data.items.find((campaign) => campaign.id === submittingCampaign)?.platforms ?? []
          }
          isPending={submitClip.isPending}
          onCancel={() => setSubmittingCampaign(null)}
          onSubmit={(values) => submitClip.mutate(values)}
        />
      )}
    </>
  );

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      {isAdmin ? adminView() : creatorView()}
      {campaigns.data && campaigns.data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            className="rounded-md border px-3 py-1 disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
            type="button"
          >
            Previous
          </button>
          <span>Page {campaigns.data.page} of {campaigns.data.totalPages}</span>
          <button
            className="rounded-md border px-3 py-1 disabled:opacity-50"
            disabled={page >= campaigns.data.totalPages}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
