/**
 * Robust Email Template Variable Interpolation Engine
 *
 * Supports:
 * - Variable substitution: {{ name }}, {{ user.email }}, {{ custom_fields.company }}
 * - Default fallbacks: {{ name | default: 'Friend' }}, {{ name || 'there' }}
 * - Filters: uppercase, lowercase, capitalize, trim, escape, url_encode, date, number, json
 * - Conditionals: {{#if is_vip}}⭐ VIP{{else}}Regular{{/if}}, {{#unless unsubscribed}}...{{/unless}}
 * - Nested Conditionals: {{#if outer}}{{#if inner}}...{{/if}}{{/if}}
 * - Loops: {{#each items}}<li>{{this}}</li>{{/each}}
 * - HTML Safety: Auto-escapes variables (preventing XSS in email clients), {{{ raw }}} for unescaped HTML
 * - AST / Regex extraction and template syntax validation
 * - Security Hardening: Prototype pollution defense, ReDoS defense, bounds enforcement, null byte stripping
 */

export interface TemplateRenderOptions {
  strict?: boolean; // If true, throws/errors on undefined variables without fallbacks
  defaultFallback?: string; // Default string when a variable is null/undefined (default: "")
  escapeByDefault?: boolean; // Default true
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  variables: string[];
  hasConditionals: boolean;
  hasLoops: boolean;
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_TEMPLATE_LENGTH = 500_000;
const MAX_LOOP_ITEMS = 5000;

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Safely resolves nested property paths with strict prototype-pollution defense
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  if (typeof path !== "string") return undefined;
  
  const cleanPath = path.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!cleanPath) return undefined;

  const keys = cleanPath.split(".");
  let current: any = obj;

  for (const rawKey of keys) {
    const key = rawKey.trim();
    if (!key || DANGEROUS_KEYS.has(key)) return undefined;
    if (current === null || current === undefined || typeof current !== "object") return undefined;

    if (Array.isArray(current)) {
      if (!/^\d+$/.test(key)) return undefined;
      const idx = parseInt(key, 10);
      current = current[idx];
    } else if (Object.prototype.hasOwnProperty.call(current, key)) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  // Prevent returning functions directly
  if (typeof current === "function") return undefined;

  return current;
}

function applyFilter(value: unknown, filterName: string, rawFilterArg?: string): unknown {
  const name = filterName.trim().toLowerCase();
  const filterArg = rawFilterArg ? rawFilterArg.replace(/^['"]|['"]$/g, "").trim() : undefined;

  switch (name) {
    case "uppercase":
    case "upper":
      return typeof value === "string" ? value.toUpperCase() : String(value ?? "").toUpperCase();

    case "lowercase":
    case "lower":
      return typeof value === "string" ? value.toLowerCase() : String(value ?? "").toLowerCase();

    case "capitalize": {
      const str = String(value ?? "");
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    case "trim":
      return typeof value === "string" ? value.trim() : String(value ?? "").trim();

    case "escape":
      return escapeHtml(value);

    case "url_encode":
    case "urlencode": {
      try {
        return encodeURIComponent(String(value ?? ""));
      } catch {
        return "";
      }
    }

    case "default": {
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
      return filterArg ?? "";
    }

    case "date": {
      if (!value) return "";
      try {
        const d = new Date(value as string | number | Date);
        if (!Number.isFinite(d.getTime())) return String(value);
        if (filterArg === "short") {
          return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          });
        }
        if (filterArg === "year") {
          return String(d.getUTCFullYear());
        }
        return d.toISOString().split("T")[0];
      } catch {
        return String(value);
      }
    }

    case "number": {
      const num = Number(value);
      if (!Number.isFinite(num)) return String(value ?? 0);
      if (filterArg !== undefined) {
        const decimals = parseInt(filterArg, 10);
        if (Number.isFinite(decimals)) {
          const clamped = Math.max(0, Math.min(20, decimals));
          return num.toFixed(clamped);
        }
      }
      return num.toLocaleString("en-US");
    }

    case "json":
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }

    default:
      return value;
  }
}

