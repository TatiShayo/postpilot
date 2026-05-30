import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("A valid email is required"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`waitlist:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Invalid email" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from("waitlist").insert({
      email: parsed.data.email,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You're already on the list!" },
          { status: 200 }
        );
      }
      console.error("Waitlist error:", error);
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "You're on the list! Check your inbox." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Waitlist error:", { message: error.message, details: error.details, hint: error.hint, code: error.code });
    return NextResponse.json(
      { error: "Failed to join waitlist. Please try again later." },
      { status: 500 }
    );
  }
}
