import { describe, it, expect } from "vitest";
import {
  renderEmailTemplate,
  extractTemplateVariables,
  validateTemplate,
  escapeHtml,
  getNestedValue,
} from "@/lib/template-engine";

describe("escapeHtml", () => {
  it("escapes special HTML characters to prevent XSS", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;&#x2F;script&gt;"
    );
    expect(escapeHtml('Hello "World" & \'Friends\'')).toBe(
      "Hello &quot;World&quot; &amp; &#39;Friends&#39;"
    );
  });

  it("handles null, undefined, and non-string inputs safely", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(12345)).toBe("12345");
    expect(escapeHtml(true)).toBe("true");
  });
});

describe("getNestedValue", () => {
  it("retrieves top-level and deeply nested properties", () => {
    const context = {
      user: {
        profile: {
          name: "Alice",
        },
      },
      count: 42,
    };
    expect(getNestedValue(context, "user.profile.name")).toBe("Alice");
    expect(getNestedValue(context, "count")).toBe(42);
    expect(getNestedValue(context, "user.profile.age")).toBeUndefined();
    expect(getNestedValue(context, "nonexistent.key")).toBeUndefined();
  });
});

describe("renderEmailTemplate — Variable Interpolation", () => {
  it("interpolates simple variables with HTML escaping by default", () => {
    const template = "Hello {{ name }}, welcome to {{ company }}!";
    const context = { name: "<b>Alice</b>", company: "PostPilot & Co." };
    const result = renderEmailTemplate(template, context);
    expect(result).toBe(
      "Hello &lt;b&gt;Alice&lt;&#x2F;b&gt;, welcome to PostPilot &amp; Co.!"
    );
  });

  it("renders raw unescaped HTML when using triple curly braces {{{ var }}}", () => {
    const template = "Content: {{{ raw_html }}}";
    const context = { raw_html: "<strong>Bold Title</strong>" };
    const result = renderEmailTemplate(template, context);
    expect(result).toBe("Content: <strong>Bold Title</strong>");
  });

  it("handles nested variable paths", () => {
    const template = "Hi {{ user.profile.first_name }} from {{ account.org.name }}!";
    const context = {
      user: { profile: { first_name: "Sarah" } },
      account: { org: { name: "Acme Corp" } },
    };
    const result = renderEmailTemplate(template, context);
    expect(result).toBe("Hi Sarah from Acme Corp!");
  });

  it("handles fallback using || syntax", () => {
    const template = "Hi {{ name || 'Friend' }}, welcome to {{ team || 'our team' }}!";
    expect(renderEmailTemplate(template, {})).toBe("Hi Friend, welcome to our team!");
    expect(renderEmailTemplate(template, { name: "Bob" })).toBe(
      "Hi Bob, welcome to our team!"
    );
  });

  it("handles empty context gracefully with default empty fallback", () => {
    const template = "Dear {{ title }} {{ last_name }},";
    const result = renderEmailTemplate(template, {});
    expect(result).toBe("Dear  ,");
  });

  it("throws error in strict mode when variable is undefined and has no fallback", () => {
    const template = "Hello {{ missing_var }}!";
    expect(() => renderEmailTemplate(template, {}, { strict: true })).toThrow(
      /Template variable "missing_var" is undefined/
    );
  });
});

describe("renderEmailTemplate — Filters", () => {
  it("applies uppercase and lowercase filters", () => {
    const template = "{{ name | uppercase }} - {{ code | lowercase }}";
    const result = renderEmailTemplate(template, { name: "alice", code: "PRO-123" });
    expect(result).toBe("ALICE - pro-123");
  });

  it("applies capitalize filter", () => {
    const template = "Hello {{ name | capitalize }}!";
    const result = renderEmailTemplate(template, { name: "jOHN" });
    expect(result).toBe("Hello John!");
  });

  it("applies trim filter", () => {
    const template = "Code: [{{ code | trim }}]";
    const result = renderEmailTemplate(template, { code: "   SAVE20   " });
    expect(result).toBe("Code: [SAVE20]");
  });

  it("applies default filter with argument", () => {
    const template = "Hi {{ name | default: 'there' }}!";
    expect(renderEmailTemplate(template, {})).toBe("Hi there!");
    expect(renderEmailTemplate(template, { name: "Charlie" })).toBe("Hi Charlie!");
  });

  it("applies url_encode filter", () => {
    const template = "https://example.com?query={{ query | url_encode }}";
    const result = renderEmailTemplate(template, { query: "hello world & more" });
    expect(result).toBe("https://example.com?query=hello%20world%20%26%20more");
  });

  it("applies date filter", () => {
    const template = "Signed up on {{ date | date: 'short' }} (Year: {{ date | date: 'year' }})";
    const result = renderEmailTemplate(template, { date: "2026-08-14T10:00:00Z" });
    expect(result).toContain("Aug 14, 2026");
    expect(result).toContain("Year: 2026");
  });

  it("applies number filter with decimal formatting", () => {
    const template = "Balance: ${{ amount | number: 2 }}";
    const result = renderEmailTemplate(template, { amount: 1499.5 });
    expect(result).toBe("Balance: $1499.50");
  });

  it("applies json filter for serialization", () => {
    const template = "Data: {{{ meta | json }}}";
    const result = renderEmailTemplate(template, { meta: { plan: "pro", active: true } });
    expect(result).toBe('Data: {"plan":"pro","active":true}');
  });

  it("chains multiple filters in sequence", () => {
    const template = "Hello {{ name | trim | lowercase | capitalize }}!";
    const result = renderEmailTemplate(template, { name: "  eLiZaBeTh  " });
    expect(result).toBe("Hello Elizabeth!");
  });
});

