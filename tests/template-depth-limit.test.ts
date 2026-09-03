import { describe, it, expect } from "vitest";
import { renderTemplate, validateTemplate, getNestedValue } from "../src/lib/template-engine";

describe("Template Engine Resilience & Depth Boundary", () => {
  it("safely handles deeply nested conditional structures without crash or stack overflow", () => {
    let deepTemplate = "Hello";
    for (let i = 0; i < 30; i++) {
      deepTemplate = `{{#if flag_${i}}}${deepTemplate}{{/if}}`;
    }

    const context: Record<string, boolean> = {};
    for (let i = 0; i < 30; i++) {
      context[`flag_${i}`] = true;
    }

    // Must not crash or loop infinitely
    const rendered = renderTemplate(deepTemplate, context);
    expect(typeof rendered).toBe("string");
  });

  it("blocks prototype pollution attacks through nested variable paths", () => {
    const maliciousPaths = [
      "__proto__.polluted",
      "constructor.prototype.admin",
      "prototype.isAdmin",
      "user.__proto__.role",
    ];

    const context = {
      user: { name: "Alice" }
    };

    for (const path of maliciousPaths) {
      expect(getNestedValue(context, path)).toBeUndefined();
    }

    // Verify global Object.prototype was NOT polluted
    expect((Object.prototype as any).polluted).toBeUndefined();
    expect((Object.prototype as any).admin).toBeUndefined();
  });

  it("rejects oversized templates exceeding maximum safety length", () => {
    const hugeTemplate = "a".repeat(600_000);
    const validation = validateTemplate(hugeTemplate);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("exceeds maximum allowed size"))).toBe(true);
  });
});
