/**
 * Server-side analyzer: the structured (non-browser) fallback pipeline.
 *  - Axios fetches the document (timeouts, redirect + size caps)
 *  - Cheerio parses meta/headings/scripts/fonts/structured data
 *  - node:dns resolves A/AAAA/CNAME/MX/TXT/NS/SOA/CAA
 *  - node:tls reads the real peer certificate (issuer, SANs, expiry)
 *  - ipwho.is provides IP geolocation
 * Runtime JS globals cannot be observed without a browser engine — that is
 * precisely what the Chrome extension adds (see src/content/injected.ts).
 * To close the gap server-side, plug Puppeteer/Playwright in place of
 * fetchHtml() and evaluate the same probe list in-page.
 */

import { promises as dns } from 'node:dns';
import type { CaaRecord, MxRecord, SoaRecord } from 'node:dns';
import * as https from 'node:https';
import * as tls from 'node:tls';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type {
  AnalyzeResponse, CertInfo, CookieInfo, DnsRecordSet, FontInfo,
  GeoInfo, HeadersInfo, MetaInfo, RobotsInfo, SitemapInfo,
} from './types.js';

const UA =
  'Mozilla/5.0 (compatible; WhatStack/1.0; +https://github.com/TheronRadley/whatstack)';

const http = axios.create({
  timeout: 12_000,
  maxRedirects: 5,
  maxContentLength: 5 * 1024 * 1024,
  headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*' },
  validateStatus: () => true,
  // Analyzer semantics: we *inspect* sites, including ones with broken TLS.
  // Certificate problems surface in the report (dedicated TLS probe below)
  // instead of aborting the scan. No credentials are ever sent.
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// ------------------------------------------------------------------ SSRF guard
const PRIVATE_V4 = [
  /^10\./, /^127\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

export async function assertPublicHost(hostname: string): Promise<void> {
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new Error('Refusing to scan local hostnames (SSRF protection).');
  }
  const records = await dns.lookup(hostname, { all: true }).catch(() => []);
  for (const r of records) {
    if (r.family === 4 && PRIVATE_V4.some((re) => re.test(r.address))) {
      throw new Error(`Refusing to scan non-public address ${r.address} (SSRF protection).`);
    }
    if (r.family === 6 && (/^::1$/i.test(r.address) || /^f[cd]/i.test(r.address) || /^fe80:/i.test(r.address))) {
      throw new Error(`Refusing to scan non-public address ${r.address} (SSRF protection).`);
    }
  }
}

// ---------------------------------------------------------------------- DNS
async function resolveDns(hostname: string): Promise<DnsRecordSet> {
  const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);
  const [a, aaaa, cname, mx, txt, ns, soa, caa] = await Promise.all([
    safe(dns.resolve4(hostname), [] as string[]),
    safe(dns.resolve6(hostname), [] as string[]),
    safe(dns.resolveCname(hostname), [] as string[]),
    safe(dns.resolveMx(hostname), [] as MxRecord[]),
    safe(dns.resolveTxt(hostname), [] as string[][]),
    safe(dns.resolveNs(hostname), [] as string[]),
    safe(dns.resolveSoa(hostname), undefined as SoaRecord | undefined),
    safe(dns.resolveCaa(hostname), [] as CaaRecord[]),
  ]);
  return {
    A: a, AAAA: aaaa, CNAME: cname,
    MX: mx.map((m) => ({ exchange: m.exchange, priority: m.priority })).sort((x, y) => x.priority - y.priority),
    TXT: txt.map((parts) => parts.join('')),
    NS: ns,
    SOA: soa ? `${soa.nsname} ${soa.hostmaster}` : undefined,
    CAA: caa.map((c) => `${c.issue ?? c.issuewild ?? c.iodef ?? ''}`.trim()).filter(Boolean),
  };
}

// ---------------------------------------------------------------------- TLS
function fetchCert(hostname: string, port = 443): Promise<CertInfo | undefined> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port, servername: hostname, timeout: 8000, rejectUnauthorized: false },
      () => {
      try {
        const cert = socket.getPeerCertificate(true);
        const proto = socket.getProtocol();
        void proto;
        if (!cert || !cert.subject) return resolve(undefined);
        const firstStr = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
        const notAfter = cert.valid_to ? new Date(cert.valid_to).toISOString() : undefined;
        const notBefore = cert.valid_from ? new Date(cert.valid_from).toISOString() : undefined;
        resolve({
          issuer: firstStr(cert.issuer?.O) ?? firstStr(cert.issuer?.CN),
          subject: firstStr(cert.subject?.CN),
          commonName: firstStr(cert.subject?.CN),
          san: (cert.subjectaltname ?? '')
            .split(',').map((s) => s.trim().replace(/^DNS:/, '')).filter(Boolean).slice(0, 12),
          notBefore, notAfter,
          daysRemaining: notAfter ? Math.round((new Date(notAfter).getTime() - Date.now()) / 86_400_000) : undefined,
          serialNumber: cert.serialNumber,
          source: 'tls',
        });
      } catch {
        resolve(undefined);
      } finally {
        socket.end();
      }
    });
    socket.on('error', () => resolve(undefined));
    socket.on('timeout', () => { socket.destroy(); resolve(undefined); });
  });
}