describe("renderEmailTemplate — Conditionals", () => {
  it("renders {{#if}} when condition is truthy", () => {
    const template = "{{#if is_vip}}⭐ VIP Customer{{/if}}";
    expect(renderEmailTemplate(template, { is_vip: true })).toBe("⭐ VIP Customer");
    expect(renderEmailTemplate(template, { is_vip: false })).toBe("");
  });

  it("renders {{#if}} ... {{else}} ... {{/if}} correctly", () => {
    const template = "Plan: {{#if is_pro}}Pro Member{{else}}Free Tier{{/if}}";
    expect(renderEmailTemplate(template, { is_pro: true })).toBe("Plan: Pro Member");
    expect(renderEmailTemplate(template, { is_pro: false })).toBe("Plan: Free Tier");
  });

  it("evaluates equality conditions in {{#if}}", () => {
    const template =
      "{{#if tier == 'business'}}Enterprise Support{{else}}Standard Support{{/if}}";
    expect(renderEmailTemplate(template, { tier: "business" })).toBe("Enterprise Support");
    expect(renderEmailTemplate(template, { tier: "free" })).toBe("Standard Support");
  });

  it("evaluates inequality conditions in {{#if}}", () => {
    const template =
      "{{#if status != 'unsubscribed'}}Send Daily Digest{{else}}Skipped{{/if}}";
    expect(renderEmailTemplate(template, { status: "active" })).toBe("Send Daily Digest");
    expect(renderEmailTemplate(template, { status: "unsubscribed" })).toBe("Skipped");
  });

  it("renders {{#unless}} correctly", () => {
    const template = "{{#unless unsubscribed}}Active Subscriber{{/unless}}";
    expect(renderEmailTemplate(template, { unsubscribed: false })).toBe("Active Subscriber");
    expect(renderEmailTemplate(template, { unsubscribed: true })).toBe("");
  });
});

describe("renderEmailTemplate — Loops", () => {
  it("renders {{#each}} for array of primitives", () => {
    const template = "<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>";
    const context = { items: ["Post 1", "Post 2", "Post 3"] };
    const result = renderEmailTemplate(template, context);
    expect(result).toBe("<ul><li>Post 1</li><li>Post 2</li><li>Post 3</li></ul>");
  });

  it("renders {{#each}} for array of objects with @index", () => {
    const template =
      "{{#each posts}}#{{@index}}: {{title}} ({{likes}} likes)\n{{/each}}";
    const context = {
      posts: [
        { title: "Intro", likes: 10 },
        { title: "Launch", likes: 50 },
      ],
    };
    const result = renderEmailTemplate(template, context);
    expect(result).toBe("#0: Intro (10 likes)\n#1: Launch (50 likes)\n");
  });

  it("renders empty string when list is empty or not an array", () => {
    const template = "{{#each emptyList}}Item: {{this}}{{/each}}";
    expect(renderEmailTemplate(template, { emptyList: [] })).toBe("");
    expect(renderEmailTemplate(template, {})).toBe("");
  });
});

describe("extractTemplateVariables", () => {
  it("extracts all unique variables from simple and filtered expressions", () => {
    const template = `
      Hi {{ user.name | capitalize }},
      Your balance is {{ balance | number: 2 }} on {{ billing.date }}.
      {{#if is_vip}}
        VIP perk: {{ perk_name }}
      {{/if}}
      {{#each items}}
        Item: {{ this }}
      {{/each}}
      {{ fallback_test || 'default' }}
    `;
    const vars = extractTemplateVariables(template);
    expect(vars).toContain("user.name");
    expect(vars).toContain("balance");
    expect(vars).toContain("billing.date");
    expect(vars).toContain("is_vip");
    expect(vars).toContain("perk_name");
    expect(vars).toContain("items");
    expect(vars).toContain("fallback_test");
  });
});

describe("validateTemplate", () => {
  it("validates well-formed template syntax", () => {
    const template = "Hello {{ name }}, check {{ link }}!";
    const result = validateTemplate(template, ["name", "link"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.variables).toEqual(["name", "link"]);
  });

  it("detects missing required variables", () => {
    const template = "Hello {{ name }}!";
    const result = validateTemplate(template, ["name", "unsubscribe_url"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Required variable "unsubscribe_url" is missing from template.'
    );
  });

  it("detects unclosed {{#if}} tags", () => {
    const template = "{{#if is_active}}Hello {{ name }}";
    const result = validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Mismatched {{#if}} tags");
  });

  it("detects unclosed {{#each}} tags", () => {
    const template = "{{#each items}}<li>{{this}}</li>";
    const result = validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Mismatched {{#each}} tags");
  });

  it("fails on empty template content", () => {
    const result = validateTemplate("   ");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Template content cannot be empty.");
  });
});
