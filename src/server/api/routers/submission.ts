import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { creatorProcedure, adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { campaigns, submissionMetrics, submissions, users } from "@/server/db/schema";
import { generateInitialMetric } from "@/server/db/metrics";
import { calculatePayoutCents, isBudgetAvailable } from "@/server/payout";
import {
  submissionFormSchema,
  submissionListInputSchema,
  submissionRejectInputSchema,
  submissionStatusInputSchema,
} from "@/schemas/submission";

export const submissionRouter = createTRPCRouter({
  create: creatorProcedure
    .input(submissionFormSchema)
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.database
        .select({
          id: campaigns.id,
          platforms: campaigns.platforms,
          status: campaigns.status,
        })
        .from(campaigns)
        .where(eq(campaigns.id, input.campaignId))
        .limit(1);

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found.",
        });
      }

      if (campaign.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Submissions are only allowed for active campaigns.",
        });
      }

      if (!campaign.platforms.includes(input.platform)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This platform is not enabled for the campaign.",
        });
      }

      try {
        const submission = await ctx.database.transaction(async (tx) => {
          const [createdSubmission] = await tx
            .insert(submissions)
            .values({ ...input, creatorId: ctx.user.id })
            .returning();

          if (!createdSubmission) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Submission could not be created.",
            });
          }

          await tx
            .insert(submissionMetrics)
            .values({
              submissionId: createdSubmission.id,
              capturedAt: new Date().toISOString().slice(0, 10),
              ...generateInitialMetric(),
            })
            .onConflictDoNothing({
              target: [submissionMetrics.submissionId, submissionMetrics.capturedAt],
            });

          return createdSubmission;
        });

        return submission;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505" &&
          "constraint" in error &&
          error.constraint === "submission_campaign_post_url_unique"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "DUPLICATE_SUBMISSION_URL",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create submission.",
        });
      }
    }),

  mine: creatorProcedure
    .query(async ({ ctx }) => {
      const latestMetrics = ctx.database
        .selectDistinctOn([submissionMetrics.submissionId], {
          submissionId: submissionMetrics.submissionId,
          views: submissionMetrics.views,
        })
        .from(submissionMetrics)
        .orderBy(submissionMetrics.submissionId, desc(submissionMetrics.capturedAt))
        .as("creator_latest_submission_metric");

      const rows = await ctx.database
        .select({
          id: submissions.id,
          campaignId: submissions.campaignId,
          campaignTitle: campaigns.title,
          platform: submissions.platform,
          postUrl: submissions.postUrl,
          status: submissions.status,
          rejectionReason: submissions.rejectionReason,
          createdAt: submissions.createdAt,
          currentViews: sql<number>`coalesce(${latestMetrics.views}, 0)`,
          payoutPer1kViews: campaigns.payoutPer1kViews,
        })
        .from(submissions)
        .innerJoin(campaigns, eq(submissions.campaignId, campaigns.id))
        .leftJoin(latestMetrics, eq(submissions.id, latestMetrics.submissionId))
        .where(eq(submissions.creatorId, ctx.user.id))
        .orderBy(desc(submissions.createdAt));

      return rows.map((submission) => ({
        ...submission,
        estimatedEarningsCents: calculatePayoutCents(
          submission.currentViews,
          submission.payoutPer1kViews,
        ),
      }));
    }),

  list: adminProcedure
    .input(submissionListInputSchema)
    .query(async ({ ctx, input }) => {
      const latestMetrics = ctx.database
        .selectDistinctOn([submissionMetrics.submissionId], {
          submissionId: submissionMetrics.submissionId,
          views: submissionMetrics.views,
          likes: submissionMetrics.likes,
          comments: submissionMetrics.comments,
          capturedAt: submissionMetrics.capturedAt,
        })
        .from(submissionMetrics)
        .orderBy(submissionMetrics.submissionId, desc(submissionMetrics.capturedAt))
        .as("latest_submission_metric");

      const rows = await ctx.database
        .select({
          id: submissions.id,
          campaignId: submissions.campaignId,
          campaignTitle: campaigns.title,
          creatorId: submissions.creatorId,
          creatorEmail: users.email,
          postUrl: submissions.postUrl,
          platform: submissions.platform,
          status: submissions.status,
          rejectionReason: submissions.rejectionReason,
          createdAt: submissions.createdAt,
          currentViews: sql<number>`coalesce(${latestMetrics.views}, 0)`,
          currentLikes: sql<number>`coalesce(${latestMetrics.likes}, 0)`,
          currentComments: sql<number>`coalesce(${latestMetrics.comments}, 0)`,
          metricCapturedAt: latestMetrics.capturedAt,
          payoutPer1kViews: campaigns.payoutPer1kViews,
          totalBudget: campaigns.totalBudget,
        })
        .from(submissions)
        .innerJoin(campaigns, eq(submissions.campaignId, campaigns.id))
        .innerJoin(users, eq(submissions.creatorId, users.id))
        .leftJoin(
          latestMetrics,
          eq(submissions.id, latestMetrics.submissionId),
        )
        .where(
          input.status ? and(eq(submissions.status, input.status)) : undefined,
        )
        .orderBy(desc(submissions.createdAt));

      const approvedRows = await ctx.database
        .select({
          campaignId: submissions.campaignId,
          currentViews: sql<number>`coalesce(${latestMetrics.views}, 0)`,
          payoutPer1kViews: campaigns.payoutPer1kViews,
        })
        .from(submissions)
        .innerJoin(campaigns, eq(submissions.campaignId, campaigns.id))
        .leftJoin(
          latestMetrics,
          eq(submissions.id, latestMetrics.submissionId),
        )
        .where(eq(submissions.status, "approved"));

      const spentByCampaign = new Map<string, number>();
      for (const submission of approvedRows) {
        const payout = calculatePayoutCents(
          submission.currentViews,
          submission.payoutPer1kViews,
        );
        spentByCampaign.set(
          submission.campaignId,
          (spentByCampaign.get(submission.campaignId) ?? 0) + payout,
        );
      }

      return rows.map((submission) => ({
        ...submission,
        estimatedPayoutCents: calculatePayoutCents(
          submission.currentViews,
          submission.payoutPer1kViews,
        ),
        remainingBudgetCents:
          submission.totalBudget -
          (spentByCampaign.get(submission.campaignId) ?? 0),
      }));
    }),

  approve: adminProcedure
    .input(submissionStatusInputSchema)
    .mutation(async ({ ctx, input }) =>
      ctx.database.transaction(async (tx) => {
        const [initialSubmission] = await tx
          .select({ id: submissions.id, campaignId: submissions.campaignId })
          .from(submissions)
          .where(eq(submissions.id, input.submissionId))
          .limit(1);

        if (!initialSubmission) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found." });
        }

        await tx.execute(
          sql`select id from campaign where id = ${initialSubmission.campaignId} for update`,
        );

        const [submission] = await tx
          .select({ submission: submissions, campaign: campaigns })
          .from(submissions)
          .innerJoin(campaigns, eq(submissions.campaignId, campaigns.id))
          .where(eq(submissions.id, input.submissionId))
          .limit(1);

        if (!submission) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found." });
        }
        if (submission.submission.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending submissions can be approved.",
          });
        }

        const [candidateMetric] = await tx
          .select({ views: submissionMetrics.views })
          .from(submissionMetrics)
          .where(eq(submissionMetrics.submissionId, submission.submission.id))
          .orderBy(desc(submissionMetrics.capturedAt))
          .limit(1);
        const candidatePayoutCents = calculatePayoutCents(
          Number(candidateMetric?.views ?? 0),
          submission.campaign.payoutPer1kViews,
        );

        const latestMetrics = tx
          .selectDistinctOn([submissionMetrics.submissionId], {
            submissionId: submissionMetrics.submissionId,
            views: submissionMetrics.views,
          })
          .from(submissionMetrics)
          .orderBy(
            submissionMetrics.submissionId,
            desc(submissionMetrics.capturedAt),
          )
          .as("approved_latest_metric");
        const approvedSubmissions = await tx
          .select({ views: latestMetrics.views })
          .from(submissions)
          .leftJoin(latestMetrics, eq(submissions.id, latestMetrics.submissionId))
          .where(
            and(
              eq(submissions.campaignId, submission.submission.campaignId),
              eq(submissions.status, "approved"),
            ),
          );
        const spentCents = approvedSubmissions.reduce(
          (total, approved) =>
            total +
            calculatePayoutCents(
              Number(approved.views ?? 0),
              submission.campaign.payoutPer1kViews,
            ),
          0,
        );
        const remainingCents = submission.campaign.totalBudget - spentCents;

        if (!isBudgetAvailable(candidatePayoutCents, spentCents, submission.campaign.totalBudget)) {
          throw new TRPCError({ code: "CONFLICT", message: "BUDGET_EXCEEDED" });
        }

        const [updatedSubmission] = await tx
          .update(submissions)
          .set({ status: "approved", rejectionReason: null, updatedAt: new Date() })
          .where(eq(submissions.id, input.submissionId))
          .returning();

        if (!updatedSubmission) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Submission could not be approved.",
          });
        }

        if (remainingCents - candidatePayoutCents === 0) {
          await tx
            .update(campaigns)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(campaigns.id, submission.campaign.id));
        }

        return updatedSubmission;
      }),
    ),

  reject: adminProcedure
    .input(submissionRejectInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedSubmission] = await ctx.database
        .update(submissions)
        .set({
          status: "rejected",
          rejectionReason: input.rejectionReason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(submissions.id, input.submissionId),
            eq(submissions.status, "pending"),
          ),
        )
        .returning();

      if (!updatedSubmission) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only pending submissions can be rejected.",
        });
      }
      return updatedSubmission;
    }),
});
