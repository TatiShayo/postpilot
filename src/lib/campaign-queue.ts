import type { Subscriber, QueueBatchResult } from "./types";

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
  isTransient?: boolean;
}

export interface BatchProcessingOptions {
  batchSize?: number; // Default 50
  concurrency?: number; // Default 5
  maxRetries?: number; // Default 3
  baseDelayMs?: number; // Default 50ms
  maxPerSecond?: number; // Rate limit (e.g. 20/sec)
}

export interface CampaignBatchJob {
  batchId: string;
  campaignId: string;
  subscribers: Subscriber[];
}

/**
 * Splits an array into chunks of specified size with robust arithmetic bounds
 */
export function chunkList<T>(items: T[], chunkSize: number): T[][] {
  if (!Array.isArray(items)) return [];
  const safeChunkSize = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : 1;
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeChunkSize) {
    chunks.push(items.slice(i, i + safeChunkSize));
  }
  return chunks;
}

/**
 * Classifies whether an error is transient (retriable) or permanent
 */
export function isTransientError(error: unknown, statusCode?: number): boolean {
  if (statusCode && Number.isFinite(statusCode)) {
    if (statusCode === 429 || statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
      return true;
    }
    if (statusCode >= 400 && statusCode < 500) {
      return false; // Client error (e.g. 400 Bad Request, 404, 422) is permanent
    }
  }

  const errMessage = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  const transientPatterns = [
    "rate limit",
    "too many requests",
    "timeout",
    "econnreset",
    "econnrefused",
    "etimedout",
    "socket hang up",
    "network error",
    "temporary failure",
    "try again",
    "service unavailable",
  ];

  return transientPatterns.some((pattern) => errMessage.includes(pattern));
}

/**
 * Executes a function with exponential backoff, jitter, and arithmetic safety
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    isRetriable?: (err: any) => boolean;
  } = {}
): Promise<T> {
  const rawRetries = Number.isFinite(options.maxRetries) ? options.maxRetries! : 3;
  const maxRetries = Math.max(0, Math.min(10, Math.floor(rawRetries)));
  
  const rawBase = Number.isFinite(options.baseDelayMs) ? options.baseDelayMs! : 100;
  const baseDelayMs = Math.max(1, Math.min(10_000, rawBase));
  
  const rawMax = Number.isFinite(options.maxDelayMs) ? options.maxDelayMs! : 5000;
  const maxDelayMs = Math.max(baseDelayMs, Math.min(60_000, rawMax));
  
  const isRetriable = options.isRetriable ?? isTransientError;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (err: any) {
      lastError = err;
      if (attempt > maxRetries || !isRetriable(err)) {
        throw err;
      }

      // Exponential backoff: base * 2^(attempt - 1) + jitter
      const exponential = baseDelayMs * Math.pow(2, Math.min(attempt - 1, 10));
      const jitter = Math.random() * (baseDelayMs / 2);
      const delay = Math.min(exponential + jitter, maxDelayMs);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Token-bucket / sliding window rate limiter with deadlock and divide-by-zero protection
 */
export class RateLimiter {
  private maxTokens: number;
  private tokens: number;
  private refillRatePerMs: number;
  private lastRefill: number;

  constructor(maxPerSecond: number, burstLimit?: number) {
    const safeMaxPerSec = Number.isFinite(maxPerSecond) && maxPerSecond > 0 ? maxPerSecond : 1;
    const safeBurst = burstLimit && Number.isFinite(burstLimit) && burstLimit > 0 ? burstLimit : safeMaxPerSec;

    this.maxTokens = safeBurst;
    this.tokens = this.maxTokens;
    this.refillRatePerMs = safeMaxPerSec / 1000;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = Math.max(0, now - this.lastRefill);
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;
  }

  public tryAcquire(count: number = 1): boolean {
    if (!Number.isFinite(count) || count <= 0) return true;
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  public async acquire(count: number = 1): Promise<void> {
    if (!Number.isFinite(count) || count <= 0) return;
    
    let attempts = 0;
    while (!this.tryAcquire(count) && attempts < 1000) {
      attempts++;
      const needed = Math.max(0, count - this.tokens);
      const calculatedWait = Math.ceil(needed / (this.refillRatePerMs || 0.001));
      const waitMs = Number.isFinite(calculatedWait) && calculatedWait > 0 ? Math.min(calculatedWait, 500) : 10;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

/**
 * Processes a campaign batch with concurrency controls, rate limiting, retries, and error isolation
 */
export async function processCampaignBatch(
  job: CampaignBatchJob,
  sendFn: (subscriber: Subscriber) => Promise<DeliveryResult>,
  options: BatchProcessingOptions = {}
): Promise<QueueBatchResult> {
  const startTime = Date.now();
  const rawConcurrency = Number.isFinite(options.concurrency) ? options.concurrency! : 5;
  const concurrency = Math.max(1, Math.min(50, Math.floor(rawConcurrency)));
  
  const maxRetries = Number.isFinite(options.maxRetries) ? Math.max(0, Math.min(5, options.maxRetries!)) : 2;
  const baseDelayMs = Number.isFinite(options.baseDelayMs) ? Math.max(1, options.baseDelayMs!) : 50;
  const rateLimiter = options.maxPerSecond && Number.isFinite(options.maxPerSecond) && options.maxPerSecond > 0
    ? new RateLimiter(options.maxPerSecond)
    : null;

  const subscribers = Array.isArray(job?.subscribers) ? job.subscribers : [];
  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ recipient: string; error: string; permanent: boolean }> = [];

  let index = 0;

  async function worker() {
    while (index < subscribers.length) {
      const currentIndex = index++;
      const subscriber = subscribers[currentIndex];
      if (!subscriber) break;

      if (rateLimiter) {
        await rateLimiter.acquire(1);
      }

      try {
        await withRetry(
          async () => {
            const res = await sendFn(subscriber);
            if (!res.success) {
              const err = new Error(res.error || "Delivery failed");
              (err as any).statusCode = res.statusCode;
              (err as any).isTransient = res.isTransient;
              throw err;
            }
            return res;
          },
          {
            maxRetries,
            baseDelayMs,
            isRetriable: (err) => (err.isTransient !== undefined ? err.isTransient : isTransientError(err, err.statusCode)),
          }
        );

        succeeded++;
      } catch (err: any) {
        failed++;
        const isTransient = isTransientError(err, err.statusCode);
        errors.push({
          recipient: subscriber.email || "unknown",
          error: err.message || String(err),
          permanent: !isTransient,
        });
      }
    }
  }

  const workerCount = Math.min(concurrency, Math.max(1, subscribers.length));
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  const durationMs = Math.max(0, Date.now() - startTime);

  return {
    batchId: job?.batchId || "unknown",
    total: subscribers.length,
    succeeded,
    failed,
    durationMs,
    errors,
  };
}
