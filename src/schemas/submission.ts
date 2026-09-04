import { z } from "zod";

import { campaignPlatforms } from "@/schemas/campaign";

export const submissionStatuses = ["pending", "approved", "rejected", "paid"] as const;

export const submissionFormSchema = z.object({
  campaignId: z.string().uuid(),
  postUrl: z.string().trim().url().max(2048),
  platform: z.enum(campaignPlatforms),
});

export const submissionListInputSchema = z.object({
  status: z.enum(submissionStatuses).optional(),
});

export const submissionStatusInputSchema = z.object({
  submissionId: z.string().uuid(),
});

export const submissionRejectInputSchema = submissionStatusInputSchema.extend({
  rejectionReason: z.string().trim().min(1),
});

export const submissionCreateInputSchema = submissionFormSchema;

export type SubmissionFormInput = z.input<typeof submissionFormSchema>;
export type SubmissionFormValues = z.infer<typeof submissionFormSchema>;
