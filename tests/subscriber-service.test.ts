import { describe, it, expect } from "vitest";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  filterSubscribers,
  paginateSubscribers,
  bulkAddSubscribers,
  bulkTagSubscribers,
  bulkUnsubscribe,
} from "@/lib/subscriber-service";
import type { Subscriber } from "@/lib/types";

function getMockSubscribers(): Subscriber[] {
  return [
    {
      id: "sub-1",
      user_id: "user-1",
      email: "alice@example.com",
      first_name: "Alice",
      last_name: "Smith",
      tags: ["newsletter", "vip"],
      status: "active",
      engagement_score: 95,
      custom_fields: { company: "Acme", role: "CEO" },
      subscribed_at: "2026-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "sub-2",
      user_id: "user-1",
      email: "bob@company.org",
      first_name: "Bob",
      last_name: "Jones",
      tags: ["product-updates"],
      status: "active",
      engagement_score: 70,
      custom_fields: { company: "Beta Corp", role: "CTO" },
      subscribed_at: "2026-02-01T00:00:00Z",
      created_at: "2026-02-01T00:00:00Z",
    },
    {
      id: "sub-3",
      user_id: "user-1",
      email: "charlie@domain.com",
      first_name: "Charlie",
      last_name: "Brown",
      tags: ["newsletter", "leads"],
      status: "unsubscribed",
      engagement_score: 20,
      subscribed_at: "2026-03-01T00:00:00Z",
      unsubscribed_at: "2026-04-01T00:00:00Z",
      created_at: "2026-03-01T00:00:00Z",
    },
    {
      id: "sub-4",
      user_id: "user-1",
      email: "diana@tech.io",
      first_name: "Diana",
      last_name: "Prince",
      tags: ["vip", "enterprise"],
      status: "bounced",
      engagement_score: 0,
      subscribed_at: "2026-05-01T00:00:00Z",
      created_at: "2026-05-01T00:00:00Z",
    },
  ];
}

describe("Unsubscribe Token Cryptography", () => {
  const secret = "test-secret-salt-123";

  it("generates a verifiable HMAC token for a subscriber", () => {
    const token = generateUnsubscribeToken("sub-1", "alice@example.com", secret);
    expect(token).toContain(".");

    const verification = verifyUnsubscribeToken(
      token,
      "sub-1",
      "alice@example.com",
      secret
    );
    expect(verification.valid).toBe(true);
  });

  it("fails verification if subscriberId is altered", () => {
    const token = generateUnsubscribeToken("sub-1", "alice@example.com", secret);
    const verification = verifyUnsubscribeToken(
      token,
      "sub-2",
      "alice@example.com",
      secret
    );
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain("Invalid token signature");
  });

  it("fails verification if email is altered", () => {
    const token = generateUnsubscribeToken("sub-1", "alice@example.com", secret);
    const verification = verifyUnsubscribeToken(
      token,
      "sub-1",
      "attacker@evil.com",
      secret
    );
    expect(verification.valid).toBe(false);
  });

  it("fails verification on expired tokens", () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const expiredToken = generateUnsubscribeToken(
      "sub-1",
      "alice@example.com",
      secret,
      thirtyOneDaysAgo
    );
    const verification = verifyUnsubscribeToken(
      expiredToken,
      "sub-1",
      "alice@example.com",
      secret,
      30 * 24 * 60 * 60 * 1000
    );
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain("expired");
  });

  it("rejects malformed tokens", () => {
    expect(verifyUnsubscribeToken("", "sub-1", "a@b.com", secret).valid).toBe(false);
    expect(
      verifyUnsubscribeToken("no-dots-in-token", "sub-1", "a@b.com", secret).valid
    ).toBe(false);
    expect(
      verifyUnsubscribeToken("invalid-ts.sig", "sub-1", "a@b.com", secret).valid
    ).toBe(false);
  });
});

