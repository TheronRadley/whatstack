/**
 * Demo fixtures for running the popup UI outside Chrome (plain web page).
 * They produce fully-shaped RawScanData + NetworkInfo + HeadersInfo so the
 * real detection/scoring pipeline renders a realistic dashboard.
 * Clearly labelled in the UI via report.source === 'demo'.
 */

import type { HeadersInfo, NetworkInfo, RawScanData } from '../shared/types';

function baseRaw(partial: Partial<RawScanData> & Pick<RawScanData, 'url' | 'hostname' | 'title'>): RawScanData {
  return {
    scannedAt: new Date().toISOString(),
    doctype: 'html',
    lang: 'en',
    charset: 'UTF-8',
    viewport: 'width=device-width, initial-scale=1',
    meta: { all: {}, openGraph: {}, twitter: {} },
    headings: [],
    headingCounts: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
    scriptSrcs: [],
    inlineHints: [],
    stylesheetHrefs: [],
    domHints: [],
    classHints: [],
    fonts: [],
    images: { total: 0, withAlt: 0, lazy: 0 },
    links: { total: 0, internal: 0, external: 0, anchors: 0 },
    forms: 0,
    iframes: [],
    structuredDataTypes: [],
    globals: {},
    htmlBytes: 0,
    wordCount: 0,
    performance: { totalTransferBytes: 0, totalDecodedBytes: 0, resourceCount: 0, resourcesByType: {} },
    storage: { cookieCount: 0, cookieNames: [], localStorageKeys: 0, sessionStorageKeys: 0 },
    serviceWorker: false,
    warnings: [],
    ...partial,
  };
}

