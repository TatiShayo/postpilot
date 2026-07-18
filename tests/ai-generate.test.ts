import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockChatCompletionsCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockChatCompletionsCreate,
        },
      };
      constructor(_opts: unknown) {}
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("@/lib/gate", () => ({
  checkAIAccess: vi.fn().mockResolvedValue(true),
  enforceAIQuota: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("AI Generate API Route", () => {
  let handler: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/ai/generate/route");
    handler = mod.POST;
  });

  it("returns 401 when user is not authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new NextRequest("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ businessDescription: "test", platform: "twitter" }),
    });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when AI access is denied", async () => {
    const { checkAIAccess } = await import("@/lib/gate");
    vi.mocked(checkAIAccess).mockResolvedValueOnce(false);

    const req = new NextRequest("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ businessDescription: "test", platform: "twitter" }),
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = new NextRequest("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it("returns generated posts on success", async () => {
    mockChatCompletionsCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              posts: [
                {
                  content: "Check out our new product!",
                  hashtags: "#new #launch",
                  bestTime: "9:00 AM",
                },
              ],
            }),
          },
        },
      ],
    });

    const req = new NextRequest("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        businessDescription: "A coffee shop",
        platform: "twitter",
        tone: "casual",
        goal: "engagement",
        postsCount: 1,
      }),
    });
    const res = await handler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.posts).toBeDefined();
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0].content).toBe("Check out our new product!");
    expect(data.posts[0].hashtags).toBe("#new #launch");
    expect(data.posts[0].bestTime).toBe("9:00 AM");
  });

  it("returns 500 when OpenAI call fails", async () => {
    mockChatCompletionsCreate.mockRejectedValueOnce(new Error("API rate limit"));

    const req = new NextRequest("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        businessDescription: "A coffee shop",
        platform: "twitter",
      }),
    });
    const res = await handler(req);
    expect(res.status).toBe(500);
  });
});
