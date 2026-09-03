import { initTRPC, TRPCError } from "@trpc/server";

import type { TRPCContext } from "@/server/api/context";

const trpc = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = trpc.router;

export const publicProcedure = trpc.procedure;

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
    });
  }

  return next({ ctx });
});

export const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "creator") {
    throw new TRPCError({
      code: "FORBIDDEN",
    });
  }

  return next({ ctx });
});