import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { escapeHtml } from "@/lib/template-engine";
import { validateEmail } from "@/lib/email-validator";

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

const schema = z.object({
  email: z.string().max(254),
  name: z.string().max(200).optional(),
  stats: z
    .object({
      postsPublished: z.number().optional(),
      postsScheduled: z.number().optional(),
      totalEngagement: z.number().optional(),
      topPost: z.string().max(2000).optional(),
    })
    .optional(),
});

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const hashA = createHmac("sha256", "postpilot-cron-secret-guard").update(a).digest();
  const hashB = createHmac("sha256", "postpilot-cron-secret-guard").update(b).digest();
  return timingSafeEqual(hashA, hashB) && a === b;
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || cronSecret.trim() === "") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !safeEqual(authHeader, `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { email, name, stats } = parsed.data;

    // Strict RFC email & CRLF header injection check
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid || !emailValidation.normalizedEmail) {
      return NextResponse.json({ error: "Invalid recipient email address." }, { status: 400 });
    }

    const cleanName = (name || "there").replace(/[\r\n\x00-\x1F\x7F]/g, "").slice(0, 100);
    const safeName = escapeHtml(cleanName);
    const safeTopPost = stats?.topPost ? escapeHtml(stats.topPost.replace(/\x00/g, "")) : "";
    const publishedCount = Number.isFinite(stats?.postsPublished) ? stats!.postsPublished! : 0;
    const scheduledCount = Number.isFinite(stats?.postsScheduled) ? stats!.postsScheduled! : 0;
    const engagementCount = Number.isFinite(stats?.totalEngagement) ? stats!.totalEngagement! : 0;

    const { data, error } = await getResend().emails.send({
      from: "PostPilot <weekly@postpilot.app>",
      to: [emailValidation.normalizedEmail],
      subject: `Your PostPilot Weekly Report — ${publishedCount} posts this week`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111118;color:#e4e4e7;padding:40px;border-radius:12px;">
          <h1 style="color:#a78bfa;margin-bottom:24px;">PostPilot Weekly Report</h1>
          <p style="margin-bottom:24px;">Hi ${safeName} 👋</p>
          <p style="margin-bottom:16px;">Here's your social media roundup for this week:</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:16px;background:#1c1c2e;border-radius:8px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#a78bfa;">${publishedCount}</div>
                <div style="font-size:12px;color:#71717a;">Posts Published</div>
              </td>
              <td style="width:12px;"></td>
              <td style="padding:16px;background:#1c1c2e;border-radius:8px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#a78bfa;">${scheduledCount}</div>
                <div style="font-size:12px;color:#71717a;">Scheduled</div>
              </td>
              <td style="width:12px;"></td>
              <td style="padding:16px;background:#1c1c2e;border-radius:8px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#a78bfa;">${engagementCount.toLocaleString()}</div>
                <div style="font-size:12px;color:#71717a;">Engagement</div>
              </td>
            </tr>
          </table>

          ${safeTopPost ? `<div style="background:#1c1c2e;padding:16px;border-radius:8px;margin-bottom:24px;">
            <div style="font-size:12px;color:#71717a;margin-bottom:8px;">🌟 Top Performing Post</div>
            <div style="font-size:14px;line-height:1.6;">${safeTopPost}</div>
          </div>` : ""}

          <a href="https://postpilot.app/dashboard" style="display:inline-block;background:linear-gradient(to right,#8b5cf6,#7c3aed);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            View Dashboard →
          </a>

          <p style="font-size:12px;color:#52525b;margin-top:32px;border-top:1px solid #1c1c2e;padding-top:16px;">
            You're receiving this because you enabled weekly reports in settings.
            <br />Sent by PostPilot — AI Social Media Management
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Email send error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ sent: true, id: data?.id });
  } catch (error) {
    console.error("Weekly report error:", error);
    return NextResponse.json({ error: "Failed to process weekly report." }, { status: 500 });
  }
}
