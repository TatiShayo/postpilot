/**
 * Enterprise Email Validation, Normalization & Security Engine
 *
 * Implements:
 * - Strict RFC 5322 / RFC 5321 syntax validation
 * - Header injection (CRLF / null byte / control char) prevention
 * - Local-part (<= 64 chars), domain (<= 255 chars), total (<= 254 chars) bounds checks
 * - Subaddressing / plus-addressing parsing & normalization
 * - Disposable / burner domain detection
 * - Domain typo detection and smart suggestions (e.g. gmai.com -> gmail.com)
 * - Unicode / IDN (Internationalized Domain Names) support
 */

export interface EmailValidationOptions {
  allowDisposable?: boolean; // Default false
  allowSubaddressing?: boolean; // Default true
  strictDomainCheck?: boolean; // Default true
  checkTypo?: boolean; // Default true
}

export interface EmailValidationResult {
  isValid: boolean;
  normalizedEmail?: string;
  localPart?: string;
  domain?: string;
  canonicalEmail?: string; // Subaddress tag stripped (e.g. user@gmail.com)
  subaddressTag?: string | null;
  isDisposable?: boolean;
  typoSuggestion?: string | null;
  error?: string;
}

// Known disposable email providers
export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "getairmail.com",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "trashmail.com",
  "trashmail.net",
  "burnermail.io",
  "dispostable.com",
  "mytemp.email",
  "fakeinbox.com",
]);

// Common domain typos mapped to canonical domain
export const DOMAIN_TYPO_MAP: Record<string, string> = {
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmaik.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "putlook.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "iclud.com": "icloud.com",
  "iclou.com": "icloud.com",
  "protonmai.com": "protonmail.com",
  "protonmial.com": "protonmail.com",
};

/**
 * Checks if a domain is a known burner / disposable domain
 */
export function isDisposableEmail(emailOrDomain: string): boolean {
  if (!emailOrDomain) return false;
  const domain = emailOrDomain.includes("@")
    ? emailOrDomain.split("@")[1].toLowerCase().trim()
    : emailOrDomain.toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Checks if domain has a common typo and suggests the corrected domain
 */
export function suggestEmailDomain(domain: string): string | null {
  if (!domain) return null;
  const cleanDomain = domain.toLowerCase().trim();
  return DOMAIN_TYPO_MAP[cleanDomain] ?? null;
}

/**
 * Parses subaddressing (plus addressing) e.g., user+newsletter@gmail.com
 */
export function extractSubaddress(email: string): {
  base: string;
  tag: string | null;
  domain: string;
} {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return { base: email, tag: null, domain: "" };
  }

  const plusIndex = localPart.indexOf("+");
  if (plusIndex !== -1) {
    return {
      base: localPart.slice(0, plusIndex),
      tag: localPart.slice(plusIndex + 1),
      domain: domain.toLowerCase(),
    };
  }

  return {
    base: localPart,
    tag: null,
    domain: domain.toLowerCase(),
  };
}

/**
 * Normalizes email address to canonical lowercase format
 */
export function normalizeEmail(email: string): string {
  if (!email) return "";
  const trimmed = email.trim();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return trimmed.toLowerCase();

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();

  return `${localPart}@${domain}`;
}

/**
 * Comprehensive RFC-compliant email validator
 */
