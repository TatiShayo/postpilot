import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { validateEmail, normalizeEmail } from "./email-validator";
import type {
  Subscriber,
  SubscriberFilter,
  SubscriberStatus,
  PaginatedResult,
} from "./types";

const DEFAULT_TOKEN_SECRET =
  process.env.UNSUBSCRIBE_SECRET_KEY || "postpilot-unsubscribe-salt-key-default-2026";
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_BULK_SUBSCRIBERS = 10_000;

/**
 * Sanitizes an object by removing prototype pollution vectors
 */
function sanitizeCustomFields(
  fields?: Record<string, any>
): Record<string, string | number | boolean | null> {
  if (!fields || typeof fields !== "object") return {};
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (!DANGEROUS_KEYS.has(key) && typeof key === "string") {
      const sanitizedKey = key.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 100);
      if (sanitizedKey) {
        if (
          val === null ||
          typeof val === "string" ||
          typeof val === "number" ||
          typeof val === "boolean"
        ) {
          clean[sanitizedKey] = val;
        } else {
          clean[sanitizedKey] = String(val);
        }
      }
    }
  }
  return clean;
}

/**
 * Generates a tamper-proof, time-bound HMAC-SHA256 unsubscribe token
 */
export function generateUnsubscribeToken(
  subscriberId: string,
  email: string,
  secret: string = DEFAULT_TOKEN_SECRET,
  timestamp: number = Date.now()
): string {
  const normEmail = normalizeEmail(email).toLowerCase();
  const payload = `${subscriberId}:${normEmail}:${timestamp}`;
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");
  return `${timestamp}.${hmac}`;
}

/**
 * Verifies an unsubscribe token using constant-time comparison to prevent timing attacks
 */
export function verifyUnsubscribeToken(
  token: string,
  subscriberId: string,
  email: string,
  secret: string = DEFAULT_TOKEN_SECRET,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): { valid: boolean; reason?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Missing or invalid token format." };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "Malformed token structure." };
  }

  const [tsStr, signature] = parts;
  const timestamp = parseInt(tsStr, 10);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return { valid: false, reason: "Invalid token timestamp." };
  }

  // Check expiration
  const now = Date.now();
  if (now - timestamp > maxAgeMs) {
    return { valid: false, reason: "Unsubscribe token has expired." };
  }

  // Future timestamp guard (max 5 minutes clock skew)
  if (timestamp - now > 5 * 60 * 1000) {
    return { valid: false, reason: "Token timestamp is in the future." };
  }

  const normEmail = normalizeEmail(email).toLowerCase();
  const payload = `${subscriberId}:${normEmail}:${timestamp}`;
  const expectedHmac = createHmac("sha256", secret).update(payload).digest("hex");

  // Constant-time verification using fixed-length digests to prevent length-based timing leaks
  const sigHash = createHmac("sha256", "postpilot-timing-guard").update(signature).digest();
  const expHash = createHmac("sha256", "postpilot-timing-guard").update(expectedHmac).digest();

  if (!timingSafeEqual(sigHash, expHash) || signature !== expectedHmac) {
    return { valid: false, reason: "Invalid token signature." };
  }

  return { valid: true };
}

/**
 * Filters an in-memory or queried list of subscribers based on multi-dimensional criteria
 */
