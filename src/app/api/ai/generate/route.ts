import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAIAccess } from "@/lib/gate";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkAIAccess();
    if (!hasAccess) {
      return NextResponse.json(
        { error: "AI access requires a Pro or Business plan. Upgrade to continue." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      businessDescription,
      platform,
      tone = "professional",
      goal = "engagement",
      postsCount = 3,
    } = body;

    if (!businessDescription || !platform) {
      return NextResponse.json(
        { error: "Missing required fields: businessDescription, platform" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a social media expert. Generate ${postsCount} engaging posts for ${platform}. 
Business: ${businessDescription}. Tone: ${tone}. Goal: ${goal}. 
Return a JSON object with a "posts" array. Each post object must have: content, hashtags, bestTime.
No preamble, no markdown, just valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate ${postsCount} social media posts for ${platform}.`,
        },
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      posts: parsed.posts ?? [],
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
