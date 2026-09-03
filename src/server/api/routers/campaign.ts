import { and, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { campaigns } from "@/server/db/schema";

const campaignStatusValues = ["draft", "active", "paused", "completed"] as const;

const campaignListInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  status: z.enum(campaignStatusValues).optional(),
});

export const campaignRouter = createTRPCRouter({
  list: adminProcedure
    .input(campaignListInput)
    .query(async ({ ctx, input }) => {
      const whereClauses = [];

      if (input.search) {
        whereClauses.push(ilike(campaigns.title, `%${input.search}%`));
      }

      if (input.status) {
        whereClauses.push(eq(campaigns.status, input.status));
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
});
