/**
 * WhatStack content script (content.js) — ISOLATED world.
 *
 * On request from the popup it performs a full live DOM audit:
 * meta/SEO architecture, heading hierarchy, script & stylesheet inventory,
 * font loading, DOM/class fingerprints, performance timing and storage
 * footprint. It also injects injected.js into the MAIN world and merges the
 * returned JS-globals snapshot before replying.
 */

import { MSG, POST, makeRequestId, messageType } from '../shared/messages';
import type {
  FontInfo,
  GlobalHit,
  HeadingItem,
  MetaInfo,
  PerformanceInfo,
  RawScanData,
} from '../shared/types';
import { getHostname } from '../shared/url';

const MAX_SCRIPTS = 200;
const MAX_HEADINGS = 120;
const MAX_INLINE_SCAN_CHARS = 60_000;

/** Inline-script fingerprints: id -> regex tested against inline <script> text. */
const INLINE_FINGERPRINTS: Record<string, RegExp> = {
  gtm: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/,
  ga4: /gtag\(['"]config['"],\s*['"]G-[A-Z0-9]+|G-[A-Z0-9]{6,}/,
  'ua-analytics': /UA-\d{4,}-\d+/,
  fbq: /fbq\(['"]init['"]|connect\.facebook\.net/,
  nextjs: /__NEXT_DATA__|__next_f/,
  nuxt: /__NUXT__/,
  shopify: /Shopify\.(theme|shop)|cdn\.shopify\.com/,
  wordpress: /wp-emoji|wpApiSettings|wp-content/,
  hotjar: /hjBootstrap|_hjSettings|static\.hotjar\.com/,
  intercom: /widget\.intercom\.io|intercomSettings/,
  crisp: /\$crisp|client\.crisp\.chat/,
  hubspot: /_hsq|js\.hs-scripts\.com|hubspot/i,
  segment: /cdn\.segment\.com|analytics\.load\(/,
  posthog: /posthog\.init|app\.posthog\.com/,
  plausible: /plausible\.io\/js|plausible\(/,
  clarity: /clarity\.ms|microsoft.*clarity/i,
  tiktok: /ttq\.load|analytics\.tiktok\.com/,
  stripe: /js\.stripe\.com|Stripe\(/,
  recaptcha: /google\.com\/recaptcha|grecaptcha/,
  turnstile: /challenges\.cloudflare\.com\/turnstile/,
  sentry: /Sentry\.init|@sentry/,
  gatsby: /___gatsby|webpack-runtime.*gatsby/i,
  remix: /__remixContext|__remixManifest/,
  webflow: /Webflow\.push|d3e54v103j8qbb\.cloudfront\.net.*webflow/i,
  wix: /wix\.com|wixstatic\.com|wixBiSession/,
  squarespace: /squarespace\.com|Static\.SQUARESPACE_CONTEXT/,
};

/** DOM fingerprints: hint-id -> CSS selector. Presence is recorded as a hint. */
const DOM_FINGERPRINTS: Record<string, string> = {
  '[data-reactroot]': '[data-reactroot]',
  '#__next': '#__next',
  '#__nuxt': '#__nuxt',
  '[ng-version]': '[ng-version]',
  '[data-v-app]': '[data-v-app]',
  '[data-wf-page]': '[data-wf-page], [data-wf-site]',
  'astro-island': 'astro-island',
  '[data-astro-cid]': '[data-astro-cid]',
  '[data-framer]': '[data-framer-name], [data-framer-hydrate-v2]',
  'wp-content': 'link[href*="/wp-content/"], script[src*="/wp-content/"], img[src*="/wp-content/"]',
  'wp-includes': 'script[src*="/wp-includes/"], link[href*="/wp-includes/"]',
  'shopify-cdn': 'script[src*="cdn.shopify.com"], link[href*="cdn.shopify.com"]',
  'g-recaptcha': '.g-recaptcha',
  'cf-turnstile': '.cf-turnstile',
  'h-captcha': '.h-captcha',
  '[data-turbo]': '[data-turbo], turbo-frame',
  'livewire-attr': '[wire\\:id], [wire\\:click]',
  'x-data': '[x-data]',
  'hx-attr': '[hx-get], [hx-post], [hx-boost]',
  'mui': '[class*="MuiBox-root"], [class*="MuiButton-root"], [class^="Mui"]',
  'chakra': '[class*="chakra-"], [data-theme][class*="chakra"]',
  'radix': '[data-radix-popper-content-wrapper], [data-state][data-side]',
  'font-awesome': '.fa-solid, .fa-brands, .fa-regular, i[class*="fa-"]',
};

const TAILWIND_CLASS_RE =
  /(?:^|\s)(?:flex|grid|hidden|block|inline-block|items-|justify-|gap-|px-|py-|pt-|pb-|mx-|my-|mt-|mb-|text-(?:xs|sm|base|lg|xl|\d|gray|neutral|zinc|slate|white|black)|bg-(?:gray|neutral|zinc|slate|white|black|blue|violet|emerald)-|rounded(?:-|$|\s)|w-full|h-full|max-w-|min-h-|space-[xy]-|divide-|border-gray|shadow-(?:sm|md|lg|xl)|font-(?:medium|semibold|bold)|leading-|tracking-|sm:|md:|lg:|xl:|dark:|hover:)/;
const BOOTSTRAP_CLASS_RE =
  /(?:^|\s)(?:container|container-fluid|row|col(?:-|$|\s)|btn(?:-|$|\s)|navbar|nav-link|d-flex|d-block|d-none|form-control|card(?:-|$|\s)|alert(?:-|$|\s)|badge(?:-|$|\s)|modal(?:-|$|\s)|dropdown)/;

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function collectMeta(): MetaInfo {
  const all: Record<string, string> = {};
  const openGraph: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  document.querySelectorAll('meta').forEach((m) => {
    const key = (m.getAttribute('name') || m.getAttribute('property') || '').toLowerCase();
    const content = m.getAttribute('content');
    if (!key || content == null) return;
    all[key] = content.slice(0, 500);
    if (key.startsWith('og:')) openGraph[key] = content.slice(0, 500);
    if (key.startsWith('twitter:')) twitter[key] = content.slice(0, 500);
  });
  const canonical =
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || undefined;
  return {
    title: document.title || undefined,
    description: all['description'],
    keywords: all['keywords'],
    author: all['author'],
    generator: all['generator'],
    robots: all['robots'],
    themeColor: all['theme-color'],
    canonical,
    all,
    openGraph,
    twitter,
  };
}

function collectHeadings(): { headings: HeadingItem[]; counts: Record<string, number> } {
  const counts: Record<string, number> = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  const headings: HeadingItem[] = [];
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el) => {
    const level = Number(el.tagName.slice(1));
    counts[`h${level}`]++;
    if (headings.length < MAX_HEADINGS) {
      headings.push({ level, text: text(el).slice(0, 160) });
    }
  });
  return { headings, counts };
}

function collectFonts(): FontInfo[] {
  const fonts: FontInfo[] = [];
  const seen = new Set<string>();
  const push = (family: string, source: FontInfo['source'], status?: string) => {
    const clean = family.replace(/["']/g, '').trim();
    if (!clean || clean.length > 80) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    fonts.push({ family: clean, source, status });
  };
  document.querySelectorAll<HTMLLinkElement>('link[href]').forEach((link) => {
    const href = link.href;
    if (href.includes('fonts.googleapis.com')) {
      try {
        new URL(href).searchParams.getAll('family').forEach((f) => {
          f.split('|').forEach((fam) => push(fam.split(':')[0].replace(/\+/g, ' '), 'google-fonts'));
        });
      } catch { /* malformed URL — ignore */ }
    } else if (href.includes('use.typekit.net') || href.includes('fonts.adobe.com')) {
      push('Adobe Fonts (Typekit kit)', 'adobe-fonts');
    }
  });
  try {
    document.fonts?.forEach((f) => {
      const already = fonts.some((x) => x.family.toLowerCase() === f.family.toLowerCase());
      if (!already) push(f.family, 'self-hosted', f.status);
    });
  } catch { /* FontFaceSet unavailable */ }
  return fonts.slice(0, 40);
}

function collectPerformance(): PerformanceInfo {
  const info: PerformanceInfo = {
    totalTransferBytes: 0,
    totalDecodedBytes: 0,
    resourceCount: 0,
    resourcesByType: {},
  };
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      info.protocol = nav.nextHopProtocol || undefined;
      info.ttfbMs = Math.round(nav.responseStart);
      info.domContentLoadedMs = Math.round(nav.domContentLoadedEventEnd);
      info.loadMs = nav.loadEventEnd ? Math.round(nav.loadEventEnd) : Math.round(nav.responseEnd);
      info.documentTransferBytes = nav.transferSize || undefined;
    }
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    info.resourceCount = resources.length;
    for (const r of resources) {
      const type = r.initiatorType || 'other';
      const bucket = (info.resourcesByType[type] ??= { count: 0, transferBytes: 0 });
      bucket.count++;
      bucket.transferBytes += r.transferSize || 0;
      info.totalTransferBytes += r.transferSize || 0;
      info.totalDecodedBytes += r.decodedBodySize || 0;
    }
    if (info.documentTransferBytes) info.totalTransferBytes += info.documentTransferBytes;
  } catch { /* Performance Timeline restricted */ }
  return info;
}

function collectClassHints(): string[] {
  const hints = new Set<string>();
  let tailwindHits = 0;
  let bootstrapHits = 0;
  const els = document.querySelectorAll('[class]');
  const limit = Math.min(els.length, 1500);
  for (let i = 0; i < limit; i++) {
    const cls = els[i].getAttribute('class') ?? '';
    if (TAILWIND_CLASS_RE.test(cls)) tailwindHits++;
    if (BOOTSTRAP_CLASS_RE.test(cls)) bootstrapHits++;
    if (tailwindHits > 6 && bootstrapHits > 6) break;
  }
  if (tailwindHits >= 4) hints.add('tailwind-classes');
  if (bootstrapHits >= 4) hints.add('bootstrap-classes');
  // CSS-in-JS runtime style tags
  if (document.querySelector('style[data-styled], style[data-styled-components]')) hints.add('styled-components');
  if (document.querySelector('style[data-emotion]')) hints.add('emotion');
  if (document.querySelector('style[data-jss]')) hints.add('jss');
  return [...hints];
}

function injectMainWorldProbe(): boolean {
  try {
    const id = 'whatstack-injected';
    if (document.getElementById(id)) return true;
    const script = document.createElement('script');
    script.id = id;
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    return true;
  } catch {
    return false;
  }
}

function awaitGlobals(timeoutMs = 900): Promise<Record<string, GlobalHit>> {
  return new Promise((resolve) => {
    const requestId = makeRequestId();
    let settled = false;
    const finish = (payload: Record<string, GlobalHit>) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      resolve(payload);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as { source?: string; requestId?: string; payload?: Record<string, GlobalHit> } | null;
      if (data?.source !== POST.GLOBALS) return;
      // Accept the unsolicited first announcement or our requestId reply.
      if (data.requestId && data.requestId !== requestId) return;
      finish(data.payload ?? {});
    };
    window.addEventListener('message', onMessage);
    window.postMessage({ source: POST.REQUEST, requestId }, window.location.origin);
    setTimeout(() => finish({}), timeoutMs);
  });
}

async function runScan(): Promise<RawScanData> {
  const warnings: string[] = [];
  const injected = injectMainWorldProbe();
  const globalsPromise = injected ? awaitGlobals() : Promise.resolve<Record<string, GlobalHit>>({});
  if (!injected) warnings.push('MAIN-world probe could not be injected (page CSP); globals unavailable.');

  const meta = collectMeta();
  const { headings, counts } = collectHeadings();

  const scriptSrcs: string[] = [];
  const inlineHints = new Set<string>();
  let inlineChars = 0;
  document.querySelectorAll('script').forEach((s) => {
    const src = (s as HTMLScriptElement).src;
    if (src) {
      if (scriptSrcs.length < MAX_SCRIPTS) scriptSrcs.push(src.slice(0, 400));
    } else if (inlineChars < MAX_INLINE_SCAN_CHARS) {
      const body = s.textContent ?? '';
      inlineChars += body.length;
      for (const [id, re] of Object.entries(INLINE_FINGERPRINTS)) {
        if (!inlineHints.has(id) && re.test(body)) inlineHints.add(id);
      }
    }
  });
  // Next.js App Router streams RSC payloads via self.__next_f.push inline scripts.
  if (document.querySelector('script') && /__next_f/.test(document.documentElement.innerHTML.slice(0, 200_000))) {
    inlineHints.add('nextjs');
  }

  const stylesheetHrefs: string[] = [];
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
    if (stylesheetHrefs.length < 60) stylesheetHrefs.push(l.href.slice(0, 400));
  });

  const domHints: string[] = [];
  for (const [hint, selector] of Object.entries(DOM_FINGERPRINTS)) {
    try {
      if (document.querySelector(selector)) domHints.push(hint);
    } catch { /* invalid selector guard */ }
  }
  // Vue 2/3 scoped-style data attributes (data-v-xxxx)
  if (document.querySelector('[data-v-app]') || [...document.querySelectorAll('*')].slice(0, 400).some((el) => [...el.attributes].some((a) => /^data-v-[0-9a-f]+$/.test(a.name)))) {
    domHints.push('vue-scoped');
  }

  const images = document.querySelectorAll('img');
  let withAlt = 0;
  let lazy = 0;
  images.forEach((img) => {
    if ((img.getAttribute('alt') ?? '').trim()) withAlt++;
    if (img.loading === 'lazy') lazy++;
  });

  const host = getHostname(location.href);
  let internal = 0, external = 0, anchors = 0;
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (href.startsWith('#')) anchors++;
    else {
      try {
        const h = new URL(a.href).hostname;
        if (h === host) internal++; else if (h) external++;
      } catch { /* ignore */ }
    }
  });

  const iframes = [...document.querySelectorAll<HTMLIFrameElement>('iframe[src]')]
    .slice(0, 20)
    .map((f) => f.src.slice(0, 300));

  const structuredDataTypes = new Set<string>();
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const parsed = JSON.parse(s.textContent ?? '');
      const collect = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) node.forEach(collect);
        else {
          if (typeof node['@type'] === 'string') structuredDataTypes.add(node['@type']);
          if (Array.isArray(node['@graph'])) node['@graph'].forEach(collect);
        }
      };
      collect(parsed);
    } catch { /* invalid JSON-LD */ }
  });

  const cookieNames = document.cookie
    ? document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean).slice(0, 40)
    : [];
  let localKeys = 0, sessionKeys = 0;
  try { localKeys = localStorage.length; } catch { /* storage blocked */ }
  try { sessionKeys = sessionStorage.length; } catch { /* storage blocked */ }

  let serviceWorker = false;
  try { serviceWorker = !!navigator.serviceWorker?.controller; } catch { /* noop */ }

  const bodyText = text(document.body);
  const globals = await globalsPromise;
  if (injected && Object.keys(globals).length === 0) {
    warnings.push('Globals probe timed out; framework detection relies on DOM signals only.');
  }

  return {
    url: location.href,
    hostname: host,
    scannedAt: new Date().toISOString(),
    title: document.title,
    doctype: document.doctype?.name,
    lang: document.documentElement.getAttribute('lang') || undefined,
    dir: document.documentElement.getAttribute('dir') || undefined,
    charset: document.characterSet || undefined,
    viewport: meta.all['viewport'],
    favicon:
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href ||
      `${location.origin}/favicon.ico`,
    meta,
    headings,
    headingCounts: counts,
    scriptSrcs,
    inlineHints: [...inlineHints],
    stylesheetHrefs,
    domHints,
    classHints: collectClassHints(),
    fonts: collectFonts(),
    images: { total: images.length, withAlt, lazy },
    links: { total: internal + external + anchors, internal, external, anchors },
    forms: document.querySelectorAll('form').length,
    iframes,
    structuredDataTypes: [...structuredDataTypes],
    globals,
    htmlBytes: new Blob([document.documentElement.outerHTML]).size,
    wordCount: bodyText ? bodyText.split(/\s+/).length : 0,
    performance: collectPerformance(),
    storage: {
      cookieCount: cookieNames.length,
      cookieNames,
      localStorageKeys: localKeys,
      sessionStorageKeys: sessionKeys,
    },
    serviceWorker,
    webManifest: document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href,
    warnings,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = messageType(message);
  if (type === MSG.PING) {
    sendResponse({ ok: true, url: location.href });
    return false;
  }
  if (type === MSG.SCAN) {
    runScan()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err: unknown) =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : 'Scan failed' }),
      );
    return true; // keep the message channel open for the async reply
  }
  return false;
});
