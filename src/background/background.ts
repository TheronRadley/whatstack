/**
 * WhatStack background service worker (background.js).
 *
 * Responsibilities:
 * 1. Observe main-frame response headers per tab (chrome.webRequest,
 *    non-blocking) — the most truthful header source, including Set-Cookie
 *    flags and the HTTP version from the status line.
 * 2. Answer popup network lookups: DNS-over-HTTPS, IP geolocation, SSL
 *    certificate (CT logs), robots.txt / sitemap.xml — everything the
 *    content script cannot do because of CORS / missing platform APIs.
 * 3. Cache network bundles per hostname in chrome.storage.session (5 min).
 * 4. Render the toolbar badge with the detected-technology count.
 */

import { MSG, isRecord, messageType } from '../shared/messages';
import type { HeadersInfo, NetworkBundle, NetworkInfo } from '../shared/types';
import { registrableDomain } from '../shared/url';
import { resolveAllDns } from './dns';
import { lookupCert, lookupGeo } from './geo';
import { fetchHeaders, fetchRobots, fetchSitemap, headersRecord } from './http';

const CACHE_TTL_MS = 5 * 60 * 1000;

/** tabId -> last observed main-frame HeadersInfo */
const tabHeaders = new Map<number, HeadersInfo>();

// ---------------------------------------------------------------------------
// 1. webRequest header observation
// ---------------------------------------------------------------------------
try {
  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (details.tabId < 0 || !details.responseHeaders) return;
      const { headers, cookies } = headersRecord(details.responseHeaders);
      const httpVersion = details.statusLine?.split(' ')[0];
      tabHeaders.set(details.tabId, {
        source: 'webrequest',
        status: details.statusCode,
        httpVersion: httpVersion || undefined,
        headers,
        cookies,
        finalUrl: details.url,
      });
    },
    { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] },
    ['responseHeaders', 'extraHeaders'],
  );
} catch {
  // webRequest unavailable (e.g. permission revoked) — fetch fallback covers us.
}

chrome.tabs.onRemoved.addListener((tabId) => tabHeaders.delete(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && changeInfo.url) tabHeaders.delete(tabId);
});

// ---------------------------------------------------------------------------
// 2. Network bundle assembly (+ session cache)
// ---------------------------------------------------------------------------
interface CachedBundle {
  at: number;
  bundle: NetworkBundle;
}

async function getCached(hostname: string): Promise<NetworkBundle | null> {
  try {
    const key = `ws-cache:${hostname}`;
    const store = await chrome.storage.session.get(key);
    const entry = store[key] as CachedBundle | undefined;
    if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.bundle;
  } catch { /* storage unavailable */ }
  return null;
}

async function setCached(hostname: string, bundle: NetworkBundle): Promise<void> {
  try {
    await chrome.storage.session.set({ [`ws-cache:${hostname}`]: { at: Date.now(), bundle } });
  } catch { /* storage unavailable */ }
}

async function buildNetworkBundle(hostname: string, url: string, tabId?: number): Promise<NetworkBundle> {
  const errors: string[] = [];
  const origin = (() => {
    try { return new URL(url).origin; } catch { return `https://${hostname}`; }
  })();
  const isHttps = url.toLowerCase().startsWith('https://');

  const observed = typeof tabId === 'number' ? tabHeaders.get(tabId) : undefined;

  const [dnsR, headersR, certR, robotsR] = await Promise.allSettled([
    resolveAllDns(hostname),
    observed ? Promise.resolve(observed) : fetchHeaders(url),
    isHttps ? lookupCert(hostname) : Promise.resolve(undefined),
    fetchRobots(origin),
  ]);

  const dns = dnsR.status === 'fulfilled'
    ? dnsR.value
    : { A: [], AAAA: [], CNAME: [], MX: [], TXT: [], NS: [], CAA: [] };
  if (dnsR.status === 'rejected') errors.push('DNS-over-HTTPS lookup failed.');

  const headersInfo: HeadersInfo = headersR.status === 'fulfilled'
    ? headersR.value
    : { source: 'none', headers: {}, cookies: [] };
  if (headersInfo.source === 'none') errors.push('Response headers could not be captured.');

  const cert = certR.status === 'fulfilled' ? certR.value : undefined;
  if (isHttps && !cert) errors.push('SSL certificate not found in Certificate Transparency logs.');

  const robots = robotsR.status === 'fulfilled'
    ? robotsR.value
    : { exists: false, sitemaps: [], disallowCount: 0 };

  const primaryIp = dns.A[0] ?? dns.AAAA[0];
  const [geoR, sitemapR] = await Promise.allSettled([
    primaryIp ? lookupGeo(primaryIp) : Promise.resolve(undefined),
    fetchSitemap(origin, robots.sitemaps),
  ]);
  const geo = geoR.status === 'fulfilled' ? geoR.value : undefined;
  if (primaryIp && !geo) errors.push('IP geolocation lookup failed.');
  const sitemap = sitemapR.status === 'fulfilled' ? sitemapR.value : { exists: false };

  const network: NetworkInfo = {
    hostname,
    dns,
    primaryIp,
    geo,
    cert,
    robots,
    sitemap,
    errors,
  };
  void registrableDomain; // (domain helper available for future apex lookups)
  return { network, headersInfo };
}

async function handleNetwork(hostname: string, url: string, tabId?: number): Promise<NetworkBundle> {
  const cached = await getCached(hostname);
  if (cached) {
    // Prefer fresher observed tab headers over the cached fetch result.
    const observed = typeof tabId === 'number' ? tabHeaders.get(tabId) : undefined;
    if (observed && cached.headersInfo.source !== 'webrequest') {
      return { network: cached.network, headersInfo: observed };
    }
    return cached;
  }
  const bundle = await buildNetworkBundle(hostname, url, tabId);
  await setCached(hostname, bundle);
  return bundle;
}

// ---------------------------------------------------------------------------
// 3. Message router
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = messageType(message);

  if (type === MSG.PING) {
    sendResponse({ ok: true, from: 'background' });
    return false;
  }

  if (type === MSG.NETWORK && isRecord(message)) {
    const hostname = String(message.hostname ?? '');
    const url = String(message.url ?? '');
    const tabId = typeof message.tabId === 'number' ? message.tabId : sender.tab?.id;
    handleNetwork(hostname, url, tabId)
      .then((bundle) => sendResponse({ ok: true, bundle }))
      .catch((err: unknown) =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : 'Network lookup failed' }),
      );
    return true;
  }

  if (type === MSG.TAB_HEADERS && isRecord(message)) {
    const tabId = typeof message.tabId === 'number' ? message.tabId : -1;
    sendResponse({ ok: true, headersInfo: tabHeaders.get(tabId) ?? null });
    return false;
  }

  if (type === MSG.BADGE && isRecord(message)) {
    const tabId = typeof message.tabId === 'number' ? message.tabId : undefined;
    const count = typeof message.count === 'number' ? message.count : 0;
    if (tabId !== undefined) {
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#8b5cf6' }).catch(() => undefined);
      chrome.action
        .setBadgeText({ tabId, text: count > 0 ? String(Math.min(count, 99)) : '' })
        .catch(() => undefined);
    }
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' }).catch(() => undefined);
});
