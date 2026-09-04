import { z } from "zod";

import { campaignPlatforms } from "@/schemas/campaign";

export const submissionStatuses = ["pending", "approved", "rejected", "paid"] as const;

export const submissionFormSchema = z.object({
  campaignId: z.string().uuid(),
  postUrl: z.string().trim().url().max(2048),
  platform: z.enum(campaignPlatforms),
}).superRefine(({ postUrl, platform }, context) => {
  const url = new URL(postUrl);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname;
  const valid =
    url.protocol === "http:" || url.protocol === "https:"
      ? platform === "youtube"
        ? (hostname === "youtube.com" && /^\/(watch|shorts)\/?/.test(path) && (path.startsWith("/shorts/") || url.searchParams.has("v"))) ||
          (hostname === "youtu.be" && path.length > 1)
        : platform === "tiktok"
          ? hostname === "tiktok.com" && /^\/@[^/]+\/video\/[^/]+/.test(path)
          : hostname === "instagram.com" && /^\/(p|reel)\/[^/]+/.test(path)
      : false;

  if (!valid) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["postUrl"],
      message: "Enter a valid post URL for the selected platform.",
    });
  }
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
