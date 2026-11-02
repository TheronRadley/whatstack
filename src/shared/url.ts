/**
 * URL normalization & safety helpers shared by the popup, background worker
 * and the Express companion server (mirrored there).
 */

const RESTRICTED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'moz-extension://',
  'view-source:',
  'devtools://',
  'chrome-search://',
  'chrome-untrusted://',
];

/**
 * Normalize user input into a canonical absolute URL:
 * - trims whitespace
 * - adds https:// when no scheme is present
 * - lowercases the host
 * - strips a single trailing slash on the root path
 * Returns null when the input cannot be parsed as an http(s) URL.
 */
export function normalizeUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  let candidate = input.trim();
  if (!candidate) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    // Allow localhost for local development scans.
    if (parsed.hostname !== 'localhost') return null;
  }
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = '';
  let out = parsed.toString();
  // Strip trailing slash on root ("https://example.com/" -> "https://example.com")
  if (parsed.pathname === '/' && !parsed.search) out = out.replace(/\/$/, '');
  return out;
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (RESTRICTED_PREFIXES.some((p) => lower.startsWith(p))) return true;
  return !(lower.startsWith('http://') || lower.startsWith('https://'));
}

/** Registrable-domain approximation (handles common 2-level public suffixes). */
const TWO_LEVEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'org.au',
  'co.jp', 'co.kr', 'com.br', 'com.cn', 'com.tw', 'co.in', 'com.mx',
  'co.za', 'com.tr', 'com.pl', 'co.nz', 'com.ar', 'com.co',
]);

export function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join('.');
  if (TWO_LEVEL_SUFFIXES.has(lastTwo)) return parts.slice(-3).join('.');
  return lastTwo;
}

export function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
}
