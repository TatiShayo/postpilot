import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Denial-of-wallet regression: even an authenticated Pro user who has exhausted
// their monthly AI quota must be blocked BEFORE any billable OpenAI call.

const mockChatCompletionsCreate = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockChatCompletionsCreate } };
    constructor(_opts: any) {}
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("@/lib/gate", () => ({
  checkAIAccess: vi.fn().mockResolvedValue(true),
  enforceAIQuota: vi.fn(),
}));

describe("AI denial-of-wallet quota", () => {
  let handler: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/ai/generate/route");
    handler = mod.POST;
  });

  function req() {
    return new NextRequest("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ businessDescription: "coffee", platform: "twitter" }),
    });
  }

  it("returns 429 and makes NO OpenAI call when quota is exhausted", async () => {
    const { enforceAIQuota } = await import("@/lib/gate");
    vi.mocked(enforceAIQuota).mockResolvedValueOnce({
      ok: false,
      reason: "quota_exceeded",
    });

    const res = await handler(req());
    expect(res.status).toBe(429);
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("proceeds to the OpenAI call once a credit is granted", async () => {
    const { enforceAIQuota } = await import("@/lib/gate");
    vi.mocked(enforceAIQuota).mockResolvedValueOnce({ ok: true });
    mockChatCompletionsCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ posts: [] }) } }],
    });

    const res = await handler(req());
    expect(res.status).toBe(200);
    expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1);
  });
});
