/**
 * Anti-bypass utilities for Transporti V1.
 *
 * Detects phone numbers, emails, and social-media handles in user-generated
 * text to prevent off-platform communication before booking confirmation.
 */

// Tunisia phone formats: +216 XX XXX XXX, 216XXXXXXXX, 0X XXX XXXX, XX XXX XXX
const PHONE_PATTERNS = [
    /(?:\+?216[\s.-]?)?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/g,
    /0\d[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\b\d{8}\b/g,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const SOCIAL_PATTERNS = [
    /(?:facebook|fb)\.(?:com|me)\S*/gi,
    /(?:instagram|insta)\.com\S*/gi,
    /(?:wa\.me|whatsapp)\S*/gi,
];

export interface BypassCheckResult {
    hasBypass: boolean;
    matches: string[];
    sanitized: string;
}

/**
 * Checks if the given text contains contact information that should be
 * blocked before booking confirmation.
 */
export function checkForBypass(text: string): BypassCheckResult {
    const matches: string[] = [];

    // Check for phone numbers
    for (const pattern of PHONE_PATTERNS) {
        const found = text.match(pattern);
        if (found) matches.push(...found);
    }

    // Check for emails
    const emailMatches = text.match(EMAIL_PATTERN);
    if (emailMatches) matches.push(...emailMatches);

    // Check for social links
    for (const pattern of SOCIAL_PATTERNS) {
        const found = text.match(pattern);
        if (found) matches.push(...found);
    }

    // De-duplicate
    const unique = Array.from(new Set(matches.map(m => m.trim()).filter(m => m.length > 4)));

    return {
        hasBypass: unique.length > 0,
        matches: unique,
        sanitized: unique.reduce(
            (t, m) => t.replace(m, '[info masquée]'),
            text,
        ),
    };
}

/**
 * Quick boolean check — returns `true` when bypass attempt is detected.
 */
export function containsBypassAttempt(text: string): boolean {
    return checkForBypass(text).hasBypass;
}
