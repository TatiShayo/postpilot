import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockConstructEvent = vi.fn();

// Table-aware supabase admin mock. `stripe_events` gets its own insert spy so we
// can simulate a first-time insert (error: null) vs. a duplicate/replay (23505).
const eventsInsert = vi.fn();
const profileUpdateEq = vi.fn().mockResolvedValue({ error: null });
const subUpsert = vi.fn().mockResolvedValue({ error: null });
const subUpdateEq = vi.fn().mockResolvedValue({ error: null });
const profileSelectEq = vi.fn().mockResolvedValue({ data: [{ id: "user-1" }] });

function makeFrom() {
  return (table: string) => {
    if (table === "stripe_events") {
      return { insert: eventsInsert };
    }
    if (table === "subscriptions") {
      return {
        upsert: subUpsert,
        update: vi.fn().mockReturnValue({ eq: subUpdateEq }),
      };
    }
    // profiles
    return {
      select: vi.fn().mockReturnValue({ eq: profileSelectEq }),
      update: vi.fn().mockReturnValue({ eq: profileUpdateEq }),
    };
  };
}

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: makeFrom() }),
  createAdminClient: vi.fn().mockReturnValue({ from: makeFrom() }),
}));

function makeReq() {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "valid_sig" },
    body: "{}",
  });
}

describe("Stripe Webhook Handler", () => {
  let handler: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    eventsInsert.mockResolvedValue({ error: null }); // first delivery: not seen
    profileSelectEq.mockResolvedValue({ data: [{ id: "user-1" }] });
    const mod = await import("@/app/api/webhooks/stripe/route");
    handler = mod.POST;
  });

  it("returns 400 for invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(400);
    // Signature failed → we must never touch the idempotency ledger or DB.
    expect(eventsInsert).not.toHaveBeenCalled();
  });

  it("returns 200 for valid subscription.created event", async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: "evt_1",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_456",
          items: { data: [{ price: { nickname: "pro" } }] },
          current_period_end: 1717200000,
          status: "active",
        },
      },
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(200);
    expect(subUpsert).toHaveBeenCalledTimes(1);
  });

  it("returns 200 for subscription.deleted event", async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: "evt_2",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_123", customer: "cus_456" } },
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(200);
  });

  it("returns 200 for unhandled event type", async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: "evt_3",
      type: "invoice.paid",
      data: { object: {} },
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(200);
  });

  // REGRESSION: webhook replay / double-delivery must not re-provision.
  it("skips re-processing a replayed (duplicate) event", async () => {
    const event = {
      id: "evt_replay",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_999",
          customer: "cus_999",
          items: { data: [{ price: { nickname: "business" } }] },
          current_period_end: 1717200000,
          status: "active",
        },
      },
    };

    // First delivery: ledger insert succeeds, subscription provisioned once.
    mockConstructEvent.mockReturnValueOnce(event);
    const first = await handler(makeReq());
    expect(first.status).toBe(200);
    expect(subUpsert).toHaveBeenCalledTimes(1);

    // Replay: ledger insert hits the unique constraint (23505).
    eventsInsert.mockResolvedValueOnce({ error: { code: "23505" } });
    mockConstructEvent.mockReturnValueOnce(event);
    const second = await handler(makeReq());
    const body = await second.json();

    expect(second.status).toBe(200);
    expect(body.duplicate).toBe(true);
    // Critically: no second provisioning happened.
    expect(subUpsert).toHaveBeenCalledTimes(1);
  });
});
