import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, name, stats } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: "PostPilot <weekly@postpilot.app>",
      to: [email],
      subject: `Your PostPilot Weekly Report — ${stats?.postsPublished || 0} posts this week`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111118;color:#e4e4e7;padding:40px;border-radius:12px;">
          <h1 style="color:#a78bfa;margin-bottom:24px;">PostPilot Weekly Report</h1>
          <p style="margin-bottom:24px;">Hi ${name || "there"} 👋</p>
          <p style="margin-bottom:16px;">Here's your social media roundup for this week:</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:16px;background:#1c1c2e;border-radius:8px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#a78bfa;">${stats?.postsPublished || 0}</div>
                <div style="font-size:12px;color:#71717a;">Posts Published</div>
              </td>
              <td style="width:12px;"></td>
              <td style="padding:16px;background:#1c1c2e;border-radius:8px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#a78bfa;">${stats?.postsScheduled || 0}</div>
                <div style="font-size:12px;color:#71717a;">Scheduled</div>
              </td>
              <td style="width:12px;"></td>
              <td style="padding:16px;background:#1c1c2e;border-radius:8px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#a78bfa;">${stats?.totalEngagement?.toLocaleString() || 0}</div>
                <div style="font-size:12px;color:#71717a;">Engagement</div>
              </td>
            </tr>
          </table>

          ${stats?.topPost ? `<div style="background:#1c1c2e;padding:16px;border-radius:8px;margin-bottom:24px;">
            <div style="font-size:12px;color:#71717a;margin-bottom:8px;">🌟 Top Performing Post</div>
            <div style="font-size:14px;line-height:1.6;">${stats.topPost}</div>
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
  } catch (error: any) {
    console.error("Weekly report error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
