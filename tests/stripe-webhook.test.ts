import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockConstructEvent = vi.fn();
const mockSupabaseUpsert = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockSupabaseFrom,
  }),
  createAdminClient: vi.fn().mockReturnValue({
    from: mockSupabaseFrom,
  }),
}));

describe("Stripe Webhook Handler", () => {
  let handler: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: mockSupabaseUpsert.mockResolvedValue({ error: null }),
    });
    const mod = await import("@/app/api/webhooks/stripe/route");
    handler = mod.POST;
  });

  it("returns 400 for invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "bad_sig" },
      body: "{}",
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 for valid subscription.created event", async () => {
    const subscriptionId = "sub_123";
    const customerId = "cus_456";

    mockConstructEvent.mockReturnValueOnce({
      type: "customer.subscription.created",
      data: {
        object: {
          id: subscriptionId,
          customer: customerId,
          items: {
            data: [{ price: { nickname: "pro" } }],
          },
          current_period_end: 1717200000,
          status: "active",
        },
      },
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      data: [{ id: "user-1" }],
    });

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "valid_sig" },
      body: "{}",
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });

  it("returns 200 for subscription.deleted event", async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_456",
        },
      },
    });

    const mockEq = vi.fn().mockResolvedValue({
      data: [{ id: "user-1" }],
    });

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "valid_sig" },
      body: "{}",
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });

  it("returns 200 for unhandled event type", async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: "invoice.paid",
      data: { object: {} },
    });

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "valid_sig" },
      body: "{}",
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });
});
