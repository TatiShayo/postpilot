import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAIAccess } from "@/lib/gate";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`hashtags:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await checkAIAccess();
    if (!hasAccess) return NextResponse.json({ error: "Requires Pro or Business plan" }, { status: 403 });

    const { content, platform = "twitter" } = await request.json();
    if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are a hashtag expert. Given a ${platform} post, suggest 10-15 relevant hashtags ranked by estimated reach (highest first). Return JSON: { "hashtags": ["#tag1", "#tag2", ...] }` },
        { role: "user", content: `Post: "${content}"` },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    return NextResponse.json(JSON.parse(raw));
  } catch (error: any) {
    console.error("Hashtag suggester error:", error);
    return NextResponse.json({ error: error.message || "Failed to suggest hashtags" }, { status: 500 });
  }
}
