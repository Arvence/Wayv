import { sql } from "drizzle-orm";

import { authRouter } from "@/server/api/routers/auth";
import { campaignRouter } from "@/server/api/routers/campaign";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  campaign: campaignRouter,
  health: publicProcedure.query(async ({ ctx }) => {
    await ctx.database.execute(sql`select 1`);

    return {
      api: "ok",
      database: "connected",
    };
  }),
});

export type AppRouter = typeof appRouter;
