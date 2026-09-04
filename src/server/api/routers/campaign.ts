import { and, eq, ilike, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { adminProcedure, createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { campaigns } from "@/server/db/schema";
import {
  campaignFormSchema,
  campaignListInputSchema,
  campaignUpdateInputSchema,
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
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const [campaign] = await ctx.database
        .update(campaigns)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(campaigns.id, id))
        .returning();

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found.",
        });
      }

      return campaign;
    }),
});
