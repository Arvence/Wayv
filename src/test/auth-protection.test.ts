import { describe, expect, it } from "vitest";

import { database } from "@/server/db/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { submissionRouter } from "@/server/api/routers/submission";

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

  it("rejects creators from admin submission procedures", async () => {
    const caller = submissionRouter.createCaller({
      database,
      headers: new Headers(),
      resHeaders: new Headers(),
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        email: "creator@test",
        role: "creator",
      },
    });

    await expect(caller.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