export function filterSubscribers(
  subscribers: Subscriber[],
  filter: SubscriberFilter = {}
): Subscriber[] {
  if (!Array.isArray(subscribers)) return [];

  return subscribers.filter((sub) => {
    if (!sub || typeof sub !== "object") return false;

    // 1. Status filter
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        if (!filter.status.includes(sub.status)) return false;
      } else {
        if (sub.status !== filter.status) return false;
      }
    }

    // 2. Tags filter
    if (filter.tags && filter.tags.length > 0) {
      const mode = filter.tagMatchMode ?? "any";
      const subTags = Array.isArray(sub.tags) ? sub.tags.map((t) => String(t).toLowerCase()) : [];
      const filterTags = filter.tags.map((t) => String(t).toLowerCase());

      if (mode === "all") {
        const hasAll = filterTags.every((t) => subTags.includes(t));
        if (!hasAll) return false;
      } else if (mode === "any") {
        const hasAny = filterTags.some((t) => subTags.includes(t));
        if (!hasAny) return false;
      } else if (mode === "none") {
        const hasNone = !filterTags.some((t) => subTags.includes(t));
        if (!hasNone) return false;
      }
    }

    // 3. Search query filter (matches email, first_name, last_name, or custom_fields)
    if (filter.search && typeof filter.search === "string" && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      const inEmail = sub.email ? sub.email.toLowerCase().includes(q) : false;
      const inFirst = (sub.first_name ?? "").toLowerCase().includes(q);
      const inLast = (sub.last_name ?? "").toLowerCase().includes(q);
      let inCustom = false;
      if (sub.custom_fields && typeof sub.custom_fields === "object") {
        inCustom = Object.values(sub.custom_fields).some((val) =>
          String(val ?? "").toLowerCase().includes(q)
        );
      }

      if (!inEmail && !inFirst && !inLast && !inCustom) {
        return false;
      }
    }

    // 4. Engagement score range
    const score = Number.isFinite(sub.engagement_score) ? sub.engagement_score : 0;
    if (filter.minEngagement !== undefined && Number.isFinite(filter.minEngagement) && score < filter.minEngagement) {
      return false;
    }
    if (filter.maxEngagement !== undefined && Number.isFinite(filter.maxEngagement) && score > filter.maxEngagement) {
      return false;
    }

    // 5. Creation date range
    if (filter.createdAfter) {
      const afterTime = new Date(filter.createdAfter).getTime();
      if (Number.isFinite(afterTime) && new Date(sub.created_at).getTime() < afterTime) return false;
    }
    if (filter.createdBefore) {
      const beforeTime = new Date(filter.createdBefore).getTime();
      if (Number.isFinite(beforeTime) && new Date(sub.created_at).getTime() > beforeTime) return false;
    }

    return true;
  });
}

/**
 * Paginates an array with boundary handling and NaN protection
 */
