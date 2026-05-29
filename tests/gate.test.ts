import { describe, it, expect } from "vitest";
import { PLATFORM_LIMITS, POST_LIMITS, AI_LIMITS } from "@/lib/types";
import type { SubscriptionTier } from "@/lib/types";

describe("Subscription limits", () => {
  it("free tier has correct limits", () => {
    expect(PLATFORM_LIMITS.free).toBe(1);
    expect(POST_LIMITS.free).toBe(10);
    expect(AI_LIMITS.free).toBe(0);
  });

  it("pro tier has correct limits", () => {
    expect(PLATFORM_LIMITS.pro).toBe(5);
    expect(POST_LIMITS.pro).toBe(Infinity);
    expect(AI_LIMITS.pro).toBe(100);
  });

  it("business tier has correct limits", () => {
    expect(PLATFORM_LIMITS.business).toBe(5);
    expect(POST_LIMITS.business).toBe(Infinity);
    expect(AI_LIMITS.business).toBe(Infinity);
  });
});

describe("checkPostLimit equivalent logic", () => {
  function postLimitCheck(tier: SubscriptionTier, currentMonthCount: number): boolean {
    return currentMonthCount < POST_LIMITS[tier];
  }

  it("free: allows under 10 posts", () => {
    expect(postLimitCheck("free", 0)).toBe(true);
    expect(postLimitCheck("free", 9)).toBe(true);
  });

  it("free: blocks at 10 posts", () => {
    expect(postLimitCheck("free", 10)).toBe(false);
    expect(postLimitCheck("free", 100)).toBe(false);
  });

  it("pro: always allows", () => {
    expect(postLimitCheck("pro", 0)).toBe(true);
    expect(postLimitCheck("pro", 999)).toBe(true);
  });

  it("business: always allows", () => {
    expect(postLimitCheck("business", 0)).toBe(true);
    expect(postLimitCheck("business", 9999)).toBe(true);
  });
});

describe("checkAIAccess equivalent logic", () => {
  function aiAccessCheck(tier: SubscriptionTier): boolean {
    return AI_LIMITS[tier] > 0;
  }

  it("free has no AI access", () => {
    expect(aiAccessCheck("free")).toBe(false);
  });

  it("pro has AI access", () => {
    expect(aiAccessCheck("pro")).toBe(true);
  });

  it("business has AI access", () => {
    expect(aiAccessCheck("business")).toBe(true);
  });
});

describe("platform limit check equivalent logic", () => {
  function platformLimitCheck(tier: SubscriptionTier, platformCount: number): boolean {
    return platformCount < PLATFORM_LIMITS[tier];
  }

  it("free: allows 0 platforms", () => {
    expect(platformLimitCheck("free", 0)).toBe(true);
  });

  it("free: blocks at 1 platform", () => {
    expect(platformLimitCheck("free", 1)).toBe(false);
    expect(platformLimitCheck("free", 3)).toBe(false);
  });

  it("pro: allows up to 4 platforms", () => {
    expect(platformLimitCheck("pro", 4)).toBe(true);
  });

  it("pro: blocks at 5 platforms", () => {
    expect(platformLimitCheck("pro", 5)).toBe(false);
  });
});
