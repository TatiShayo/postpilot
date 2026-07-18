import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { guardAIRequest, wrapUntrusted, PROMPT_INJECTION_GUARD } from "@/lib/ai-guard";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const schema = z.object({
  content: z.string().min(1, "content is required").max(4999, "content must be under 5000 characters"),
  platform: z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok"]).optional().default("twitter"),
});

export async function POST(request: NextRequest) {
  try {
    const guard = await guardAIRequest(request, "ai-hashtags");
    if (!guard.ok) return guard.response;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content, platform } = parsed.data;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are a hashtag expert. Given the ${platform} post in the POST block, suggest 10-15 relevant hashtags ranked by estimated reach (highest first). Return JSON: { "hashtags": ["#tag1", "#tag2", ...] }\n${PROMPT_INJECTION_GUARD}` },
        { role: "user", content: `Suggest hashtags for this post:\n${wrapUntrusted("post", content)}` },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    return NextResponse.json(JSON.parse(raw));
  } catch (error) {
    console.error("Hashtag suggester error:", error);
    return NextResponse.json({ error: "Failed to suggest hashtags. Please try again." }, { status: 500 });
  }
}
