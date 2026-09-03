import { describe, it, expect } from "vitest";
import { getSafeRedirectPath } from "@/app/auth/callback/route";
import { escapeHtml } from "@/lib/template-engine";
import { rateLimit } from "@/lib/rate-limit";

describe("getSafeRedirectPath — Open Redirect Protection", () => {
  it("allows safe internal application relative paths", () => {
    expect(getSafeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectPath("/dashboard/settings")).toBe("/dashboard/settings");
    expect(getSafeRedirectPath("/dashboard/compose?ref=draft1")).toBe(
      "/dashboard/compose?ref=draft1"
    );
    expect(getSafeRedirectPath("/dashboard/billing?success=true")).toBe(
      "/dashboard/billing?success=true"
    );
  });

  it("blocks external URLs and protocol schemes", () => {
    expect(getSafeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("http://attacker.com/steal")).toBe("/dashboard");
    expect(getSafeRedirectPath("ftp://malicious.org")).toBe("/dashboard");
    expect(getSafeRedirectPath("javascript:alert(document.cookie)")).toBe(
      "/dashboard"
    );
    expect(getSafeRedirectPath("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(
      "/dashboard"
    );
  });

  it("blocks protocol-relative URLs (//attacker.com)", () => {
    expect(getSafeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("//attacker.com/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectPath("///evil.com")).toBe("/dashboard");
  });

  it("blocks backslash open redirect bypasses (/\\attacker.com)", () => {
    expect(getSafeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("/\\attacker.com/login")).toBe("/dashboard");
  });

  it("blocks null bytes and control characters in redirect path", () => {
    expect(getSafeRedirectPath("/dashboard\x00evil")).toBe("/dashboard");
    expect(getSafeRedirectPath("/dashboard\r\nLocation: https://evil.com")).toBe(
      "/dashboard"
    );
  });

  it("handles null, empty, or undefined next parameter", () => {
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
    expect(getSafeRedirectPath("")).toBe("/dashboard");
    expect(getSafeRedirectPath("   ")).toBe("/dashboard");
  });
});

describe("Weekly Report Email Security & Sanitization", () => {
  it("escapes user input in email HTML payload", () => {
    const maliciousName = '<img src=x onerror="alert(1)"> Alice';
    const escapedName = escapeHtml(maliciousName);
    expect(escapedName).not.toContain("<img");
    expect(escapedName).toBe(
      "&lt;img src&#x3D;x onerror&#x3D;&quot;alert(1)&quot;&gt; Alice"
    );

    const maliciousPost = '<script>fetch("https://evil.com/steal")</script> Amazing deal!';
    const escapedPost = escapeHtml(maliciousPost);
    expect(escapedPost).not.toContain("<script>");
    expect(escapedPost).toContain("&lt;script&gt;");
  });
});

describe("rateLimit helper security", () => {
  it("tracks and limits burst requests", () => {
    const key = `test-key-${Date.now()}`;
    const limit = 3;

    const r1 = rateLimit(key, { max: limit, windowMs: 10000 });
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, { max: limit, windowMs: 10000 });
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, { max: limit, windowMs: 10000 });
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    const r4 = rateLimit(key, { max: limit, windowMs: 10000 });
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});
