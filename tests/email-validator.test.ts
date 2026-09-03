import { describe, it, expect } from "vitest";
import {
  validateEmail,
  normalizeEmail,
  extractSubaddress,
  isDisposableEmail,
  suggestEmailDomain,
} from "@/lib/email-validator";

describe("validateEmail — RFC Syntax & Valid Emails", () => {
  it("accepts standard valid email addresses", () => {
    const validEmails = [
      "user@example.com",
      "first.last@company.org",
      "john_doe123@sub.domain.co.uk",
      "customer+tag@gmail.com",
      "support@postpilot.app",
      "dev-team@tech.io",
      "valid.email+with+multiple+pluses@domain.com",
    ];

    for (const email of validEmails) {
      const res = validateEmail(email);
      expect(res.isValid, `Failed for ${email}: ${res.error}`).toBe(true);
      expect(res.normalizedEmail).toBeDefined();
    }
  });

  it("normalizes domains to lowercase while preserving valid structure", () => {
    const res = validateEmail("User.Name@Example.COM");
    expect(res.isValid).toBe(true);
    expect(res.normalizedEmail).toBe("User.Name@example.com");
    expect(res.domain).toBe("example.com");
  });

  it("handles non-string inputs safely", () => {
    expect(validateEmail(null).isValid).toBe(false);
    expect(validateEmail(undefined).isValid).toBe(false);
    expect(validateEmail(12345).isValid).toBe(false);
    expect(validateEmail({}).isValid).toBe(false);
  });

  it("rejects empty or whitespace-only emails", () => {
    expect(validateEmail("").isValid).toBe(false);
    expect(validateEmail("   ").isValid).toBe(false);
  });
});

describe("validateEmail — Length & RFC Bounds Checks", () => {
  it("rejects emails exceeding 254 total characters (RFC 5321)", () => {
    const longDomain = "a".repeat(60) + ".com";
    const longLocal = "b".repeat(60);
    const validEmail = `${longLocal}@${longDomain}`; // ~125 chars
    expect(validateEmail(validEmail).isValid).toBe(true);

    const superLongLocal = "a".repeat(64);
    const superLongDomain =
      "b".repeat(60) + "." + "c".repeat(60) + "." + "d".repeat(60) + "." + "e".repeat(20) + ".com";
    const overlyLong = `${superLongLocal}@${superLongDomain}`; // > 254 chars (64 + 1 + 207 = 272 chars)
    const res = validateEmail(overlyLong);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("exceeds maximum length of 254");
  });

  it("rejects local parts exceeding 64 octets (RFC 5321)", () => {
    const longLocal = "a".repeat(65);
    const res = validateEmail(`${longLocal}@example.com`);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("local part exceeds maximum length of 64");
  });

  it("rejects domain labels exceeding 63 octets (RFC 1035)", () => {
    const longLabel = "a".repeat(64);
    const res = validateEmail(`user@${longLabel}.com`);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Domain label exceeds 63 characters");
  });
});

describe("validateEmail — Security & Header Injection Prevention", () => {
  it("rejects CRLF injection attempts", () => {
    const malicious = [
      "victim@domain.com\r\nBcc: attacker@evil.com",
      "user\n@domain.com",
      "user\r@domain.com",
    ];

    expect(validateEmail(malicious[0]).isValid).toBe(false);
    expect(validateEmail(malicious[1]).isValid).toBe(false);
    expect(validateEmail(malicious[2]).isValid).toBe(false);
  });

  it("rejects null bytes and non-printable control characters", () => {
    expect(validateEmail("user\x00@domain.com").isValid).toBe(false);
    expect(validateEmail("user\x1F@domain.com").isValid).toBe(false);
    expect(validateEmail("user\x7F@domain.com").isValid).toBe(false);
  });
});

describe("validateEmail — Syntax Violations", () => {
  it("rejects emails without '@' symbol", () => {
    const res = validateEmail("plainaddress.com");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("missing '@'");
  });

  it("rejects emails with multiple '@' symbols", () => {
    const res = validateEmail("user@domain@evil.com");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("multiple '@'");
  });

  it("rejects leading or trailing dots in local part", () => {
    expect(validateEmail(".user@example.com").isValid).toBe(false);
    expect(validateEmail("user.@example.com").isValid).toBe(false);
  });

  it("rejects consecutive dots in local part", () => {
    const res = validateEmail("user..name@example.com");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("consecutive dots");
  });

  it("rejects domain starting or ending with hyphen", () => {
    expect(validateEmail("user@-domain.com").isValid).toBe(false);
    expect(validateEmail("user@domain-.com").isValid).toBe(false);
  });

  it("rejects missing TLD in strict mode", () => {
    const res = validateEmail("user@localhost", { strictDomainCheck: true });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Top-Level Domain");
  });
});

describe("isDisposableEmail & Disposable Detection", () => {
  it("detects known temporary and disposable domains", () => {
    expect(isDisposableEmail("test@mailinator.com")).toBe(true);
    expect(isDisposableEmail("anon@10minutemail.com")).toBe(true);
    expect(isDisposableEmail("guerrillamail.com")).toBe(true);
    expect(isDisposableEmail("tempmail.com")).toBe(true);
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
  });

  it("rejects disposable domains by default in validateEmail", () => {
    const res = validateEmail("user@mailinator.com");
    expect(res.isValid).toBe(false);
    expect(res.isDisposable).toBe(true);
    expect(res.error).toContain("Disposable / temporary email");
  });

  it("allows disposable domains when allowDisposable is explicitly enabled", () => {
    const res = validateEmail("user@mailinator.com", { allowDisposable: true });
    expect(res.isValid).toBe(true);
    expect(res.isDisposable).toBe(true);
  });
});

describe("suggestEmailDomain & Typo Suggestions", () => {
  it("suggests corrected domain for common typos", () => {
    expect(suggestEmailDomain("gmial.com")).toBe("gmail.com");
    expect(suggestEmailDomain("gamil.com")).toBe("gmail.com");
    expect(suggestEmailDomain("hotmial.com")).toBe("hotmail.com");
    expect(suggestEmailDomain("yaho.com")).toBe("yahoo.com");
    expect(suggestEmailDomain("outlok.com")).toBe("outlook.com");
    expect(suggestEmailDomain("protonmai.com")).toBe("protonmail.com");
    expect(suggestEmailDomain("gmail.com")).toBeNull();
  });

  it("includes typo suggestion in validateEmail result", () => {
    const res = validateEmail("user@gmial.com");
    expect(res.isValid).toBe(true);
    expect(res.typoSuggestion).toBe("user@gmail.com");
  });
});

describe("extractSubaddress & normalizeEmail", () => {
  it("extracts subaddress tags and computes canonical address", () => {
    const parsed = extractSubaddress("alex+newsletter123@company.com");
    expect(parsed.base).toBe("alex");
    expect(parsed.tag).toBe("newsletter123");
    expect(parsed.domain).toBe("company.com");

    const regular = extractSubaddress("alex@company.com");
    expect(regular.base).toBe("alex");
    expect(regular.tag).toBeNull();
    expect(regular.domain).toBe("company.com");
  });

  it("computes canonical email in validation result", () => {
    const res = validateEmail("alex+promo@gmail.com");
    expect(res.isValid).toBe(true);
    expect(res.canonicalEmail).toBe("alex@gmail.com");
    expect(res.subaddressTag).toBe("promo");
  });

  it("normalizes emails properly", () => {
    expect(normalizeEmail("  Hello@World.Com  ")).toBe("Hello@world.com");
    expect(normalizeEmail("")).toBe("");
  });
});
