import { describe, expect, it } from "vitest";

const { createTRPCContext } = await import("@/server/api/context");
const { appRouter } = await import("@/server/api/root");

describe("health", () => {
  it("returns healthy API and database status", async () => {
    const caller = appRouter.createCaller(
      await createTRPCContext({
        headers: new Headers(),
        resHeaders: new Headers(),
      }),
    );

    const result = await caller.health();

    expect(result).toEqual({
      api: "ok",
      database: "connected",
    });
  });
});