/**
 * Parses and evaluates an expression such as:
 * user.name | default: 'there' | capitalize
 * or user.name || 'there'
 */
function evaluateExpression(
  expr: string,
  context: Record<string, any>,
  options: TemplateRenderOptions
): { value: unknown; isRaw: boolean } {
  const trimmed = expr.trim();
  const isRaw = trimmed.startsWith("{") && trimmed.endsWith("}");
  const cleanExpr = isRaw ? trimmed.slice(1, -1).trim() : trimmed;

  // Check for `||` fallback syntax e.g. `name || 'there'`
  if (cleanExpr.includes("||")) {
    const parts = cleanExpr.split("||").map((p) => p.trim());
    const varPath = parts[0];
    const val = getNestedValue(context, varPath);
    if (val !== undefined && val !== null && val !== "") {
      return { value: val, isRaw };
    }
    let fallback = parts[1];
    if (
      (fallback.startsWith("'") && fallback.endsWith("'")) ||
      (fallback.startsWith('"') && fallback.endsWith('"'))
    ) {
      fallback = fallback.slice(1, -1);
    }
    return { value: fallback, isRaw };
  }

  // Check for filter pipeline e.g. `name | uppercase | default: 'val'`
  const segments = cleanExpr.split("|").map((s) => s.trim());
  const varPath = segments[0];
  let currentValue = getNestedValue(context, varPath);

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    let filterName = seg;
    let filterArg: string | undefined;

    if (seg.includes(":")) {
      const colonIdx = seg.indexOf(":");
      filterName = seg.slice(0, colonIdx).trim();
      filterArg = seg.slice(colonIdx + 1).trim();
    } else if (seg.includes("(") && seg.endsWith(")")) {
      const parenIdx = seg.indexOf("(");
      filterName = seg.slice(0, parenIdx).trim();
      filterArg = seg.slice(parenIdx + 1, -1).trim();
    }

    currentValue = applyFilter(currentValue, filterName, filterArg);
  }

  if (currentValue === undefined || currentValue === null) {
    if (options.strict) {
      throw new Error(`Template variable "${varPath}" is undefined.`);
    }
    currentValue = options.defaultFallback ?? "";
  }

  return { value: currentValue, isRaw };
}

/**
 * Evaluates conditional blocks iteratively from innermost to outermost:
 * {{#if condition}}...{{else}}...{{/if}} and {{#unless condition}}...{{/unless}}
 */
