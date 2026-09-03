import { describe, expect, it } from "vitest";

const {
  createUserCookie,
  readUserCookie,
  signUserId,
  verifyUserCookie,
} = await import("@/server/auth/cookie");

describe("cookie auth", () => {
  it("creates a valid user cookie and reads it back", () => {
    const userId = "user-123";
    const cookie = createUserCookie(userId);

    expect(cookie).toContain(`${userId}.`);
    expect(readUserCookie(cookie)).toBe(userId);
    expect(signUserId(userId)).toBe(cookie);
    expect(verifyUserCookie(cookie)).toBe(userId);
  });

  it("rejects malformed or tampered cookies", () => {
    const validCookie = createUserCookie("user-456");
    const tamperedCookie = `${validCookie.slice(0, -1)}x`;

    expect(readUserCookie("invalid")).toBeNull();
    expect(readUserCookie("user-456")).toBeNull();
    expect(verifyUserCookie("user-456")).toBeNull();
    expect(verifyUserCookie(tamperedCookie)).toBeNull();
  });
});
