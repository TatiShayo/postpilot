import { describe, it, expect } from "vitest";
import {
  generateMockAnalytics,
  generateTimeSeriesData,
  generateEngagementByPlatform,
} from "@/lib/mock-analytics";

describe("generateMockAnalytics", () => {
  it("returns an analytics object for a given post and platform", () => {
    const result = generateMockAnalytics("post-1", "twitter");
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("post_id", "post-1");
    expect(result).toHaveProperty("platform", "twitter");
    expect(result).toHaveProperty("impressions");
    expect(result).toHaveProperty("likes");
    expect(result).toHaveProperty("comments");
    expect(result).toHaveProperty("shares");
    expect(result).toHaveProperty("clicks");
    expect(result).toHaveProperty("recorded_at");
  });

  it("generates impressions greater than 200", () => {
    const result = generateMockAnalytics("post-1", "linkedin");
    expect(result.impressions).toBeGreaterThan(200);
  });

  it("likes are less than impressions", () => {
    const result = generateMockAnalytics("post-1", "instagram");
    expect(result.likes).toBeLessThan(result.impressions);
  });

  it("comments are less than likes", () => {
    const result = generateMockAnalytics("post-1", "facebook");
    expect(result.comments).toBeLessThanOrEqual(result.likes);
  });
});

describe("generateTimeSeriesData", () => {
  it("returns the requested number of days", () => {
    expect(generateTimeSeriesData(7)).toHaveLength(7);
    expect(generateTimeSeriesData(30)).toHaveLength(30);
    expect(generateTimeSeriesData(0)).toHaveLength(0);
  });

  it("each entry has a date string and platform values", () => {
    const data = generateTimeSeriesData(3);
    for (const entry of data) {
      expect(typeof entry.date).toBe("string");
      expect(typeof entry.twitter).toBe("number");
      expect(typeof entry.linkedin).toBe("number");
      expect(typeof entry.instagram).toBe("number");
      expect(typeof entry.facebook).toBe("number");
      expect(typeof entry.tiktok).toBe("number");
    }
  });

  it("all platform values are positive", () => {
    const data = generateTimeSeriesData(5);
    for (const entry of data) {
      expect(entry.twitter).toBeGreaterThan(0);
      expect(entry.linkedin).toBeGreaterThan(0);
    }
  });
});

describe("generateEngagementByPlatform", () => {
  it("returns 5 platforms", () => {
    expect(generateEngagementByPlatform()).toHaveLength(5);
  });

  it("each entry has platform, likes, comments, shares", () => {
    const data = generateEngagementByPlatform();
    for (const entry of data) {
      expect(typeof entry.platform).toBe("string");
      expect(typeof entry.likes).toBe("number");
      expect(typeof entry.comments).toBe("number");
      expect(typeof entry.shares).toBe("number");
    }
  });
});
