import { describe, expect, it } from "vitest";

import { database } from "@/server/db/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const testRouter = createTRPCRouter({
  secret: protectedProcedure.query(() => "ok"),
});

describe("auth protection", () => {
  it("rejects anonymous users from protected procedures", async () => {
    const caller = testRouter.createCaller({
      database,
      headers: new Headers(),
      resHeaders: new Headers(),
      user: null,
    });

    await expect(caller.secret()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
