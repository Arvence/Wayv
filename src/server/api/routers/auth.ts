import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createUserCookie } from "@/server/auth/cookie";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { users } from "@/server/db/schema";
import { env } from "@/server/env";

export const authRouter = createTRPCRouter({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  devUsers: publicProcedure.query(async ({ ctx }) => {
    const demoAuthAllowed = env.NODE_ENV !== "production" || env.DEMO_AUTH_ENABLED;
    if (!demoAuthAllowed) {
      return [];
    }

    return ctx.database
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users);
  }),

  switchUser: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isProduction = env.NODE_ENV === "production";
      const demoAuthAllowed = !isProduction || env.DEMO_AUTH_ENABLED;

      if (!demoAuthAllowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Dev user switching is disabled in production.",
        });
      }

      const [selectedUser] = await ctx.database
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!selectedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      const cookieValue = createUserCookie(selectedUser.id);
      const secureFlag = isProduction ? " Secure" : "";

      ctx.resHeaders.append(
        "Set-Cookie",
        `wavy_user=${encodeURIComponent(cookieValue)}; HttpOnly; SameSite=Lax; Path=/;${secureFlag}`,
      );

      return selectedUser;
    }),
});