export interface DemoSite {
  key: string;
  match: RegExp;
  raw: RawScanData;
  network: NetworkInfo;
  headersInfo: HeadersInfo;
}

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export const DEMO_SITES: DemoSite[] = [
  {
    key: 'nextjs-vercel',
    match: /vercel|nextjs|next/i,
    raw: baseRaw({
      url: 'https://vercel.com/home',
      hostname: 'vercel.com',
      title: 'Vercel: Build and deploy the best web experiences',
      favicon: 'https://vercel.com/favicon.ico',
      meta: {
        title: 'Vercel: Build and deploy the best web experiences',
        description: 'Vercel provides the developer tools and cloud infrastructure to build, scale, and secure a faster, more personalized web.',
        canonical: 'https://vercel.com/home',
        all: { viewport: 'width=device-width, initial-scale=1' },
        openGraph: { 'og:title': 'Vercel', 'og:description': 'Build and deploy the best web experiences.', 'og:image': 'https://vercel.com/og.png', 'og:type': 'website' },
        twitter: { 'twitter:card': 'summary_large_image', 'twitter:site': '@vercel' },
      },
      headings: [
        { level: 1, text: 'Build and deploy on the AI Cloud' },
        { level: 2, text: 'Develop with your favorite tools' },
        { level: 2, text: 'Deploy to the edge' },
        { level: 3, text: 'Fluid compute' },
      ],
      headingCounts: { h1: 1, h2: 6, h3: 9, h4: 2, h5: 0, h6: 0 },
      scriptSrcs: [
        'https://vercel.com/_next/static/chunks/main-app-8f3a2.js',
        'https://vercel.com/_next/static/chunks/webpack-19d.js',
        'https://vercel.com/_vercel/insights/script.js',
        'https://www.googletagmanager.com/gtag/js?id=G-DEMO123',
      ],
      inlineHints: ['nextjs', 'ga4'],
      domHints: ['#__next', 'radix'],
      classHints: ['tailwind-classes'],
      fonts: [
        { family: 'Geist', source: 'self-hosted', status: 'loaded' },
        { family: 'Geist Mono', source: 'self-hosted', status: 'loaded' },
        { family: 'Inter', source: 'google-fonts' },
      ],
      images: { total: 34, withAlt: 31, lazy: 22 },
      links: { total: 148, internal: 121, external: 19, anchors: 8 },
      forms: 2,
      structuredDataTypes: ['Organization', 'WebSite'],
      globals: {
        react: { present: true, version: '19.0.0' },
        'react-devtools-hook': { present: true, version: '19.0.0' },
        nextjs: { present: true, detail: '__next_f (App Router / RSC)' },
        gtag: { present: true },
        dataLayer: { present: true, detail: 'dataLayer (14 events)' },
        'service-worker-reg': { present: true },
      },
      htmlBytes: 182_440,
      wordCount: 2140,
      performance: {
        protocol: 'h3', ttfbMs: 88, domContentLoadedMs: 640, loadMs: 1180,
        documentTransferBytes: 64_200, totalTransferBytes: 1_420_000, totalDecodedBytes: 3_900_000,
        resourceCount: 74,
        resourcesByType: { script: { count: 18, transferBytes: 640_000 }, css: { count: 6, transferBytes: 120_000 }, img: { count: 31, transferBytes: 520_000 }, font: { count: 5, transferBytes: 140_000 } },
      },
      storage: { cookieCount: 6, cookieNames: ['_ga', '_gid', 'vercel-session'], localStorageKeys: 9, sessionStorageKeys: 2 },
      serviceWorker: true,
    }),
    network: {
      hostname: 'vercel.com',
      dns: {
        A: ['76.76.21.21'], AAAA: ['2606:4700:10::6816:2c0a'], CNAME: ['cname.vercel-dns.com'],
        MX: [{ exchange: 'aspmx.l.google.com', priority: 1 }, { exchange: 'alt1.aspmx.l.google.com', priority: 5 }],
        TXT: ['v=spf1 include:_spf.google.com -all', 'google-site-verification=demo'],
        NS: ['ns1.vercel-dns.com', 'ns2.vercel-dns.com'], SOA: 'ns1.vercel-dns.com hostmaster.vercel.com',
        CAA: ['0 issue "letsencrypt.org"'],
      },
      primaryIp: '76.76.21.21',
      geo: { ip: '76.76.21.21', country: 'United States', countryCode: 'US', region: 'California', city: 'Walnut Creek', isp: 'Vercel Inc', org: 'Vercel Inc', asn: 'AS16509', timezone: 'America/Los Angeles', latitude: 37.9, longitude: -122.06 },
      cert: { issuer: "Let's Encrypt (R10)", subject: 'vercel.com', commonName: 'vercel.com', san: ['vercel.com', '*.vercel.com'], notBefore: inDays(-30), notAfter: inDays(60), daysRemaining: 60, source: 'crt.sh' },
      robots: { exists: true, status: 200, sitemaps: ['https://vercel.com/sitemap.xml'], disallowCount: 3, snippet: 'User-agent: *\nAllow: /\nSitemap: https://vercel.com/sitemap.xml' },
      sitemap: { exists: true, status: 200, urlCount: 1240, isIndex: true, checkedUrl: 'https://vercel.com/sitemap.xml' },
      errors: [],
    },
    headersInfo: {
      source: 'webrequest', status: 200, httpVersion: 'HTTP/3',
      headers: {
        server: 'Vercel', 'x-vercel-id': 'iad1::demo-123', 'x-vercel-cache': 'HIT',
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
        'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
        'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        'cross-origin-opener-policy': 'same-origin',
        'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate',
      },
      cookies: [{ name: 'vercel-session', secure: true, httpOnly: true, sameSite: 'Lax' }],
      finalUrl: 'https://vercel.com/home', redirectCount: 0,
    },
  },
  {
    key: 'wordpress',
    match: /wordpress|wp-|blog/i,
    raw: baseRaw({
      url: 'https://demo-blog.example.com/',
      hostname: 'demo-blog.example.com',
      title: 'Demo Blog — Thoughts on the open web',
      meta: {
        title: 'Demo Blog — Thoughts on the open web',
        description: 'A demo WordPress publication about design, code and the open web.',
        generator: 'WordPress 6.5.2',
        all: { generator: 'WordPress 6.5.2', viewport: 'width=device-width, initial-scale=1' },
        openGraph: { 'og:title': 'Demo Blog', 'og:type': 'website' },
        twitter: {},
      },
      headings: [
        { level: 1, text: 'Demo Blog' }, { level: 2, text: 'Latest posts' },
        { level: 2, text: 'Categories' }, { level: 3, text: 'Design' },
      ],
      headingCounts: { h1: 1, h2: 8, h3: 4, h4: 0, h5: 0, h6: 0 },
      scriptSrcs: [
        'https://demo-blog.example.com/wp-includes/js/jquery/jquery.min.js?ver=3.7.1',
        'https://demo-blog.example.com/wp-content/themes/twentytwentyfour/assets/js/index.js',
        'https://www.googletagmanager.com/gtm.js?id=GTM-DEMO1',
      ],
      stylesheetHrefs: ['https://demo-blog.example.com/wp-includes/css/dist/block-library/style.min.css'],
      inlineHints: ['wordpress', 'gtm'],
      domHints: ['wp-content', 'wp-includes'],
      fonts: [{ family: 'Inter', source: 'google-fonts' }, { family: 'Cardo', source: 'google-fonts' }],
      images: { total: 18, withAlt: 9, lazy: 12 },
      links: { total: 96, internal: 88, external: 6, anchors: 2 },
      forms: 3,
      structuredDataTypes: ['Blog', 'WebPage'],
      globals: {
        wordpress: { present: true, detail: 'window.wp present' },
        jquery: { present: true, version: '3.7.1' },
        gtm: { present: true, detail: 'GTM-DEMO1' },
      },
      htmlBytes: 96_300,
      wordCount: 1480,
      performance: {
        protocol: 'h2', ttfbMs: 412, domContentLoadedMs: 1640, loadMs: 2860,
        documentTransferBytes: 28_400, totalTransferBytes: 980_000, totalDecodedBytes: 2_100_000,
        resourceCount: 42,
        resourcesByType: { script: { count: 9, transferBytes: 310_000 }, css: { count: 7, transferBytes: 180_000 }, img: { count: 18, transferBytes: 490_000 } },
      },
      storage: { cookieCount: 4, cookieNames: ['PHPSESSID', '_ga'], localStorageKeys: 1, sessionStorageKeys: 0 },
    }),
    network: {
      hostname: 'demo-blog.example.com',
      dns: {
        A: ['104.21.44.12'], AAAA: [], CNAME: [],
        MX: [{ exchange: 'mail.example.com', priority: 10 }],
        TXT: ['v=spf1 include:_spf.migadu.com -all'],
        NS: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'], CAA: [],
      },
      primaryIp: '104.21.44.12',
      geo: { ip: '104.21.44.12', country: 'United States', countryCode: 'US', region: 'California', city: 'San Francisco', isp: 'Cloudflare Inc', org: 'Cloudflare', asn: 'AS13335', timezone: 'America/Los Angeles', latitude: 37.77, longitude: -122.42 },
      cert: { issuer: "Let's Encrypt (E5)", subject: 'example.com', commonName: 'example.com', san: ['example.com', '*.example.com'], notBefore: inDays(-45), notAfter: inDays(45), daysRemaining: 45, source: 'crt.sh' },
      robots: { exists: true, status: 200, sitemaps: ['https://demo-blog.example.com/wp-sitemap.xml'], disallowCount: 1, snippet: 'User-agent: *\nDisallow: /wp-admin/\nSitemap: https://demo-blog.example.com/wp-sitemap.xml' },
      sitemap: { exists: true, status: 200, urlCount: 214, isIndex: true, checkedUrl: 'https://demo-blog.example.com/wp-sitemap.xml' },
      errors: [],
    },
    headersInfo: {
      source: 'webrequest', status: 200, httpVersion: 'HTTP/2',
      headers: {
        server: 'cloudflare', 'cf-ray': '8d3f-demo-SJC', 'cf-cache-status': 'DYNAMIC',
        'x-powered-by': 'PHP/8.2.18', link: '<https://demo-blog.example.com/wp-json/>; rel="https://api.w.org/"',
        'x-content-type-options': 'nosniff',
        'content-type': 'text/html; charset=UTF-8',
      },
      cookies: [{ name: 'PHPSESSID', secure: true, httpOnly: true }],
      finalUrl: 'https://demo-blog.example.com/', redirectCount: 0,
    },
  },
  {
    key: 'shopify',
    match: /shopify|shop|store/i,
    raw: baseRaw({
      url: 'https://demo-store.myshopify.com/',
      hostname: 'demo-store.myshopify.com',
      title: 'Demo Store — Everyday essentials',
      meta: {
        title: 'Demo Store — Everyday essentials',
        description: 'Shop everyday essentials from the Demo Store. Free shipping over $50.',
        all: { viewport: 'width=device-width, initial-scale=1' },
        openGraph: { 'og:title': 'Demo Store', 'og:description': 'Everyday essentials.', 'og:type': 'website', 'og:image': 'https://cdn.shopify.com/og.jpg' },
        twitter: { 'twitter:card': 'summary_large_image' },
      },
      headings: [{ level: 1, text: 'Everyday essentials' }, { level: 2, text: 'Featured products' }],
      headingCounts: { h1: 1, h2: 5, h3: 12, h4: 0, h5: 0, h6: 0 },
      scriptSrcs: [
        'https://cdn.shopify.com/s/files/1/0000/t/1/assets/theme.js',
        'https://connect.facebook.net/en_US/fbevents.js',
        'https://js.stripe.com/v3/',
      ],
      inlineHints: ['shopify', 'fbq'],
      domHints: ['shopify-cdn'],
      fonts: [{ family: 'Assistant', source: 'google-fonts' }],
      images: { total: 52, withAlt: 48, lazy: 40 },
      links: { total: 210, internal: 196, external: 9, anchors: 5 },
      forms: 6,
      structuredDataTypes: ['Organization', 'ItemList'],
      globals: {
        shopify: { present: true, detail: 'Theme: Dawn' },
        'meta-pixel': { present: true, version: '2.9' },
        stripe: { present: true },
        jquery: { present: true, version: '3.6.0' },
      },
      htmlBytes: 210_800,
      wordCount: 920,
      performance: {
        protocol: 'h2', ttfbMs: 230, domContentLoadedMs: 1210, loadMs: 2440,
        documentTransferBytes: 52_100, totalTransferBytes: 2_300_000, totalDecodedBytes: 4_800_000,
        resourceCount: 118,
        resourcesByType: { script: { count: 24, transferBytes: 820_000 }, img: { count: 58, transferBytes: 1_200_000 }, css: { count: 9, transferBytes: 280_000 } },
      },
      storage: { cookieCount: 11, cookieNames: ['_shopify_y', '_shopify_s', '_fbp'], localStorageKeys: 4, sessionStorageKeys: 3 },
    }),
    network: {
      hostname: 'demo-store.myshopify.com',
      dns: { A: ['23.227.38.74'], AAAA: [], CNAME: ['shops.myshopify.com'], MX: [], TXT: [], NS: [], CAA: [] },
      primaryIp: '23.227.38.74',
      geo: { ip: '23.227.38.74', country: 'Canada', countryCode: 'CA', region: 'Ontario', city: 'Ottawa', isp: 'Shopify Inc', org: 'Shopify', asn: 'AS62679', timezone: 'America/Toronto', latitude: 45.42, longitude: -75.7 },
      cert: { issuer: "Let's Encrypt (R11)", subject: '*.myshopify.com', commonName: '*.myshopify.com', san: ['*.myshopify.com'], notBefore: inDays(-20), notAfter: inDays(70), daysRemaining: 70, source: 'crt.sh' },
      robots: { exists: true, status: 200, sitemaps: ['https://demo-store.myshopify.com/sitemap.xml'], disallowCount: 12 },
      sitemap: { exists: true, status: 200, urlCount: 86, isIndex: true },
      errors: [],
    },
    headersInfo: {
      source: 'webrequest', status: 200, httpVersion: 'HTTP/2',
      headers: {
        server: 'cloudflare', 'cf-ray': '8d3f-demo-YYZ', 'x-shopid': '1234567', 'powered-by': 'Shopify',
        'strict-transport-security': 'max-age=7889238',
        'x-content-type-options': 'nosniff', 'x-frame-options': 'SAMEORIGIN',
        'content-type': 'text/html; charset=utf-8',
      },
      cookies: [{ name: '_shopify_s', secure: true, httpOnly: true, sameSite: 'Lax' }],
      finalUrl: 'https://demo-store.myshopify.com/', redirectCount: 0,
    },
  },
];

export function pickDemo(input: string): DemoSite {
  const found = DEMO_SITES.find((d) => d.match.test(input));
  const base = found ?? DEMO_SITES[0];
  // Rebrand the clone to the requested host so the demo feels targeted.
  let hostname = base.raw.hostname;
  let url = base.raw.url;
  try {
    const u = new URL(input.includes('://') ? input : `https://${input}`);
    hostname = u.hostname;
    url = u.toString();
  } catch { /* keep fixture host */ }
  return {
    ...base,
    raw: { ...base.raw, hostname, url, scannedAt: new Date().toISOString() },
    network: { ...base.network, hostname },
    headersInfo: { ...base.headersInfo, finalUrl: url },
  };
}
