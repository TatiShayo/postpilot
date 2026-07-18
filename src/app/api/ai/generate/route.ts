import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { guardAIRequest, wrapUntrusted, PROMPT_INJECTION_GUARD } from "@/lib/ai-guard";

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
    const guard = await guardAIRequest(request, "ai-generate");
    if (!guard.ok) return guard.response;

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
Tone: ${tone}. Goal: ${goal}.
The business is described in the BUSINESSDESCRIPTION block below.
Return a JSON object with a "posts" array. Each post object must have: content, hashtags, bestTime.
No preamble, no markdown, just valid JSON.
${PROMPT_INJECTION_GUARD}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate ${postsCount} social media posts for ${platform}.\n${wrapUntrusted(
            "businessDescription",
            businessDescription
          )}`,
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