// ---------------------------------------------------------------------- Geo
async function lookupGeo(ip: string): Promise<GeoInfo | undefined> {
  try {
    const { data } = await axios.get(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeout: 7000 });
    if (data?.success === false) return undefined;
    return {
      ip, country: data.country, countryCode: data.country_code,
      region: data.region, city: data.city,
      isp: data.connection?.isp, org: data.connection?.org,
      asn: data.connection?.asn ? `AS${data.connection.asn}` : undefined,
      timezone: data.timezone?.id,
      latitude: data.latitude, longitude: data.longitude,
    };
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------- robots/sitemap
async function fetchRobots(origin: string): Promise<RobotsInfo> {
  try {
    const res = await http.get(`${origin}/robots.txt`, { responseType: 'text' });
    if (res.status >= 400) return { exists: false, status: res.status, sitemaps: [], disallowCount: 0 };
    const text = String(res.data).slice(0, 24_000);
    return {
      exists: true, status: res.status,
      sitemaps: [...text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]).slice(0, 8),
      disallowCount: (text.match(/^\s*disallow:/gim) ?? []).length,
      snippet: text.slice(0, 600),
    };
  } catch {
    return { exists: false, sitemaps: [], disallowCount: 0 };
  }
}

async function fetchSitemap(origin: string, known: string[]): Promise<SitemapInfo> {
  for (const url of [...known, `${origin}/sitemap.xml`].slice(0, 3)) {
    try {
      const res = await http.get(url, { responseType: 'text' });
      if (res.status >= 400) continue;
      const text = String(res.data).slice(0, 60_000);
      if (/<urlset[\s>]|<sitemapindex[\s>]/i.test(text)) {
        return {
          exists: true, status: res.status,
          urlCount: (text.match(/<loc>/gi) ?? []).length,
          isIndex: /<sitemapindex[\s>]/i.test(text),
          checkedUrl: url,
        };
      }
    } catch { /* try next candidate */ }
  }
  return { exists: false };
}