export function validateEmail(
  rawEmail: unknown,
  options: EmailValidationOptions = {}
): EmailValidationResult {
  const opts: EmailValidationOptions = {
    allowDisposable: false,
    allowSubaddressing: true,
    strictDomainCheck: true,
    checkTypo: true,
    ...options,
  };

  if (typeof rawEmail !== "string") {
    return { isValid: false, error: "Email must be a string." };
  }

  const email = rawEmail.trim();

  // 1. Basic presence check
  if (!email) {
    return { isValid: false, error: "Email address cannot be empty." };
  }

  // 2. Length check (RFC 5321 total limit <= 254 chars)
  if (email.length > 254) {
    return { isValid: false, error: "Email address exceeds maximum length of 254 characters." };
  }

  // 3. Security: Prevent CRLF / Header Injection and Null Byte attacks
  if (/[\r\n\x00-\x1F\x7F]/.test(email)) {
    return { isValid: false, error: "Email contains forbidden control characters." };
  }

  // 4. Must contain exactly one '@' that is not at the start or end
  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) {
    return {
      isValid: false,
      error: atCount === 0 ? "Email is missing '@' symbol." : "Email contains multiple '@' symbols.",
    };
  }

  const atIndex = email.indexOf("@");
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  // 5. Local-part length check (RFC 5321 <= 64 octets)
  if (localPart.length === 0) {
    return { isValid: false, error: "Email local part cannot be empty." };
  }
  if (localPart.length > 64) {
    return { isValid: false, error: "Email local part exceeds maximum length of 64 characters." };
  }

  // 6. Domain length check (RFC 1035 <= 255 octets)
  if (domain.length === 0) {
    return { isValid: false, error: "Email domain cannot be empty." };
  }
  if (domain.length > 255) {
    return { isValid: false, error: "Email domain exceeds maximum length of 255 characters." };
  }

  // 7. Local-part dot rules: no leading/trailing dot, no consecutive dots
  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return { isValid: false, error: "Email local part cannot start or end with a dot." };
  }
  if (localPart.includes("..")) {
    return { isValid: false, error: "Email local part cannot contain consecutive dots." };
  }

  // 8. Local-part character validation (standard unquoted vs quoted)
  if (localPart.startsWith('"') && localPart.endsWith('"')) {
    // Quoted string local part
    const unquoted = localPart.slice(1, -1);
    if (/[\r\n"]/.test(unquoted.replace(/\\./g, ""))) {
      return { isValid: false, error: "Invalid quoted string in local part." };
    }
  } else {
    // Standard unquoted local part
    // Allowed: a-z A-Z 0-9 ! # $ % & ' * + - / = ? ^ _ ` { | } ~ .
    const validLocalRegex = /^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~.]+$/;
    if (!validLocalRegex.test(localPart)) {
      return { isValid: false, error: "Email local part contains invalid characters." };
    }
  }

  // 9. Domain validation
  // Check for IP literal domain: e.g. [192.168.1.1]
  if (domain.startsWith("[") && domain.endsWith("]")) {
    const ip = domain.slice(1, -1);
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(ip) && !ip.startsWith("IPv6:")) {
      return { isValid: false, error: "Invalid IP address literal domain." };
    }
  } else {
    // Standard domain validation
    if (domain.startsWith(".") || domain.endsWith(".")) {
      return { isValid: false, error: "Domain cannot start or end with a dot." };
    }
    if (domain.includes("..")) {
      return { isValid: false, error: "Domain cannot contain consecutive dots." };
    }

    const domainLabels = domain.split(".");
    if (opts.strictDomainCheck && domainLabels.length < 2) {
      return { isValid: false, error: "Domain must include a Top-Level Domain (TLD)." };
    }

    for (const label of domainLabels) {
      if (label.length === 0) {
        return { isValid: false, error: "Domain label cannot be empty." };
      }
      if (label.length > 63) {
        return { isValid: false, error: "Domain label exceeds 63 characters." };
      }
      if (label.startsWith("-") || label.endsWith("-")) {
        return { isValid: false, error: "Domain label cannot start or end with a hyphen." };
      }
      // Allow alphanumeric and hyphens, or IDN internationalized characters
      if (!/^[a-zA-Z0-9\-_]+$/i.test(label) && !/^xn--/i.test(label)) {
        return { isValid: false, error: `Invalid character in domain label "${label}".` };
      }
    }

    // Check TLD is at least 2 chars and not all digits
    const tld = domainLabels[domainLabels.length - 1];
    if (opts.strictDomainCheck) {
      if (tld.length < 2) {
        return { isValid: false, error: "TLD must be at least 2 characters." };
      }
      if (/^\d+$/.test(tld)) {
        return { isValid: false, error: "TLD cannot be numeric." };
      }
    }
  }

  // 10. Subaddress parsing
  const subaddress = extractSubaddress(email);
  const canonicalEmail = `${subaddress.base}@${subaddress.domain}`;

  // 11. Disposable domain check
  const isDisposable = isDisposableEmail(domain);
  if (!opts.allowDisposable && isDisposable) {
    return {
      isValid: false,
      isDisposable: true,
      error: "Disposable / temporary email addresses are not permitted.",
    };
  }

  // 12. Typo suggestion
  let typoSuggestion: string | null = null;
  if (opts.checkTypo) {
    const suggestedDomain = suggestEmailDomain(domain);
    if (suggestedDomain && suggestedDomain !== domain.toLowerCase()) {
      typoSuggestion = `${localPart}@${suggestedDomain}`;
    }
  }

  const normalizedEmail = normalizeEmail(email);

  return {
    isValid: true,
    normalizedEmail,
    localPart,
    domain: domain.toLowerCase(),
    canonicalEmail,
    subaddressTag: subaddress.tag,
    isDisposable,
    typoSuggestion,
  };
}
