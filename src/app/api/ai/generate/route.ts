import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAIAccess } from "@/lib/gate";
import OpenAI from "openai";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const schema = z.object({
  businessDescription: z.string().min(1, "businessDescription is required"),
  platform: z.string().min(1, "platform is required"),
  tone: z.string().optional().default("professional"),
  goal: z.string().optional().default("engagement"),
  postsCount: z.number().min(1).max(10).optional().default(3),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { businessDescription, platform, tone, goal, postsCount } = parsed.data;

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
    const parsedResponse = JSON.parse(raw);

    return NextResponse.json({
      posts: parsedResponse.posts ?? [],
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate content. Please try again." },
      { status: 500 }
    );
  }
}
