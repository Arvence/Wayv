"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  campaignFormSchema,
  campaignPlatforms,
  campaignStatuses,
  type CampaignFormInput,
  type CampaignFormValues,
} from "@/schemas/campaign";

type CampaignFormProps = {
  initialValues?: CampaignFormValues & { id: string };
  onSubmit: (values: CampaignFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
};

const defaultValues: CampaignFormValues = {
  title: "",
  platforms: [],
  payoutPer1kViews: 0,
  totalBudget: 0,
  status: "draft",
  startsAt: new Date(),
  endsAt: new Date(Date.now() + 86_400_000),
};

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 16);
}

export function CampaignForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
}: CampaignFormProps) {
  const form = useForm<CampaignFormInput, undefined, CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: initialValues ?? defaultValues,
  });
  const errors = form.formState.errors;

  return (
    <form
      className="space-y-4 rounded-lg border bg-background p-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <h3 className="font-medium">{initialValues ? "Edit campaign" : "Create campaign"}</h3>

      <label className="block text-sm">
        <span className="font-medium">Title</span>
        <input className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 placeholder:text-slate-500" {...form.register("title")} />
        {errors.title && <span className="text-destructive">{errors.title.message}</span>}
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Platforms</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {campaignPlatforms.map((platform) => (
            <label key={platform} className="flex items-center gap-2 text-sm capitalize">
              <input type="checkbox" value={platform} {...form.register("platforms")} />
              {platform}
            </label>
          ))}
        </div>
        {errors.platforms && <span className="text-sm text-destructive">{errors.platforms.message}</span>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Payout per 1k views (cents)</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 placeholder:text-slate-500"
            type="number"
            min="0"
            {...form.register("payoutPer1kViews", { valueAsNumber: true })}
          />
          {errors.payoutPer1kViews && (
            <span className="text-destructive">{errors.payoutPer1kViews.message}</span>
          )}
        </label>
        <label className="block text-sm">
          <span className="font-medium">Total budget (cents)</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 placeholder:text-slate-500"
            type="number"
            min="0"
            {...form.register("totalBudget", { valueAsNumber: true })}
          />
          {errors.totalBudget && <span className="text-destructive">{errors.totalBudget.message}</span>}
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium">Status</span>
        <select
          className="mt-1 w-full appearance-auto rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 [color-scheme:light]"
          {...form.register("status")}
        >
          {campaignStatuses.map((status) => (
            <option className="bg-slate-100 text-slate-900" key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {errors.status && <span className="text-destructive">{errors.status.message}</span>}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Starts at</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-100"
            type="datetime-local"
            defaultValue={dateInputValue(initialValues?.startsAt ?? defaultValues.startsAt)}
            {...form.register("startsAt", { valueAsDate: true })}
          />
          {errors.startsAt && <span className="text-destructive">{errors.startsAt.message}</span>}
        </label>
        <label className="block text-sm">
          <span className="font-medium">Ends at</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-100"
            type="datetime-local"
            defaultValue={dateInputValue(initialValues?.endsAt ?? defaultValues.endsAt)}
            {...form.register("endsAt", { valueAsDate: true })}
          />
          {errors.endsAt && <span className="text-destructive">{errors.endsAt.message}</span>}
        </label>
      </div>

      <div className="flex gap-2">
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={isPending}>
          {isPending ? "Saving..." : initialValues ? "Save changes" : "Create campaign"}
        </button>
        <button type="button" className="rounded-md border px-4 py-2" onClick={onCancel} disabled={isPending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
