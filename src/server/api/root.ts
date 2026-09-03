import { sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(async ({ ctx }) => {
    await ctx.database.execute(sql`select 1`);

    return {
      api: "ok",
      database: "connected",
    };
  }),
});

export type AppRouter = typeof appRouter;
