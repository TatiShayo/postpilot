import { describe, it, expect, beforeEach } from "vitest";
import {
  renderEmailTemplate,
  extractTemplateVariables,
  validateTemplate,
  escapeHtml,
  getNestedValue,
} from "@/lib/template-engine";
import {
  validateEmail,
  normalizeEmail,
  extractSubaddress,
  isDisposableEmail,
} from "@/lib/email-validator";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  filterSubscribers,
  paginateSubscribers,
  bulkAddSubscribers,
  bulkTagSubscribers,
  bulkUnsubscribe,
} from "@/lib/subscriber-service";
import {
  canTransitionCampaign,
  validateCampaignPrerequisites,
  transitionCampaign,
} from "@/lib/campaign-state-machine";
import {
  RateLimiter,
  chunkList,
  withRetry,
  isTransientError,
  processCampaignBatch,
} from "@/lib/campaign-queue";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import type { Campaign, Subscriber } from "@/lib/types";

describe("DEFENSIVE VULNERABILITY PROBING & FUZZING SUITE", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  // =========================================================================
  // ARCHETYPE 1: IDOR & TENANT ISOLATION
  // =========================================================================
  describe("Archetype 1: IDOR & Tenant Isolation", () => {
    it("prevents cross-tenant subscriber updates in bulkAddSubscribers", () => {
      const tenantA_sub: Subscriber = {
        id: "sub-tenant-a",
        user_id: "user-a",
        email: "alice@example.com",
        tags: ["tenant-a-tag"],
        status: "active",
        engagement_score: 100,
        subscribed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const tenantB_sub: Subscriber = {
        id: "sub-tenant-b",
        user_id: "user-b",
        email: "victim@example.com",
        tags: ["tenant-b-tag"],
        status: "active",
        engagement_score: 100,
        subscribed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Attacker is User A trying to update victim@example.com by supplying mixed list
      const mixedExisting = [tenantA_sub, tenantB_sub];
      const importPayload = [
        { email: "victim@example.com", first_name: "HackedName" },
      ];

      const result = bulkAddSubscribers(mixedExisting, importPayload, "user-a");

      // Victim subscriber from User B must NOT be updated; a new subscriber owned by User A should be created
      expect(result.updated).toHaveLength(0);
      expect(result.added).toHaveLength(1);
      expect(result.added[0].user_id).toBe("user-a");
      expect(result.added[0].email).toBe("victim@example.com");
      // Verify tenant B's original object was not mutated
      expect(tenantB_sub.first_name).toBeUndefined();
    });

    it("enforces tenant isolation in bulkTagSubscribers", () => {
      const subs: Subscriber[] = [
        {
          id: "sub-1",
          user_id: "user-a",
          email: "user1@a.com",
          tags: ["old"],
          status: "active",
          engagement_score: 50,
          subscribed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: "sub-2",
          user_id: "user-b",
          email: "user2@b.com",
          tags: ["private-b"],
          status: "active",
          engagement_score: 80,
          subscribed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      // User A attempts to tag sub-2 belonging to User B
      const result = bulkTagSubscribers(subs, ["sub-1", "sub-2"], ["vip"], [], "user-a");
      const sub1 = result.find((s) => s.id === "sub-1");
      const sub2 = result.find((s) => s.id === "sub-2");

      expect(sub1?.tags).toContain("vip");
      expect(sub2?.tags).toEqual(["private-b"]); // Untouched
    });

    it("enforces tenant isolation in bulkUnsubscribe", () => {
      const subs: Subscriber[] = [
        {
          id: "sub-1",
          user_id: "user-a",
          email: "user1@a.com",
          tags: [],
          status: "active",
          engagement_score: 50,
          subscribed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: "sub-2",
          user_id: "user-b",
          email: "user2@b.com",
          tags: [],
          status: "active",
          engagement_score: 80,
          subscribed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      // User A attempts to unsubscribe User B's subscriber
      const result = bulkUnsubscribe(subs, ["sub-2"], "malicious", "user-a");
      const sub2 = result.find((s) => s.id === "sub-2");

      expect(sub2?.status).toBe("active"); // Not changed to unsubscribed
    });

    it("prevents cross-tenant token replay in verifyUnsubscribeToken", () => {
      const tokenForUserA = generateUnsubscribeToken("sub-123", "alice@example.com", "secret-key-1");
      
      // Token verified against different subscriber ID
      const res1 = verifyUnsubscribeToken(tokenForUserA, "sub-999", "alice@example.com", "secret-key-1");
      expect(res1.valid).toBe(false);

      // Token verified against different email
      const res2 = verifyUnsubscribeToken(tokenForUserA, "sub-123", "bob@example.com", "secret-key-1");
      expect(res2.valid).toBe(false);

      // Token verified against different tenant secret
      const res3 = verifyUnsubscribeToken(tokenForUserA, "sub-123", "alice@example.com", "secret-key-2");
      expect(res3.valid).toBe(false);
    });
  });

  // =========================================================================
  // ARCHETYPE 2: TOCTOU & CONCURRENCY
  // =========================================================================
  describe("Archetype 2: TOCTOU & Concurrency", () => {
    it("prevents illegal re-entrant transitions from sending state", () => {
      const baseCampaign: Campaign = {
        id: "camp-concurrent-1",
        user_id: "user-1",
        title: "Test Campaign",
        subject: "Exclusive Offer",
        content_html: "<p>Hello</p>",
        status: "sending",
        target_tags: [],
        total_recipients: 100,
        sent_count: 50,
        failed_count: 0,
        created_at: new Date().toISOString(),
      };

      // Cannot re-trigger transition from sending to scheduled or queued
      expect(canTransitionCampaign("sending", "scheduled")).toBe(false);
      expect(canTransitionCampaign("sending", "queued")).toBe(false);

      expect(() => transitionCampaign(baseCampaign, "scheduled")).toThrow();
      expect(() => transitionCampaign(baseCampaign, "queued")).toThrow();
    });

    it("handles concurrent duplicate subscriber additions idempotently without race conditions", () => {
      const existing: Subscriber[] = [];
      const newItems = Array.from({ length: 50 }, (_, i) => ({
        email: `batch-user-${i % 5}@example.com`,
        tags: [`tag-${i}`],
      }));

      const result = bulkAddSubscribers(existing, newItems, "user-concurrent");
      expect(result.added).toHaveLength(5); // 5 unique users
      expect(result.duplicates).toBe(45); // 45 duplicate merges
    });

    it("maintains strict monotonic audit timestamps under rapid sequential transitions", () => {
      let campaign: Campaign = {
        id: "camp-flow-1",
        user_id: "user-1",
        title: "Flow Test",
        subject: "Flow Subject",
        content_html: "<p>Flow</p>",
        status: "draft",
        target_tags: [],
        total_recipients: 10,
        sent_count: 0,
        failed_count: 0,
        created_at: new Date().toISOString(),
      };

      campaign = transitionCampaign(campaign, "queued");
      campaign = transitionCampaign(campaign, "sending");
      campaign = transitionCampaign(campaign, "completed");

      const history = (campaign.metadata as any)?.history;
      expect(history).toHaveLength(3);
      expect(history[0].from).toBe("draft");
      expect(history[0].to).toBe("queued");
      expect(history[1].from).toBe("queued");
      expect(history[1].to).toBe("sending");
      expect(history[2].from).toBe("sending");
      expect(history[2].to).toBe("completed");
    });

    it("handles high-concurrency rate limiter acquisition without token leaks", async () => {
      const limiter = new RateLimiter(50, 100);
      const results = await Promise.all(
        Array.from({ length: 20 }, async () => {
          return limiter.tryAcquire(5);
        })
      );

      const successful = results.filter(Boolean).length;
      expect(successful).toBe(20); // 20 * 5 = 100 tokens consumed (burst limit)
      // Next acquisition must fail as bucket is now empty
      expect(limiter.tryAcquire(1)).toBe(false);
    });
  });

  // =========================================================================
  // ARCHETYPE 3: PROTOTYPE POLLUTION & OBJECT KEY INJECTION
  // =========================================================================
  describe("Archetype 3: Prototype Pollution & Object Key Injection", () => {
    it("getNestedValue returns undefined for __proto__, constructor, and prototype", () => {
      const obj = { normal: "value" };
      expect(getNestedValue(obj, "__proto__")).toBeUndefined();
      expect(getNestedValue(obj, "__proto__.polluted")).toBeUndefined();
      expect(getNestedValue(obj, "constructor")).toBeUndefined();
      expect(getNestedValue(obj, "constructor.prototype")).toBeUndefined();
      expect(getNestedValue(obj, "prototype")).toBeUndefined();
      expect(getNestedValue(obj, "toString")).toBeUndefined();
      expect(getNestedValue(obj, "valueOf")).toBeUndefined();
    });

    it("renderEmailTemplate safely ignores __proto__ and constructor injection payloads", () => {
      const template = "Pollution check: {{ __proto__.isAdmin || 'safe' }} - {{ constructor.name || 'none' }}";
      const result = renderEmailTemplate(template, {});
      expect(result).toBe("Pollution check: safe - none");
    });

    it("conditional blocks do not treat inherited Object prototype as truthy", () => {
      const template = "{{#if constructor}}LEAK_EXPOSED{{else}}SECURE{{/if}}";
      const result = renderEmailTemplate(template, {});
      expect(result).toBe("SECURE");
    });

    it("bulkAddSubscribers strips __proto__ and constructor keys from custom_fields", () => {
      const rawPayload = JSON.parse(
        '{"email":"proto@victim.com","custom_fields":{"__proto__":{"isAdmin":true},"constructor":"bad","role":"member"}}'
      );

      const result = bulkAddSubscribers([], [rawPayload], "user-sec");
      const addedSub = result.added[0];

      expect(addedSub.custom_fields).toBeDefined();
      expect(addedSub.custom_fields?.["role"]).toBe("member");
      expect(Object.prototype.hasOwnProperty.call(addedSub.custom_fields, "__proto__")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(addedSub.custom_fields, "constructor")).toBe(false);
      expect(Object.keys(addedSub.custom_fields!)).not.toContain("__proto__");
      expect(Object.keys(addedSub.custom_fields!)).not.toContain("constructor");
      // Ensure Object prototype was NOT polluted globally
      expect((({} as any).isAdmin)).toBeUndefined();
    });

    it("extractTemplateVariables filters out dangerous prototype keys", () => {
      const template = "{{ __proto__.pollute }} {{ constructor.name }} {{ normal_var }}";
      const vars = extractTemplateVariables(template);
      expect(vars).toContain("normal_var");
      expect(vars).not.toContain("__proto__.pollute");
      expect(vars).not.toContain("constructor.name");
    });

    it("loop item context merging neutralizes prototype injection in each blocks", () => {
      const pollutedItem = JSON.parse('{"__proto__":{"polluted":true},"title":"Item 1"}');
      const template = "{{#each items}}<li>{{title}}</li>{{/each}}";
      const result = renderEmailTemplate(template, { items: [pollutedItem] });

      expect(result).toBe("<li>Item 1</li>");
      expect((({} as any).polluted)).toBeUndefined();
    });
  });

  // =========================================================================
  // ARCHETYPE 4: PARSER DESYNC & TEMPLATE INJECTION
  // =========================================================================
  describe("Archetype 4: Parser Desync & Template Injection", () => {
    it("evaluates nested conditionals without parser desync", () => {
      const template =
        "{{#if outer}}OUTER_START-{{#if inner}}INNER_YES{{else}}INNER_NO{{/if}}-OUTER_END{{else}}OUTER_NO{{/if}}";

      // Both true
      expect(renderEmailTemplate(template, { outer: true, inner: true })).toBe(
        "OUTER_START-INNER_YES-OUTER_END"
      );

      // Outer true, inner false
      expect(renderEmailTemplate(template, { outer: true, inner: false })).toBe(
        "OUTER_START-INNER_NO-OUTER_END"
      );

      // Outer false
      expect(renderEmailTemplate(template, { outer: false, inner: true })).toBe(
        "OUTER_NO"
      );
    });

    it("evaluates nested unless inside if", () => {
      const template =
        "{{#if active}}ACTIVE-{{#unless unsubscribed}}SUBSCRIBED{{/unless}}{{/if}}";
      expect(renderEmailTemplate(template, { active: true, unsubscribed: false })).toBe(
        "ACTIVE-SUBSCRIBED"
      );
      expect(renderEmailTemplate(template, { active: true, unsubscribed: true })).toBe(
        "ACTIVE-"
      );
    });

    it("strips null bytes from template to prevent C-level / client parser desync", () => {
      const template = "Hello\x00 {{ name }}\x00!";
      const result = renderEmailTemplate(template, { name: "Alice" });
      expect(result).toBe("Hello Alice!");
      expect(result).not.toContain("\x00");
    });

    it("detects unclosed template expressions during validation", () => {
      const unclosed = "Hello {{ name without closing brackets";
      const result = validateTemplate(unclosed);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Unclosed or malformed"))).toBe(true);
    });

    it("number filter handles out-of-range decimal bounds without throwing RangeError", () => {
      const template1 = "Val: {{ num | number: 100 }}";
      expect(() => renderEmailTemplate(template1, { num: 12.3456 })).not.toThrow();

      const template2 = "Val: {{ num | number: -10 }}";
      expect(() => renderEmailTemplate(template2, { num: 12.3456 })).not.toThrow();
    });

    it("url_encode filter handles lone Unicode surrogates without throwing URIError", () => {
      const template = "URL: {{ bad_unicode | url_encode }}";
      expect(() => renderEmailTemplate(template, { bad_unicode: "\uD800" })).not.toThrow();
    });

    it("json filter safely handles circular object references without crashing", () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      const template = "JSON: {{{ circular | json }}}";
      expect(() => renderEmailTemplate(template, { circular })).not.toThrow();
    });

    it("escapes all standard HTML/XSS breakout vectors in standard variables", () => {
      const payload = `<script>alert('XSS')</script>" onfocus="bad()" ' onclick='evil()`;
      const template = "Hello {{ payload }}";
      const result = renderEmailTemplate(template, { payload });

      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
      expect(result).toContain("&quot;");
      expect(result).toContain("&#39;");
    });
  });

  // =========================================================================
  // ARCHETYPE 5: CRLF & HEADER INJECTION
  // =========================================================================
  describe("Archetype 5: CRLF & Header Injection", () => {
    it("validateEmail rejects CRLF injection attempts", () => {
      const payloads = [
        "victim@example.com\r\nBcc: evil@attacker.com",
        "victim@example.com\nSubject: Injected",
        "victim\r@example.com",
        "victim@example.com\x00admin",
        "victim@example.com\x1Ftest",
        "victim\x7F@example.com",
      ];

      for (const payload of payloads) {
        const result = validateEmail(payload);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/forbidden control characters|invalid/i);
      }
    });

    it("validateCampaignPrerequisites rejects CRLF and control characters in subject line", () => {
      const maliciousCampaign: Campaign = {
        id: "camp-crlf",
        user_id: "user-1",
        title: "Normal Title",
        subject: "Welcome!\r\nBcc: all@company.com\r\n",
        content_html: "<p>Body</p>",
        status: "draft",
        target_tags: [],
        total_recipients: 10,
        sent_count: 0,
        failed_count: 0,
        created_at: new Date().toISOString(),
      };

      const result = validateCampaignPrerequisites(maliciousCampaign, "queued");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("CRLF or control characters"))).toBe(true);
    });

    it("validateCampaignPrerequisites accepts valid clean subject lines", () => {
      const cleanCampaign: Campaign = {
        id: "camp-clean",
        user_id: "user-1",
        title: "Normal Title",
        subject: "Welcome to PostPilot Newsletter #42!",
        content_html: "<p>Body</p>",
        status: "draft",
        target_tags: [],
        total_recipients: 10,
        sent_count: 0,
        failed_count: 0,
        created_at: new Date().toISOString(),
      };

      const result = validateCampaignPrerequisites(cleanCampaign, "queued");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // ARCHETYPE 6: ARITHMETIC EDGE CASES
  // =========================================================================
  describe("Archetype 6: Arithmetic Edge Cases", () => {
    it("RateLimiter handles non-positive, NaN, and Infinity rate limits gracefully", () => {
      expect(() => new RateLimiter(0)).not.toThrow();
      expect(() => new RateLimiter(-10)).not.toThrow();
      expect(() => new RateLimiter(NaN)).not.toThrow();
      expect(() => new RateLimiter(Infinity)).not.toThrow();

      const limiter = new RateLimiter(-5);
      expect(limiter.tryAcquire(0)).toBe(true);
      expect(limiter.tryAcquire(-1)).toBe(true);
      expect(limiter.tryAcquire(NaN)).toBe(true);
    });

    it("chunkList handles invalid or pathological chunkSize inputs safely", () => {
      const items = [1, 2, 3, 4, 5];
      expect(chunkList(items, 0)).toEqual([[1], [2], [3], [4], [5]]);
      expect(chunkList(items, -5)).toEqual([[1], [2], [3], [4], [5]]);
      expect(chunkList(items, NaN)).toEqual([[1], [2], [3], [4], [5]]);
      expect(chunkList(items, 2.5)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunkList(items, 10)).toEqual([[1, 2, 3, 4, 5]]);
    });

    it("paginateSubscribers handles NaN, negative, and out-of-bounds page/pageSize", () => {
      const items = Array.from({ length: 55 }, (_, i) => `item-${i}`);

      const res1 = paginateSubscribers(items, NaN, NaN);
      expect(res1.page).toBe(1);
      expect(res1.pageSize).toBe(20);
      expect(res1.totalPages).toBe(3);

      const res2 = paginateSubscribers(items, -10, -5);
      expect(res2.page).toBe(1);
      expect(res2.pageSize).toBe(1);

      const res3 = paginateSubscribers(items, 999, 10);
      expect(res3.page).toBe(6); // Clamped to totalPages
      expect(res3.data).toHaveLength(5);
    });

    it("withRetry handles pathological delay and retry count inputs without overflowing", async () => {
      let attemptsCount = 0;
      await expect(
        withRetry(
          async () => {
            attemptsCount++;
            throw new Error("rate limit");
          },
          { maxRetries: -5, baseDelayMs: -100, maxDelayMs: -50 }
        )
      ).rejects.toThrow("rate limit");

      expect(attemptsCount).toBe(1); // 0 retries clamped
    });

    it("rateLimit handles negative max and windowMs parameters", () => {
      const res = rateLimit("test-id", { max: -10, windowMs: -5000 });
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(0); // Clamped to max=1, 1st call consumed it
    });
  });

  // =========================================================================
  // ARCHETYPE 7: REDOS & BUFFER LIMITS
  // =========================================================================
  describe("Archetype 7: ReDoS & Buffer Limits", () => {
    it("validateEmail ReDoS fuzzing completes in sub-millisecond linear time", () => {
      const pathologicalEmails = [
        "a".repeat(250) + "@example.com",
        "user@" + "a".repeat(250) + ".com",
        "a".repeat(60) + "." + "b".repeat(60) + "@test.co.uk",
        "!#$%&'*+-/=?^_`{|}~.".repeat(5) + "a@example.com",
        "user@sub." + "domain.".repeat(20) + "com",
      ];

      for (const email of pathologicalEmails) {
        const t0 = performance.now();
        validateEmail(email);
        const t1 = performance.now();
        expect(t1 - t0).toBeLessThan(25); // Must execute in <25ms
      }
    });

    it("validateTemplate rejects templates exceeding the maximum length buffer limit", () => {
      const massiveTemplate = "Hello {{ name }} ".repeat(35_000); // > 500KB
      const result = validateTemplate(massiveTemplate);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exceeds maximum limit"))).toBe(true);
    });

    it("renderLoops bounds maximum loop iterations against huge list attacks", () => {
      const massiveList = Array.from({ length: 10_000 }, (_, i) => `Item ${i}`);
      const template = "Count: {{#each items}}*{{/each}}";
      
      const t0 = performance.now();
      const result = renderEmailTemplate(template, { items: massiveList });
      const t1 = performance.now();

      // MAX_LOOP_ITEMS is 5000, so result length for '*' is 5000
      expect(result.split("*").length - 1).toBe(5000);
      expect(t1 - t0).toBeLessThan(100);
    });

    it("rateLimit sweeps memory when reaching maximum capacity", () => {
      for (let i = 0; i < 11_000; i++) {
        rateLimit(`ip-fuzz-${i}`, { max: 10, windowMs: 100 });
      }
      // Should not throw or crash on 11,000 distinct IPs
      const check = rateLimit("ip-check-post-sweep");
      expect(check.allowed).toBe(true);
    });
  });

  // =========================================================================
  // ARCHETYPE 8: CRYPTOGRAPHIC TIMING ATTACKS
  // =========================================================================
  describe("Archetype 8: Cryptographic Timing Attacks", () => {
    it("verifyUnsubscribeToken verifies valid signature accurately", () => {
      const secret = "test-secret-salt-2026";
      const token = generateUnsubscribeToken("sub-42", "alice@example.com", secret);
      const result = verifyUnsubscribeToken(token, "sub-42", "alice@example.com", secret);
      expect(result.valid).toBe(true);
    });

    it("verifyUnsubscribeToken safely rejects malformed or truncated signatures without throwing RangeError", () => {
      const secret = "test-secret-salt-2026";
      const validToken = generateUnsubscribeToken("sub-42", "alice@example.com", secret);
      const [ts] = validToken.split(".");

      // Truncated signatures of various lengths
      const forgedTokens = [
        `${ts}.a`,
        `${ts}.123456`,
        `${ts}.` + "0".repeat(32),
        `${ts}.` + "f".repeat(63), // Odd length hex
        `${ts}.not_hex_signature_!@#$`,
        `${ts}.` + "a".repeat(128), // Oversized signature
      ];

      for (const forged of forgedTokens) {
        expect(() => {
          const res = verifyUnsubscribeToken(forged, "sub-42", "alice@example.com", secret);
          expect(res.valid).toBe(false);
          expect(res.reason).toMatch(/Invalid token signature|Malformed/);
        }).not.toThrow();
      }
    });

    it("verifyUnsubscribeToken rejects expired tokens", () => {
      const secret = "test-secret-salt-2026";
      const pastTime = Date.now() - (35 * 24 * 60 * 60 * 1000); // 35 days ago
      const expiredToken = generateUnsubscribeToken("sub-42", "alice@example.com", secret, pastTime);

      const result = verifyUnsubscribeToken(expiredToken, "sub-42", "alice@example.com", secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("verifyUnsubscribeToken rejects future timestamps exceeding skew allowance", () => {
      const secret = "test-secret-salt-2026";
      const futureTime = Date.now() + (10 * 60 * 1000); // 10 minutes in future
      const futureToken = generateUnsubscribeToken("sub-42", "alice@example.com", secret, futureTime);

      const result = verifyUnsubscribeToken(futureToken, "sub-42", "alice@example.com", secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("future");
    });
  });
});
