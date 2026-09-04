"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  submissionFormSchema,
  type SubmissionFormInput,
  type SubmissionFormValues,
} from "@/schemas/submission";

type SubmissionFormProps = {
  campaignId: string;
  platforms: readonly SubmissionFormValues["platform"][];
  isPending: boolean;
  onSubmit: (values: SubmissionFormValues) => void;
  onCancel: () => void;
};

export function SubmissionForm({
  campaignId,
  platforms,
  isPending,
  onSubmit,
  onCancel,
}: SubmissionFormProps) {
  const form = useForm<SubmissionFormInput, undefined, SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: { campaignId, postUrl: "", platform: platforms[0] ?? "tiktok" },
  });
  const errors = form.formState.errors;

  return (
    <form
      className="space-y-3 rounded-lg border bg-background p-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <h3 className="font-medium">Submit clip</h3>
      <label className="block text-sm">
        <span className="font-medium">Post URL</span>
        <input
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-foreground"
          placeholder="https://..."
          {...form.register("postUrl")}
        />
        {errors.postUrl && (
          <span className="text-destructive">{errors.postUrl.message}</span>
        )}
      </label>
      <label className="block text-sm">
        <span className="font-medium">Platform</span>
        <select
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-foreground [color-scheme:dark]"
          {...form.register("platform")}
        >
          {platforms.map((platform) => (
            <option className="bg-background text-foreground" key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
        {errors.platform && (
          <span className="text-destructive">{errors.platform.message}</span>
        )}
      </label>
      <div className="flex gap-2">
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? "Submitting..." : "Submit clip"}
        </button>
        <button
          type="button"
          className="rounded-md border px-4 py-2"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
