import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { z } from "zod";
import { guardAIRequest, wrapUntrusted, PROMPT_INJECTION_GUARD } from "@/lib/ai-guard";


const platformGuides: Record<string, string> = {
  twitter: "Twitter/X style: concise, punchy, under 280 characters, use emojis sparingly, 1-2 relevant hashtags max.",
  linkedin: "LinkedIn style: professional, story-driven, longer form, use line breaks for readability, 3-5 relevant hashtags.",
  instagram: "Instagram style: visually descriptive, hashtag-rich (up to 10 hashtags), use emojis, casual and engaging tone.",
  facebook: "Facebook style: conversational, community-focused, medium length, 2-3 hashtags, can include questions to drive engagement.",
  tiktok: "TikTok style: short, energetic, hook-driven, 3-5 trending hashtags, casual and authentic tone.",
};

const schema = z.object({
  content: z.string().min(1, "content is required").max(4999, "content must be under 5000 characters"),
  platform: z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok"]).optional().default("twitter"),
  goal: z.string().min(1, "goal must not be empty").optional().default("engagement"),
});

export async function POST(request: NextRequest) {
  try {
    const guard = await guardAIRequest(request, "ai-optimize");
    if (!guard.ok) return guard.response;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content, platform, goal } = parsed.data;

    const guide = platformGuides[platform] || platformGuides.twitter;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are a ${platform} content optimizer. Rewrite the post in the ORIGINALPOST block to be more effective. ${guide} Goal: ${goal}. Return JSON: { "optimized": "rewritten post text", "hashtags": "hashtag string", "changes": "brief explanation of what was improved" }\n${PROMPT_INJECTION_GUARD}` },
        { role: "user", content: `Rewrite this post:\n${wrapUntrusted("originalPost", content)}` },
      ],
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    return NextResponse.json(JSON.parse(raw));
  } catch (error) {
    console.error("Caption optimizer error:", error);
    return NextResponse.json({ error: "Failed to optimize caption. Please try again." }, { status: 500 });
  }
}
