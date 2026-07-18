import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAIAccess } from "@/lib/gate";
import OpenAI from "openai";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const postSchema = z.object({
  businessDescription: z.string().min(1, "businessDescription is required"),
  platforms: z.array(z.string()).optional().default(["twitter"]),
});

const saveSchema = z.object({
  posts: z.array(z.object({
    content: z.string(),
    platform: z.string(),
    hashtags: z.string().optional(),
    date: z.string(),
    bestTime: z.string().optional(),
  })).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`generate-month:${ip}`);
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
        { error: "AI access requires a Pro or Business plan." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { businessDescription, platforms } = parsed.data;

    const platformList = platforms.join(", ");
    const startDate = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    const systemPrompt = `You are a social media strategist. Generate 30 post ideas for a business described below.
Schedule one post per day for the next 30 days, distributing across these platforms: ${platformList}.
Each day should have ONE post. Alternate between platforms naturally.

Return a JSON object with a "posts" array of exactly 30 items. Each item must have:
- date: the date in YYYY-MM-DD format (${dates[0]} through ${dates[29]})
- platform: one of [${platformList}]
- content: the post text
- hashtags: relevant hashtags
- bestTime: suggested posting time (e.g. "9:00 AM")

No preamble, no markdown, just valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Business: ${businessDescription}\nPlatforms: ${platformList}\nGenerate 30 daily post ideas.`,
        },
      ],
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw);

    return NextResponse.json({
      posts: result.posts ?? [],
    });
  } catch (error: any) {
    console.error("AI month generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate month plan. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`generate-month-put:${ip}`);
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

    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { posts } = parsed.data;

    const dbPosts = posts.map((post: any) => ({
      user_id: user.id,
      content: post.content,
      platform: post.platform,
      hashtags: post.hashtags,
      scheduled_at: `${post.date}T${post.bestTime?.replace(/:00 /, ":00") || "09:00:00"}`,
      status: "scheduled",
    }));

    const { error } = await supabase.from("posts").insert(dbPosts);

    if (error) {
      console.error("Failed to save posts:", error);
      return NextResponse.json(
        { error: "Failed to save posts to database" },
        { status: 500 }
      );
    }

    return NextResponse.json({ saved: dbPosts.length });
  } catch (error: any) {
    console.error("Bulk save error:", error);
    return NextResponse.json(
      { error: "Failed to save posts. Please try again." },
      { status: 500 }
    );
  }
}