function renderConditionals(template: string, context: Record<string, any>): string {
  let rendered = template.replace(/\x00/g, "");

  // Innermost #if match: content between {{#if ...}} and {{/if}} with no nested {{#if
  const maxIterations = 25;
  let iter = 0;
  const innermostIfRegex = /\{\{#if\s+([^}]+)\}\}((?:(?!\{\{#if\b)[\s\S])*?)(?:\{\{else\}\}((?:(?!\{\{#if\b)[\s\S])*?))?\{\{\/if\}\}/;
  
  while (iter < maxIterations && innermostIfRegex.test(rendered)) {
    iter++;
    rendered = rendered.replace(innermostIfRegex, (_match, conditionExpr, ifBlock, elseBlock = "") => {
      const cond = conditionExpr.trim();
      let isTruthy = false;

      if (cond.includes("==")) {
        const [lhs, rhs] = cond.split("==").map((s: string) => s.trim());
        const leftVal = String(getNestedValue(context, lhs) ?? "");
        const rightVal = rhs.replace(/^['"]|['"]$/g, "");
        isTruthy = leftVal === rightVal;
      } else if (cond.includes("!=")) {
        const [lhs, rhs] = cond.split("!=").map((s: string) => s.trim());
        const leftVal = String(getNestedValue(context, lhs) ?? "");
        const rightVal = rhs.replace(/^['"]|['"]$/g, "");
        isTruthy = leftVal !== rightVal;
      } else {
        const val = getNestedValue(context, cond);
        isTruthy = Boolean(val) && val !== "false" && val !== "0";
      }

      return isTruthy ? ifBlock : elseBlock;
    });
  }

  // Innermost #unless match
  iter = 0;
  const innermostUnlessRegex = /\{\{#unless\s+([^}]+)\}\}((?:(?!\{\{#unless\b)[\s\S])*?)\{\{\/unless\}\}/;
  while (iter < maxIterations && innermostUnlessRegex.test(rendered)) {
    iter++;
    rendered = rendered.replace(innermostUnlessRegex, (_match, conditionExpr, block) => {
      const val = getNestedValue(context, conditionExpr.trim());
      const isFalsy = !val || val === "false" || val === "0";
      return isFalsy ? block : "";
    });
  }

  return rendered;
}

/**
 * Evaluates loop blocks: {{#each list}}...{{this}}...{{@index}}...{{/each}}
 */
function renderLoops(
  template: string,
  context: Record<string, any>,
  options: TemplateRenderOptions
): string {
  const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return template.replace(eachRegex, (_match, listExpr, block) => {
    const list = getNestedValue(context, listExpr.trim());
    if (!Array.isArray(list) || list.length === 0) return "";

    const boundedList = list.slice(0, MAX_LOOP_ITEMS);
    return boundedList
      .map((item, index) => {
        let itemBlock = block;
        let itemContext: Record<string, any>;

        if (typeof item === "object" && item !== null) {
          const safeItem: Record<string, any> = {};
          for (const key of Object.keys(item)) {
            if (!DANGEROUS_KEYS.has(key)) {
              safeItem[key] = (item as any)[key];
            }
          }
          itemContext = {
            ...context,
            ...safeItem,
            this: item,
            "@index": index,
            "@first": index === 0,
            "@last": index === boundedList.length - 1,
          };
        } else {
          itemContext = {
            ...context,
            this: item,
            "@index": index,
            "@first": index === 0,
            "@last": index === boundedList.length - 1,
          };
        }

        return renderEmailTemplate(itemBlock, itemContext, options);
      })
      .join("");
  });
}

/**
 * Main rendering entrypoint
 */
export function renderEmailTemplate(
  template: string,
  context: Record<string, any> = {},
  options: TemplateRenderOptions = {}
): string {
  if (!template || typeof template !== "string") return "";

  const opts: TemplateRenderOptions = {
    strict: false,
    defaultFallback: "",
    escapeByDefault: true,
    ...options,
  };

  // 1. Render loops
  let output = renderLoops(template, context, opts);

  // 2. Render conditionals
  output = renderConditionals(output, context);

  // 3. Render raw variables: {{{ var }}}
  output = output.replace(/\{\{\{\s*([^{}]+)\s*\}\}\}/g, (_match, expr) => {
    const { value } = evaluateExpression(expr, context, opts);
    return value !== undefined && value !== null ? String(value) : "";
  });

  // 4. Render standard variables: {{ var }}
  output = output.replace(/\{\{\s*([^{}]+)\s*\}\}/g, (_match, expr) => {
    // Ignore any remaining block tags
    if (
      expr.startsWith("#if") ||
      expr.startsWith("/if") ||
      expr.startsWith("#unless") ||
      expr.startsWith("/unless") ||
      expr.startsWith("#each") ||
      expr.startsWith("/each") ||
      expr.trim() === "else"
    ) {
      return _match;
    }

    const { value } = evaluateExpression(expr, context, opts);
    if (value === undefined || value === null) return "";

    if (opts.escapeByDefault) {
      return escapeHtml(value);
    }
    return String(value);
  });

  return output;
}

/**
 * Extracts all unique variable names from a template string
 */
export function extractTemplateVariables(template: string): string[] {
  if (!template || typeof template !== "string") return [];
  const variables = new Set<string>();

  // Extract from {{ var }} and {{{ var }}}
  const varRegex = /\{\{\{?\s*([^{}]+?)\s*\}?\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = varRegex.exec(template)) !== null) {
    const expr = match[1].trim();
    if (
      expr.startsWith("#if") ||
      expr.startsWith("/if") ||
      expr.startsWith("#unless") ||
      expr.startsWith("/unless") ||
      expr.startsWith("#each") ||
      expr.startsWith("/each") ||
      expr === "else"
    ) {
      continue;
    }

    // Extract base variable from filter / fallback expression
    const base = expr.split("|")[0].split("||")[0].trim();
    const rootKey = base.split(".")[0].trim();
    if (base && !base.startsWith("@") && base !== "this" && !DANGEROUS_KEYS.has(rootKey)) {
      variables.add(base);
    }
  }

  // Also extract from condition expressions
  const condRegex = /\{\{#(?:if|unless)\s+([^}]+)\}\}/g;
  while ((match = condRegex.exec(template)) !== null) {
    const cond = match[1].trim();
    const cleanCond = cond.split("==")[0].split("!=")[0].trim();
    const rootCond = cleanCond.split(".")[0].trim();
    if (cleanCond && !DANGEROUS_KEYS.has(rootCond)) {
      variables.add(cleanCond);
    }
  }

  // Also extract from each expressions
  const eachRegex = /\{\{#each\s+([^}]+)\}\}/g;
  while ((match = eachRegex.exec(template)) !== null) {
    const list = match[1].trim();
    const rootList = list.split(".")[0].trim();
    if (list && !DANGEROUS_KEYS.has(rootList)) {
      variables.add(list);
    }
  }

  return Array.from(variables);
}

/**
 * Validates template syntax and checks required variables
 */
export function validateTemplate(
  template: string,
  requiredVariables: string[] = []
): TemplateValidationResult {
  const errors: string[] = [];

  if (!template || typeof template !== "string" || template.trim() === "") {
    return {
      valid: false,
      errors: ["Template content cannot be empty."],
      variables: [],
      hasConditionals: false,
      hasLoops: false,
    };
  }

  if (template.length > MAX_TEMPLATE_LENGTH) {
    return {
      valid: false,
      errors: [`Template exceeds maximum limit of ${MAX_TEMPLATE_LENGTH} characters.`],
      variables: [],
      hasConditionals: false,
      hasLoops: false,
    };
  }

  const variables = extractTemplateVariables(template);

  // Check balanced tags
  const openIfs = (template.match(/\{\{#if\b/g) || []).length;
  const closeIfs = (template.match(/\{\{\/if\}\}/g) || []).length;
  if (openIfs !== closeIfs) {
    errors.push(`Mismatched {{#if}} tags: ${openIfs} opened, ${closeIfs} closed.`);
  }

  const openUnless = (template.match(/\{\{#unless\b/g) || []).length;
  const closeUnless = (template.match(/\{\{\/unless\}\}/g) || []).length;
  if (openUnless !== closeUnless) {
    errors.push(`Mismatched {{#unless}} tags: ${openUnless} opened, ${closeUnless} closed.`);
  }

  const openEach = (template.match(/\{\{#each\b/g) || []).length;
  const closeEach = (template.match(/\{\{\/each\}\}/g) || []).length;
  if (openEach !== closeEach) {
    errors.push(`Mismatched {{#each}} tags: ${openEach} opened, ${closeEach} closed.`);
  }

  // Check for unclosed variable braces
  const stripped = template
    .replace(/\{\{\{\s*[^{}]+\s*\}\}\}/g, "")
    .replace(/\{\{\s*[^{}]+\s*\}\}/g, "");
  if (stripped.includes("{{") || stripped.includes("}}")) {
    errors.push("Unclosed or malformed template expression found.");
  }

  // Check required variables
  for (const req of requiredVariables) {
    if (!variables.includes(req)) {
      errors.push(`Required variable "${req}" is missing from template.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    variables,
    hasConditionals: openIfs > 0 || openUnless > 0,
    hasLoops: openEach > 0,
  };
}