describe("filterSubscribers", () => {
  it("filters by single status", () => {
    const active = filterSubscribers(getMockSubscribers(), { status: "active" });
    expect(active).toHaveLength(2);
    expect(active.map((s) => s.id)).toEqual(["sub-1", "sub-2"]);
  });

  it("filters by status array", () => {
    const result = filterSubscribers(getMockSubscribers(), {
      status: ["unsubscribed", "bounced"],
    });
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(["sub-3", "sub-4"]);
  });

  it("filters by tags with 'any' match mode", () => {
    const result = filterSubscribers(getMockSubscribers(), {
      tags: ["vip"],
      tagMatchMode: "any",
    });
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(["sub-1", "sub-4"]);
  });

  it("filters by tags with 'all' match mode", () => {
    const result = filterSubscribers(getMockSubscribers(), {
      tags: ["vip", "enterprise"],
      tagMatchMode: "all",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("sub-4");
  });

  it("filters by tags with 'none' match mode", () => {
    const result = filterSubscribers(getMockSubscribers(), {
      tags: ["vip"],
      tagMatchMode: "none",
    });
    expect(result.map((s) => s.id)).toEqual(["sub-2", "sub-3"]);
  });

  it("filters by search query matching email or names", () => {
    expect(filterSubscribers(getMockSubscribers(), { search: "jones" })).toHaveLength(1);
    expect(filterSubscribers(getMockSubscribers(), { search: "alice@" })).toHaveLength(1);
    expect(filterSubscribers(getMockSubscribers(), { search: "CEO" })).toHaveLength(1); // from custom_fields
    expect(filterSubscribers(getMockSubscribers(), { search: "nonexistent" })).toHaveLength(0);
  });

  it("filters by engagement score range", () => {
    const highEngagement = filterSubscribers(getMockSubscribers(), { minEngagement: 80 });
    expect(highEngagement).toHaveLength(1);
    expect(highEngagement[0].id).toBe("sub-1");

    const lowEngagement = filterSubscribers(getMockSubscribers(), { maxEngagement: 50 });
    expect(lowEngagement).toHaveLength(2);
  });

  it("filters by creation date bounds", () => {
    const result = filterSubscribers(getMockSubscribers(), {
      createdAfter: "2026-02-15T00:00:00Z",
    });
    expect(result.map((s) => s.id)).toEqual(["sub-3", "sub-4"]);
  });
});

describe("paginateSubscribers", () => {
  const items = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

  it("paginates first page with hasNextPage true", () => {
    const page1 = paginateSubscribers(items, 1, 10);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(10);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
    expect(page1.data).toHaveLength(10);
    expect(page1.data[0]).toBe("item-1");
    expect(page1.hasNextPage).toBe(true);
    expect(page1.hasPrevPage).toBe(false);
  });

  it("paginates last page correctly", () => {
    const page3 = paginateSubscribers(items, 3, 10);
    expect(page3.page).toBe(3);
    expect(page3.data).toHaveLength(5);
    expect(page3.hasNextPage).toBe(false);
    expect(page3.hasPrevPage).toBe(true);
  });

  it("clamps out-of-bounds page requests safely", () => {
    const clampedHigh = paginateSubscribers(items, 999, 10);
    expect(clampedHigh.page).toBe(3);

    const clampedLow = paginateSubscribers(items, -5, 10);
    expect(clampedLow.page).toBe(1);
  });
});

describe("Bulk Operations", () => {
  it("bulkAddSubscribers validates emails and merges duplicates", () => {
    const existing = getMockSubscribers();
    const incoming = [
      { email: "newuser@example.com", first_name: "New", tags: ["tag1"] },
      { email: "ALICE@EXAMPLE.COM", tags: ["merged-tag"] }, // duplicate with different case
      { email: "invalid-email-no-at", first_name: "Bad" }, // invalid
    ];

    const result = bulkAddSubscribers(existing, incoming, "user-1");
    expect(result.added).toHaveLength(1);
    expect(result.added[0].email).toBe("newuser@example.com");
    expect(result.duplicates).toBe(1);
    expect(result.updated[0].tags).toContain("merged-tag");
    expect(result.updated[0].tags).toContain("vip"); // preserved existing tag
    expect(result.invalid).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it("bulkTagSubscribers adds and removes tags immutably", () => {
    const subscribers = getMockSubscribers();
    const updated = bulkTagSubscribers(
      subscribers,
      ["sub-1", "sub-2"],
      ["spring-promo"],
      ["product-updates"]
    );
    const sub1 = updated.find((s) => s.id === "sub-1")!;
    const sub2 = updated.find((s) => s.id === "sub-2")!;

    expect(sub1.tags).toContain("spring-promo");
    expect(sub2.tags).toContain("spring-promo");
    expect(sub2.tags).not.toContain("product-updates");
  });

  it("bulkUnsubscribe marks targeted subscribers as unsubscribed", () => {
    const subscribers = getMockSubscribers();
    const updated = bulkUnsubscribe(subscribers, ["sub-1"], "User requested via support");
    const sub1 = updated.find((s) => s.id === "sub-1")!;
    expect(sub1.status).toBe("unsubscribed");
    expect(sub1.unsubscribed_at).toBeDefined();
    expect(sub1.custom_fields?.unsubscribe_reason).toBe("User requested via support");
  });
});
