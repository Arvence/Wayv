import { describe, expect, it } from "vitest";

import { submissionFormSchema } from "@/schemas/submission";

const campaignId = "00000000-0000-4000-8000-000000000001";

function isValid(postUrl: string, platform: "youtube" | "tiktok" | "instagram") {
  return submissionFormSchema.safeParse({ campaignId, postUrl, platform }).success;
}

describe("submission platform URL validation", () => {
  it("accepts supported post URL formats", () => {
    expect(isValid("https://www.youtube.com/watch?v=abc123", "youtube")).toBe(true);
    expect(isValid("https://youtube.com/shorts/abc123", "youtube")).toBe(true);
    expect(isValid("https://youtu.be/abc123", "youtube")).toBe(true);
    expect(isValid("https://www.tiktok.com/@creator/video/123456789", "tiktok")).toBe(true);
    expect(isValid("https://www.instagram.com/p/ABC123/", "instagram")).toBe(true);
    expect(isValid("https://www.instagram.com/reel/ABC123/", "instagram")).toBe(true);
  });

  it("rejects homepages, unrelated hosts, schemes, and platform mismatches", () => {
    const invalidCases = [
      ["https://youtube.com/", "youtube"],
      ["https://www.youtube.com/", "youtube"],
      ["https://tiktok.com/", "tiktok"],
      ["https://instagram.com/", "instagram"],
      ["https://github.com/example", "youtube"],
      ["https://www.youtube.com/watch?v=abc123", "tiktok"],
      ["https://www.tiktok.com/@creator/video/123456789", "instagram"],
      ["https://www.instagram.com/p/ABC123/", "youtube"],
      ["ftp://youtube.com/watch?v=abc123", "youtube"],
    ] as const;

    for (const [postUrl, platform] of invalidCases) {
      expect(isValid(postUrl, platform)).toBe(false);
    }
  });
});