export function paginateSubscribers<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 20
): PaginatedResult<T> {
  if (!Array.isArray(items)) {
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }

  const rawPageSize = Number.isFinite(pageSize) ? pageSize : 20;
  const safePageSize = Math.max(1, Math.min(Math.floor(rawPageSize), 100));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  
  const rawPage = Number.isFinite(page) ? page : 1;
  const safePage = Math.max(1, Math.min(Math.floor(rawPage), totalPages));

  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;
  const data = items.slice(start, end);

  return {
    data,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

/**
 * Bulk imports / adds subscribers with tenant isolation, validation, prototype pollution defense, and deduplication
 */
export function bulkAddSubscribers(
  existingSubscribers: Subscriber[],
  newSubscribers: Array<Partial<Subscriber> & { email: string }>,
  userId: string
): {
  added: Subscriber[];
  updated: Subscriber[];
  duplicates: number;
  invalid: number;
  errors: Array<{ email: string; error: string }>;
} {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId is required for tenant isolation.");
  }

  const existingMap = new Map<string, Subscriber>();
  if (Array.isArray(existingSubscribers)) {
    for (const sub of existingSubscribers) {
      // Enforce tenant isolation: only index records belonging to this user
      if (sub && sub.user_id === userId && sub.email) {
        existingMap.set(sub.email.toLowerCase().trim(), sub);
      }
    }
  }

  const added: Subscriber[] = [];
  const updated: Subscriber[] = [];
  const errors: Array<{ email: string; error: string }> = [];
  let duplicates = 0;
  let invalid = 0;

  const rawList = Array.isArray(newSubscribers) ? newSubscribers.slice(0, MAX_BULK_SUBSCRIBERS) : [];

  for (const item of rawList) {
    if (!item || typeof item !== "object") {
      invalid++;
      errors.push({ email: "", error: "Invalid subscriber object" });
      continue;
    }

    const valResult = validateEmail(item.email);
    if (!valResult.isValid || !valResult.normalizedEmail) {
      invalid++;
      errors.push({ email: String(item.email ?? ""), error: valResult.error || "Invalid email" });
      continue;
    }

    const norm = valResult.normalizedEmail;
    const lookupKey = norm.toLowerCase();
    const existing = existingMap.get(lookupKey);

    const safeItemCustom = sanitizeCustomFields(item.custom_fields);

    if (existing) {
      duplicates++;
      // Merge tags and custom fields
      const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      const mergedTags = Array.from(new Set([...existingTags, ...itemTags]));
      const mergedCustom = {
        ...sanitizeCustomFields(existing.custom_fields),
        ...safeItemCustom,
      };

      const updatedSub: Subscriber = {
        ...existing,
        user_id: userId, // Invariant tenant preservation
        first_name: item.first_name !== undefined ? item.first_name : existing.first_name,
        last_name: item.last_name !== undefined ? item.last_name : existing.last_name,
        tags: mergedTags,
        custom_fields: mergedCustom,
        updated_at: new Date().toISOString(),
      };
      existingMap.set(lookupKey, updatedSub);
      updated.push(updatedSub);
    } else {
      const now = new Date().toISOString();
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : randomBytes(16).toString("hex");
      const safeTags = Array.isArray(item.tags) ? Array.from(new Set(item.tags)) : [];
      const score = Number.isFinite(item.engagement_score) ? Math.max(0, Math.min(100, item.engagement_score!)) : 100;

      const newSub: Subscriber = {
        id,
        user_id: userId,
        email: norm,
        first_name: item.first_name || null,
        last_name: item.last_name || null,
        tags: safeTags,
        status: item.status || "active",
        engagement_score: score,
        custom_fields: safeItemCustom,
        unsubscribe_token: generateUnsubscribeToken(id, norm),
        subscribed_at: now,
        created_at: now,
        updated_at: now,
      };
      existingMap.set(lookupKey, newSub);
      added.push(newSub);
    }
  }

  return { added, updated, duplicates, invalid, errors };
}

/**
 * Bulk updates tags on targeted subscribers with optional tenant isolation check
 */
export function bulkTagSubscribers(
  subscribers: Subscriber[],
  subscriberIds: string[],
  tagsToAdd: string[],
  tagsToRemove: string[] = [],
  userId?: string
): Subscriber[] {
  if (!Array.isArray(subscribers)) return [];
  const targetSet = new Set(subscriberIds);
  const toAddSet = new Set(tagsToAdd);
  const toRemoveSet = new Set(tagsToRemove);

  return subscribers.map((sub) => {
    if (!targetSet.has(sub.id)) return sub;
    if (userId && sub.user_id !== userId) return sub; // Tenant isolation check

    const currentTags = Array.isArray(sub.tags) ? sub.tags : [];
    let newTags = currentTags.filter((t) => !toRemoveSet.has(t));
    for (const tag of toAddSet) {
      if (!newTags.includes(tag)) newTags.push(tag);
    }

    return {
      ...sub,
      tags: newTags,
      updated_at: new Date().toISOString(),
    };
  });
}

/**
 * Bulk unsubscribes targeted subscribers with optional tenant isolation check
 */
export function bulkUnsubscribe(
  subscribers: Subscriber[],
  subscriberIds: string[],
  reason?: string,
  userId?: string
): Subscriber[] {
  if (!Array.isArray(subscribers)) return [];
  const targetSet = new Set(subscriberIds);
  const now = new Date().toISOString();
  const safeReason = reason ? String(reason).replace(/[\x00-\x1F\x7F]/g, "").slice(0, 200) : "bulk_unsubscribe";

  return subscribers.map((sub) => {
    if (!targetSet.has(sub.id)) return sub;
    if (userId && sub.user_id !== userId) return sub; // Tenant isolation check

    return {
      ...sub,
      status: "unsubscribed" as SubscriberStatus,
      unsubscribed_at: now,
      custom_fields: {
        ...sanitizeCustomFields(sub.custom_fields),
        unsubscribe_reason: safeReason,
      },
      updated_at: now,
    };
  });
}
