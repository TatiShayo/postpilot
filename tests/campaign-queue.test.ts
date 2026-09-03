import { describe, it, expect, vi } from "vitest";
import {
  chunkList,
  isTransientError,
  withRetry,
  RateLimiter,
  processCampaignBatch,
} from "@/lib/campaign-queue";
import type { Subscriber } from "@/lib/types";

describe("chunkList", () => {
  it("splits list into equal chunks and handles remainder", () => {
    const list = [1, 2, 3, 4, 5, 6, 7];
    const chunks = chunkList(list, 3);
    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("handles chunkSize larger than list size", () => {
    const list = ["a", "b"];
    const chunks = chunkList(list, 10);
    expect(chunks).toEqual([["a", "b"]]);
  });

  it("handles empty list", () => {
    expect(chunkList([], 5)).toEqual([]);
  });

  it("handles chunkSize <= 0 safely by defaulting to 1", () => {
    expect(chunkList([1, 2], 0)).toEqual([[1], [2]]);
  });
});

describe("isTransientError", () => {
  it("identifies transient HTTP status codes", () => {
    expect(isTransientError(new Error(), 429)).toBe(true);
    expect(isTransientError(new Error(), 500)).toBe(true);
    expect(isTransientError(new Error(), 502)).toBe(true);
    expect(isTransientError(new Error(), 503)).toBe(true);
    expect(isTransientError(new Error(), 504)).toBe(true);
  });

  it("identifies permanent client errors", () => {
    expect(isTransientError(new Error(), 400)).toBe(false);
    expect(isTransientError(new Error(), 401)).toBe(false);
    expect(isTransientError(new Error(), 404)).toBe(false);
    expect(isTransientError(new Error(), 422)).toBe(false);
  });

  it("identifies transient error messages", () => {
    expect(isTransientError(new Error("Rate limit exceeded"))).toBe(true);
    expect(isTransientError(new Error("Socket hang up"))).toBe(true);
    expect(isTransientError(new Error("ETIMEDOUT"))).toBe(true);
    expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
    expect(isTransientError(new Error("Network error"))).toBe(true);
    expect(isTransientError(new Error("Invalid email syntax"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("resolves immediately when function succeeds on first try", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure and succeeds on subsequent try", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Rate limit exceeded"))
      .mockResolvedValueOnce("recovered");

    const result = await withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 10,
    });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws the last error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Rate limit"));
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow("Rate limit");
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("fails immediately without retrying on permanent non-retriable error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Invalid recipient email"));
    await expect(
      withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        isRetriable: () => false,
      })
    ).rejects.toThrow("Invalid recipient email");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("RateLimiter", () => {
  it("allows immediate tokens within capacity", () => {
    const limiter = new RateLimiter(10, 10);
    expect(limiter.tryAcquire(5)).toBe(true);
    expect(limiter.tryAcquire(5)).toBe(true);
    expect(limiter.tryAcquire(1)).toBe(false); // exhausted
  });

  it("acquire() resolves after tokens refill", async () => {
    const limiter = new RateLimiter(100, 2); // 100/sec = 1 token per 10ms
    expect(limiter.tryAcquire(2)).toBe(true);
    expect(limiter.tryAcquire(1)).toBe(false);

    const start = Date.now();
    await limiter.acquire(1);
    expect(Date.now() - start).toBeGreaterThanOrEqual(5);
  });
});

describe("processCampaignBatch", () => {
  const mockSubscribers: Subscriber[] = [
    {
      id: "s-1",
      user_id: "u-1",
      email: "user1@example.com",
      tags: [],
      status: "active",
      engagement_score: 50,
      subscribed_at: "2026-01-01",
      created_at: "2026-01-01",
    },
    {
      id: "s-2",
      user_id: "u-1",
      email: "user2@example.com",
      tags: [],
      status: "active",
      engagement_score: 50,
      subscribed_at: "2026-01-01",
      created_at: "2026-01-01",
    },
    {
      id: "s-3",
      user_id: "u-1",
      email: "user3@example.com",
      tags: [],
      status: "active",
      engagement_score: 50,
      subscribed_at: "2026-01-01",
      created_at: "2026-01-01",
    },
  ];

  it("processes batch of subscribers successfully", async () => {
    const sendFn = vi.fn().mockResolvedValue({ success: true, messageId: "msg_123" });

    const result = await processCampaignBatch(
      { batchId: "batch-1", campaignId: "camp-1", subscribers: mockSubscribers },
      sendFn,
      { concurrency: 2, baseDelayMs: 10 }
    );

    expect(result.batchId).toBe("batch-1");
    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(sendFn).toHaveBeenCalledTimes(3);
  });

  it("tracks failures and permanent error classification per subscriber", async () => {
    const sendFn = vi.fn().mockImplementation(async (sub: Subscriber) => {
      if (sub.id === "s-2") {
        return {
          success: false,
          error: "Recipient mailbox not found",
          statusCode: 404,
          isTransient: false,
        };
      }
      return { success: true, messageId: "msg_ok" };
    });

    const result = await processCampaignBatch(
      { batchId: "batch-2", campaignId: "camp-1", subscribers: mockSubscribers },
      sendFn,
      { concurrency: 2, maxRetries: 1, baseDelayMs: 10 }
    );

    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].recipient).toBe("user2@example.com");
    expect(result.errors[0].permanent).toBe(true);
  });
});