// ---------------------------------------------------------------- HTML parse
const INLINE_FINGERPRINTS: Record<string, RegExp> = {
  gtm: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/,
  ga4: /gtag\(['"]config['"],\s*['"]G-[A-Z0-9]+|G-[A-Z0-9]{6,}/,
  'ua-analytics': /UA-\d{4,}-\d+/,
  fbq: /fbq\(['"]init['"]|connect\.facebook\.net/,
  nextjs: /__NEXT_DATA__|__next_f/,
  nuxt: /__NUXT__/,
  shopify: /Shopify\.(theme|shop)|cdn\.shopify\.com/,
  wordpress: /wp-emoji|wpApiSettings/,
  hotjar: /hjBootstrap|_hjSettings/,
  intercom: /widget\.intercom\.io|intercomSettings/,
  crisp: /\$crisp|client\.crisp\.chat/,
  hubspot: /_hsq|js\.hs-scripts\.com/,
  segment: /cdn\.segment\.com|analytics\.load\(/,
  stripe: /js\.stripe\.com|Stripe\(/,
  recaptcha: /google\.com\/recaptcha|grecaptcha/,
  turnstile: /challenges\.cloudflare\.com\/turnstile/,
  sentry: /Sentry\.init/,
  gatsby: /___gatsby/,
  remix: /__remixContext|__remixManifest/,
  wix: /wixstatic\.com|wixBiSession/,
  squarespace: /Static\.SQUARESPACE_CONTEXT/,
};

function parseSetCookies(values: string[]): CookieInfo[] {
  return values.slice(0, 30).map((raw) => {
    const parts = raw.split(';').map((p) => p.trim());
    const lower = raw.toLowerCase();
    return {
      name: (parts[0]?.split('=')[0] ?? '').trim(),
      secure: lower.includes('secure'),
      httpOnly: lower.includes('httponly'),
      sameSite: parts.find((p) => p.toLowerCase().startsWith('samesite'))?.split('=')[1]?.trim(),
    };
  }).filter((c) => c.name);
}

export async function analyzeUrl(normalizedUrl: string): Promise<AnalyzeResponse> {
  const url = new URL(normalizedUrl);
  const hostname = url.hostname.toLowerCase();
  const isHttps = url.protocol === 'https:';
  const errors: string[] = [];

  await assertPublicHost(hostname);

  const started = Date.now();
  const res = await http.get(normalizedUrl, { responseType: 'text' });
  const loadMs = Date.now() - started;
  const html = String(res.data ?? '');
  const finalUrl: string = res.request?.res?.responseUrl ?? normalizedUrl;

  // Headers
  const headers: Record<string, string> = {};
  let cookies: CookieInfo[] = [];
  for (const [name, value] of Object.entries(res.headers)) {
    if (name.toLowerCase() === 'set-cookie') {
      cookies = parseSetCookies(Array.isArray(value) ? value : [String(value)]);
    } else if (value !== undefined) {
      headers[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
    }
  }
  const httpVersionRaw: string | undefined = (res.request?.res as any)?.httpVersion;
  const headersInfo: HeadersInfo = {
    source: 'server',
    status: res.status,
    httpVersion: httpVersionRaw ? `HTTP/${httpVersionRaw}` : undefined,
    headers, cookies, finalUrl,
  };

  // Cheerio parse
  const $ = cheerio.load(html);
  const all: Record<string, string> = {};
  const openGraph: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  $('meta').each((_, el) => {
    const key = ($(el).attr('name') || $(el).attr('property') || '').toLowerCase();
    const content = $(el).attr('content');
    if (!key || content == null) return;
    all[key] = content.slice(0, 500);
    if (key.startsWith('og:')) openGraph[key] = content.slice(0, 500);
    if (key.startsWith('twitter:')) twitter[key] = content.slice(0, 500);
  });
  const meta: MetaInfo = {
    title: $('title').first().text().trim() || undefined,
    description: all['description'], keywords: all['keywords'], author: all['author'],
    generator: all['generator'], robots: all['robots'], themeColor: all['theme-color'],
    canonical: $('link[rel="canonical"]').attr('href'),
    all, openGraph, twitter,
  };

  const headingCounts: Record<string, number> = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  const headings = $('h1,h2,h3,h4,h5,h6').toArray().slice(0, 120).map((el) => {
    const level = Number(el.tagName.slice(1));
    headingCounts[`h${level}`]++;
    return { level, text: $(el).text().replace(/\s+/g, ' ').trim().slice(0, 160) };
  });
  $('h1,h2,h3,h4,h5,h6').each((_, el) => { /* counts already include first 120; add remainder */ });
  // Full counts (beyond the capped 120 samples above)
  for (const n of [1, 2, 3, 4, 5, 6]) headingCounts[`h${n}`] = $(`h${n}`).length;

  const abs = (href?: string) => {
    if (!href) return '';
    try { return new URL(href, finalUrl).toString(); } catch { return href; }
  };

  const scriptSrcs: string[] = [];
  const inlineHints = new Set<string>();
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (src) { if (scriptSrcs.length < 200) scriptSrcs.push(abs(src).slice(0, 400)); }
    else {
      const body = $(el).html() ?? '';
      for (const [id, re] of Object.entries(INLINE_FINGERPRINTS)) {
        if (!inlineHints.has(id) && re.test(body)) inlineHints.add(id);
      }
    }
  });

  const stylesheetHrefs = $('link[rel="stylesheet"]').toArray()
    .slice(0, 60).map((el) => abs($(el).attr('href')).slice(0, 400));

  const fonts: FontInfo[] = [];
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.includes('fonts.googleapis.com')) {
      try {
        new URL(abs(href)).searchParams.getAll('family').forEach((f) =>
          f.split('|').forEach((fam) => fonts.push({ family: fam.split(':')[0].replace(/\+/g, ' '), source: 'google-fonts' })));
      } catch { /* ignore */ }
    } else if (href.includes('use.typekit.net')) {
      fonts.push({ family: 'Adobe Fonts (Typekit kit)', source: 'adobe-fonts' });
    }
  });

  const domHints: string[] = [];
  const has = (sel: string) => { try { return $(sel).length > 0; } catch { return false; } };
  if (has('[data-reactroot]')) domHints.push('[data-reactroot]');
  if (has('#__next')) domHints.push('#__next');
  if (has('#__nuxt')) domHints.push('#__nuxt');
  if (has('[ng-version]')) domHints.push('[ng-version]');
  if (has('[data-wf-page],[data-wf-site]')) domHints.push('[data-wf-page]');
  if (has('astro-island')) domHints.push('astro-island');
  if (has('[data-astro-cid]')) domHints.push('[data-astro-cid]');
  if (has('[data-framer-name]')) domHints.push('[data-framer]');
  if (/\/wp-content\//.test(html)) domHints.push('wp-content');
  if (/\/wp-includes\//.test(html)) domHints.push('wp-includes');
  if (html.includes('cdn.shopify.com')) domHints.push('shopify-cdn');
  if (has('.g-recaptcha')) domHints.push('g-recaptcha');
  if (has('.cf-turnstile')) domHints.push('cf-turnstile');
  if (has('[x-data]')) domHints.push('x-data');
  if (has('[hx-get],[hx-post],[hx-boost]')) domHints.push('hx-attr');
  if (has('[class*="MuiButton-root"],[class*="MuiBox-root"]')) domHints.push('mui');
  if (/data-v-[0-9a-f]{6,}/.test(html)) domHints.push('vue-scoped');

  const structuredDataTypes = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() ?? '');
      const collect = (node: any) => {
        if (Array.isArray(node)) node.forEach(collect);
        else if (node) {
          if (typeof node['@type'] === 'string') structuredDataTypes.add(node['@type']);
          if (Array.isArray(node['@graph'])) node['@graph'].forEach(collect);
        }
      };
      collect(parsed);
    } catch { /* invalid JSON-LD */ }
  });

  const images = $('img');
  let withAlt = 0, lazy = 0;
  images.each((_, el) => {
    if (($(el).attr('alt') ?? '').trim()) withAlt++;
    if ($(el).attr('loading') === 'lazy') lazy++;
  });

  let internal = 0, external = 0, anchors = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.startsWith('#')) anchors++;
    else {
      try {
        const h = new URL(href, finalUrl).hostname;
        if (h === hostname) internal++; else if (h) external++;
      } catch { /* ignore */ }
    }
  });

  const [dnsSettled, certSettled, robotsSettled] = await Promise.allSettled([
    resolveDns(hostname),
    isHttps ? fetchCert(hostname) : Promise.resolve(undefined),
    fetchRobots(url.origin),
  ]);
  const dnsRecords = dnsSettled.status === 'fulfilled'
    ? dnsSettled.value
    : { A: [], AAAA: [], CNAME: [], MX: [], TXT: [], NS: [], CAA: [] };
  if (dnsSettled.status === 'rejected') errors.push('DNS resolution failed.');
  const cert = certSettled.status === 'fulfilled' ? certSettled.value : undefined;
  const robots = robotsSettled.status === 'fulfilled'
    ? robotsSettled.value
    : { exists: false, sitemaps: [], disallowCount: 0 };

  const primaryIp = dnsRecords.A[0] ?? dnsRecords.AAAA[0];
  const [geo, sitemap] = await Promise.all([
    primaryIp ? lookupGeo(primaryIp) : Promise.resolve(undefined),
    fetchSitemap(url.origin, robots.sitemaps),
  ]);

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const htmlBytes = Buffer.byteLength(html, 'utf8');

  return {
    raw: {
      url: finalUrl,
      hostname,
      scannedAt: new Date().toISOString(),
      title: meta.title ?? $('title').text().trim(),
      doctype: /<!doctype html/i.test(html) ? 'html' : undefined,
      lang: $('html').attr('lang') || undefined,
      charset: $('meta[charset]').attr('charset') || 'UTF-8',
      viewport: all['viewport'],
      favicon: abs($('link[rel~="icon"]').attr('href')) || `${url.origin}/favicon.ico`,
      meta,
      headings,
      headingCounts,
      scriptSrcs,
      inlineHints: [...inlineHints],
      stylesheetHrefs,
      domHints,
      classHints: [],
      fonts,
      images: { total: images.length, withAlt, lazy },
      links: { total: internal + external + anchors, internal, external, anchors },
      forms: $('form').length,
      iframes: $('iframe[src]').toArray().slice(0, 20).map((el) => abs($(el).attr('src')).slice(0, 300)),
      structuredDataTypes: [...structuredDataTypes],
      globals: {},
      htmlBytes,
      wordCount: bodyText ? bodyText.split(/\s+/).length : 0,
      performance: {
        protocol: httpVersionRaw === '2.0' ? 'h2' : httpVersionRaw ? `http/${httpVersionRaw}` : undefined,
        ttfbMs: undefined,
        loadMs,
        documentTransferBytes: htmlBytes,
        totalTransferBytes: htmlBytes,
        totalDecodedBytes: htmlBytes,
        resourceCount: scriptSrcs.length + stylesheetHrefs.length + images.length,
        resourcesByType: {
          script: { count: scriptSrcs.length, transferBytes: 0 },
          css: { count: stylesheetHrefs.length, transferBytes: 0 },
          img: { count: images.length, transferBytes: 0 },
        },
      },
      storage: { cookieCount: cookies.length, cookieNames: cookies.map((c) => c.name), localStorageKeys: 0, sessionStorageKeys: 0 },
      serviceWorker: false,
      webManifest: abs($('link[rel="manifest"]').attr('href')) || undefined,
      warnings: ['Server-side scan: JS runtime globals are only visible to the Chrome extension.'],
    },
    network: { hostname, dns: dnsRecords, primaryIp, geo, cert, robots, sitemap, errors },
    headersInfo,
  };
}
