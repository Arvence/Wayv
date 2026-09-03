import { z } from "zod";

export const campaignStatuses = ["draft", "active", "paused", "completed"] as const;
export const campaignPlatforms = ["tiktok", "instagram", "youtube"] as const;

export const campaignListInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().default(""),
  status: z.enum(campaignStatuses).optional(),
});

export const campaignFormSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    platforms: z.array(z.enum(campaignPlatforms)).min(1),
    payoutPer1kViews: z.coerce.number().int().min(0),
    totalBudget: z.coerce.number().int().min(0),
    status: z.enum(campaignStatuses).default("draft"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((campaign) => campaign.endsAt > campaign.startsAt, {
    message: "End date must be after start date.",
    path: ["endsAt"],
  });

export const campaignUpdateInputSchema = z
  .object({ id: z.string().uuid() })
  .and(campaignFormSchema);

export type CampaignFormInput = z.input<typeof campaignFormSchema>;
export type CampaignFormValues = z.infer<typeof campaignFormSchema>;
