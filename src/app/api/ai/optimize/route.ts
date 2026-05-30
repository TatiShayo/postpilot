import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAIAccess } from "@/lib/gate";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const platformGuides: Record<string, string> = {
  twitter: "Twitter/X style: concise, punchy, under 280 characters, use emojis sparingly, 1-2 relevant hashtags max.",
  linkedin: "LinkedIn style: professional, story-driven, longer form, use line breaks for readability, 3-5 relevant hashtags.",
  instagram: "Instagram style: visually descriptive, hashtag-rich (up to 10 hashtags), use emojis, casual and engaging tone.",
  facebook: "Facebook style: conversational, community-focused, medium length, 2-3 hashtags, can include questions to drive engagement.",
  tiktok: "TikTok style: short, energetic, hook-driven, 3-5 trending hashtags, casual and authentic tone.",
};

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`optimize:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await checkAIAccess();
    if (!hasAccess) return NextResponse.json({ error: "Requires Pro or Business plan" }, { status: 403 });

    const { content, platform = "twitter", goal = "engagement" } = await request.json();
    if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

    const guide = platformGuides[platform] || platformGuides.twitter;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are a ${platform} content optimizer. Rewrite the post to be more effective. ${guide} Goal: ${goal}. Return JSON: { "optimized": "rewritten post text", "hashtags": "hashtag string", "changes": "brief explanation of what was improved" }` },
        { role: "user", content: `Original post: "${content}"` },
      ],
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    return NextResponse.json(JSON.parse(raw));
  } catch (error: any) {
    console.error("Caption optimizer error:", error);
    return NextResponse.json({ error: error.message || "Failed to optimize" }, { status: 500 });
  }
}
