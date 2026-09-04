import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { creatorProcedure, adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { campaigns, submissionMetrics, submissions, users } from "@/server/db/schema";
import { generateInitialMetric } from "@/server/db/metrics";
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
    }),

  mine: creatorProcedure
    .query(({ ctx }) =>
      ctx.database
        .select()
        .from(submissions)
        .where(eq(submissions.creatorId, ctx.user.id))
        .orderBy(desc(submissions.createdAt)),
    ),

  list: adminProcedure
    .input(submissionListInputSchema)
    .query(({ ctx, input }) =>
      ctx.database
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
        })
        .from(submissions)
        .innerJoin(campaigns, eq(submissions.campaignId, campaigns.id))
        .innerJoin(users, eq(submissions.creatorId, users.id))
        .where(
          input.status ? and(eq(submissions.status, input.status)) : undefined,
        )
        .orderBy(desc(submissions.createdAt)),
    ),

  approve: adminProcedure
    .input(submissionStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [submission] = await ctx.database
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);

      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found." });
      }
      if (submission.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending submissions can be approved.",
        });
      }

      const [updatedSubmission] = await ctx.database
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
      return updatedSubmission;
    }),

  reject: adminProcedure
    .input(submissionRejectInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [submission] = await ctx.database
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);

      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found." });
      }
      if (submission.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending submissions can be rejected.",
        });
      }

      const [updatedSubmission] = await ctx.database
        .update(submissions)
        .set({
          status: "rejected",
          rejectionReason: input.rejectionReason,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, input.submissionId))
        .returning();

      if (!updatedSubmission) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Submission could not be rejected.",
        });
      }
      return updatedSubmission;
    }),
});
