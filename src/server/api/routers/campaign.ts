import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { adminProcedure, createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { campaigns, submissionMetrics, submissions, users } from "@/server/db/schema";
import { calculatePayoutCents } from "@/server/payout";
import {
  calculateTotalApprovedViews,
  getLatestCumulativeApprovedViews,
  getLatestActiveDailyViews,
} from "@/lib/approved-views";
import {
  campaignFormSchema,
  campaignListInputSchema,
  campaignUpdateInputSchema,
  campaignDetailInputSchema,
} from "@/schemas/campaign";

export const campaignRouter = createTRPCRouter({
  list: protectedProcedure
    .input(campaignListInputSchema)
    .query(async ({ ctx, input }) => {
      const whereClauses = [];

      if (input.search) {
        whereClauses.push(ilike(campaigns.title, `%${input.search}%`));
      }

      if (input.status) {
        whereClauses.push(eq(campaigns.status, input.status));
      }

      if (ctx.user.role === "creator") {
        whereClauses.push(eq(campaigns.status, "active"));
      }

      const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

      const [totalResult] = await ctx.database
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(where);

      const items = await ctx.database
        .select()
        .from(campaigns)
        .where(where)
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)
        .orderBy(campaigns.createdAt);

      const total = Number(totalResult.count);

      return {
        items,
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / input.pageSize), 1),
      };
    }),
  create: adminProcedure
    .input(campaignFormSchema)
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.database
        .insert(campaigns)
        .values(input)
        .returning();

      if (!campaign) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Campaign could not be created.",
        });
      }

      return campaign;
    }),
  update: adminProcedure
    .input(campaignUpdateInputSchema)
    .mutation(async ({ ctx, input }) =>
      ctx.database.transaction(async (tx) => {
        const [currentCampaign] = await tx
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, input.id))
          .for("update")
          .limit(1);

        if (!currentCampaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
        }

        const proposedPayout = input.payoutPer1kViews ?? currentCampaign.payoutPer1kViews;
        const proposedBudget = input.totalBudget ?? currentCampaign.totalBudget;
        const latestMetrics = tx
          .selectDistinctOn([submissionMetrics.submissionId], {
            submissionId: submissionMetrics.submissionId,
            views: submissionMetrics.views,
          })
          .from(submissionMetrics)
          .orderBy(submissionMetrics.submissionId, sql`${submissionMetrics.capturedAt} desc`)
          .as("campaign_update_latest_metric");
        const approved = await tx
          .select({ views: latestMetrics.views })
          .from(submissions)
          .leftJoin(latestMetrics, eq(submissions.id, latestMetrics.submissionId))
          .where(
            and(
              eq(submissions.campaignId, input.id),
              eq(submissions.status, "approved"),
            ),
          );
        const proposedSpend = approved.reduce(
          (total, row) => total + calculatePayoutCents(Number(row.views ?? 0), proposedPayout),
          0,
        );

        if (proposedSpend > proposedBudget) {
          throw new TRPCError({ code: "CONFLICT", message: "CAMPAIGN_BUDGET_CONFLICT" });
        }

        const { id, ...values } = input;
        const [campaign] = await tx
          .update(campaigns)
          .set({
            ...values,
            status:
              proposedSpend === proposedBudget
                ? "completed"
                : values.status ?? currentCampaign.status,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, id))
          .returning();

        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
        }
        return campaign;
      }),
    ),

  detail: adminProcedure
    .input(campaignDetailInputSchema)
    .query(async ({ ctx, input }) => {
      const [campaign] = await ctx.database
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.campaignId))
        .limit(1);

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
      }

      const latestMetrics = ctx.database
        .selectDistinctOn([submissionMetrics.submissionId], {
          submissionId: submissionMetrics.submissionId,
          views: submissionMetrics.views,
        })
        .from(submissionMetrics)
        .orderBy(submissionMetrics.submissionId, sql`${submissionMetrics.capturedAt} desc`)
        .as("campaign_latest_metric");

      const rows = await ctx.database
        .select({
          id: submissions.id,
          creatorEmail: users.email,
          platform: submissions.platform,
          status: submissions.status,
          postUrl: submissions.postUrl,
          views: sql<number>`coalesce(${latestMetrics.views}, 0)`,
          createdAt: submissions.createdAt,
        })
        .from(submissions)
        .innerJoin(users, eq(submissions.creatorId, users.id))
        .leftJoin(latestMetrics, eq(submissions.id, latestMetrics.submissionId))
        .where(eq(submissions.campaignId, campaign.id))
        .orderBy(desc(submissions.createdAt));

      const approvedMetricRows = await ctx.database
        .select({
          submissionId: submissionMetrics.submissionId,
          capturedAt: submissionMetrics.capturedAt,
          views: submissionMetrics.views,
        })
        .from(submissionMetrics)
        .innerJoin(submissions, eq(submissionMetrics.submissionId, submissions.id))
        .where(
          and(
            eq(submissions.campaignId, campaign.id),
            eq(submissions.status, "approved"),
          ),
        );

      const spentCents = rows
        .filter((submission) => submission.status === "approved")
        .reduce(
          (total, submission) =>
            total + calculatePayoutCents(submission.views, campaign.payoutPer1kViews),
          0,
        );

      const dailyViewsMap = new Map<string, number>();
      for (const metric of approvedMetricRows) {
        dailyViewsMap.set(
          metric.capturedAt,
          (dailyViewsMap.get(metric.capturedAt) ?? 0) + Number(metric.views),
        );
      }

      const startDate = new Date(campaign.startsAt);
      const endDate = new Date(campaign.endsAt);
      const dailyViews: { date: string; views: number }[] = [];
      const currentDate = new Date(
        Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
      );
      const lastDate = new Date(
        Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
      );

      while (currentDate <= lastDate) {
        const date = currentDate.toISOString().slice(0, 10);
        dailyViews.push({ date, views: dailyViewsMap.get(date) ?? 0 });
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      const { latest: latestDailyViews, previous: previousDailyViews } =
        getLatestActiveDailyViews(dailyViews);
      const {
        latest: latestApprovedViewsTotal,
        previous: previousApprovedViewsTotal,
      } = getLatestCumulativeApprovedViews(approvedMetricRows);

      return {
        campaign,
        submissions: rows.map((submission) => ({
          ...submission,
          estimatedPayoutCents: calculatePayoutCents(
            submission.views,
            campaign.payoutPer1kViews,
          ),
        })),
        spentCents,
        remainingCents: campaign.totalBudget - spentCents,
        totalApprovedViews: calculateTotalApprovedViews(rows),
        dailyViews,
        latestDailyViews,
        previousDailyViews,
        latestApprovedViewsTotal,
        previousApprovedViewsTotal,
      };
    }),
});
