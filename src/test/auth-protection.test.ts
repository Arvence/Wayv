import { describe, expect, it } from "vitest";

import { database } from "@/server/db/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { submissionRouter } from "@/server/api/routers/submission";
import { authRouter } from "@/server/api/routers/auth";
import { users, submissions } from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";

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

  it("returns only the signed-in creator's submissions", async () => {
    const [creator] = await database
      .select()
      .from(users)
      .where(eq(users.role, "creator"))
      .limit(1);

    if (!creator) throw new Error("A creator test user is required.");

    const caller = submissionRouter.createCaller({
      database,
      headers: new Headers(),
      resHeaders: new Headers(),
      user: {
        id: creator.id,
        email: creator.email,
        role: "creator",
      },
    });

    const result = await caller.mine();
    const ownedRows = result.length
      ? await database
          .select({ id: submissions.id })
          .from(submissions)
          .where(
            and(
              eq(submissions.creatorId, creator.id),
              inArray(
                submissions.id,
                result.map((submission) => submission.id),
              ),
            ),
          )
      : [];
    expect(ownedRows).toHaveLength(result.length);
  });

  it("allows demo user switching in non-production and sets a protected cookie", async () => {
    const [user] = await database.select().from(users).limit(1);
    if (!user) throw new Error("A test user is required.");

    const resHeaders = new Headers();
    const result = await authRouter.createCaller({
      database,
      headers: new Headers(),
      resHeaders,
      user: null,
    }).switchUser({ userId: user.id });

    expect(result.id).toBe(user.id);
    expect(resHeaders.get("Set-Cookie")).toContain("HttpOnly");
    expect(resHeaders.get("Set-Cookie")).toContain("SameSite=Lax");
  });
});
