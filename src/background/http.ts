/**
 * HTTP-level intelligence gathered from the service worker (which is not
 * bound by page CORS thanks to host_permissions): response-header capture,
 * robots.txt and sitemap.xml discovery.
 */

import type { CookieInfo, HeadersInfo, RobotsInfo, SitemapInfo } from '../shared/types';
import { fetchWithTimeout } from './dns';

export function parseSetCookies(values: string[]): CookieInfo[] {
  return values.slice(0, 30).map((raw) => {
    const parts = raw.split(';').map((p) => p.trim());
    const name = (parts[0]?.split('=')[0] ?? '').trim();
    const lower = raw.toLowerCase();
    const sameSite = parts.find((p) => p.toLowerCase().startsWith('samesite'))?.split('=')[1];
    return {
      name,
      secure: lower.includes('secure'),
      httpOnly: lower.includes('httponly'),
      sameSite: sameSite?.trim(),
    };
  }).filter((c) => c.name);
}

export function headersRecord(
  list: { name: string; value?: string }[],
): { headers: Record<string, string>; cookies: CookieInfo[] } {
  const headers: Record<string, string> = {};
  const setCookies: string[] = [];
  for (const h of list) {
    const name = h.name.toLowerCase();
    const value = h.value ?? '';
    if (name === 'set-cookie') setCookies.push(value);
    else headers[name] = headers[name] ? `${headers[name]}, ${value}` : value;
  }
  return { headers, cookies: parseSetCookies(setCookies) };
}

/**
 * Fallback header capture: re-request the document from the service worker
 * and read response headers. The body stream is cancelled immediately.
 * Note: fetch() hides Set-Cookie and some hop headers; webRequest capture
 * (background.ts) is preferred whenever available.
 */
export async function fetchHeaders(url: string): Promise<HeadersInfo> {
  const empty: HeadersInfo = { source: 'none', headers: {}, cookies: [] };
  try {
    const res = await fetchWithTimeout(
      url,
      { method: 'GET', credentials: 'omit', redirect: 'follow', cache: 'no-store' },
      10000,
    );
    const list: { name: string; value?: string }[] = [];
    res.headers.forEach((value, name) => list.push({ name, value }));
    const { headers, cookies } = headersRecord(list);
    try {
      await res.body?.cancel();
    } catch { /* stream already closed */ }
    return {
      source: 'fetch',
      status: res.status,
      headers,
      cookies,
      finalUrl: res.url,
      redirectCount: res.redirected ? 1 : 0,
    };
  } catch {
    return empty;
  }
}

async function fetchTextCapped(url: string, maxChars = 24_000): Promise<{ status: number; text: string } | null> {
  try {
    const res = await fetchWithTimeout(url, { credentials: 'omit', cache: 'no-store' }, 8000);
    const text = (await res.text()).slice(0, maxChars);
    return { status: res.status, text };
  } catch {
    return null;
  }
}

export async function fetchRobots(origin: string): Promise<RobotsInfo> {
  const result = await fetchTextCapped(`${origin}/robots.txt`);
  if (!result || result.status >= 400) {
    return { exists: false, status: result?.status, sitemaps: [], disallowCount: 0 };
  }
  const sitemaps = [...result.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]).slice(0, 8);
  const disallowCount = (result.text.match(/^\s*disallow:/gim) ?? []).length;
  return {
    exists: true,
    status: result.status,
    sitemaps,
    disallowCount,
    snippet: result.text.slice(0, 600),
  };
}

export async function fetchSitemap(origin: string, knownSitemaps: string[]): Promise<SitemapInfo> {
  const candidates = [...knownSitemaps, `${origin}/sitemap.xml`];
  for (const url of candidates.slice(0, 3)) {
    const result = await fetchTextCapped(url, 60_000);
    if (!result || result.status >= 400) continue;
    const isIndex = /<sitemapindex[\s>]/i.test(result.text);
    const urlCount = (result.text.match(/<loc>/gi) ?? []).length;
    if (/<urlset[\s>]|<sitemapindex[\s>]/i.test(result.text)) {
      return { exists: true, status: result.status, urlCount, isIndex, checkedUrl: url };
    }
  }
  return { exists: false, checkedUrl: candidates[0] };
}
