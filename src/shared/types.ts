/**
 * WhatStack shared type contracts.
 * These types flow across all three extension contexts:
 *   injected (MAIN world) -> content (ISOLATED world) -> popup (React)
 *   background (service worker) -> popup
 * They are also mirrored by the optional Express companion server so the
 * exact same detection + scoring pipeline can run in web mode.
 */

export type TechCategory =
  | 'cms'
  | 'ecommerce'
  | 'framework'
  | 'library'
  | 'css'
  | 'analytics'
  | 'marketing'
  | 'hosting'
  | 'cdn'
  | 'server'
  | 'language'
  | 'payment'
  | 'video'
  | 'font'
  | 'security'
  | 'widget'
  | 'build'
  | 'other';

export type Confidence = 'high' | 'medium' | 'low';

export interface TechDetection {
  id: string;
  name: string;
  category: TechCategory;
  version?: string;
  confidence: Confidence;
  /** Human-readable signals that triggered the detection. */
  evidence: string[];
  website?: string;
  /** Key mapped to a Lucide icon in the popup UI. */
  icon: string;
}

/** A single JS-global probe result reported by the MAIN-world injected script. */
export interface GlobalHit {
  present: boolean;
  version?: string;
  detail?: string;
}

export interface HeadingItem {
  level: number; // 1-6
  text: string;
}

export interface MetaInfo {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  generator?: string;
  robots?: string;
  themeColor?: string;
  canonical?: string;
  /** All raw meta entries, keyed by lowercase name/property. */
  all: Record<string, string>;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
}

export interface FontInfo {
  family: string;
  source: 'google-fonts' | 'adobe-fonts' | 'self-hosted' | 'system' | 'unknown';
  status?: string;
}

export interface PerformanceInfo {
  /** nextHopProtocol of the main document: 'h2' | 'h3' | 'http/1.1' | ... */
  protocol?: string;
  ttfbMs?: number;
  domContentLoadedMs?: number;
  loadMs?: number;
  /** transferSize of the HTML document itself. */
  documentTransferBytes?: number;
  totalTransferBytes: number;
  totalDecodedBytes: number;
  resourceCount: number;
  resourcesByType: Record<string, { count: number; transferBytes: number }>;
}

/** Everything the content script can observe from the live page. */
export interface RawScanData {
  url: string;
  hostname: string;
  scannedAt: string;
  title: string;
  doctype?: string;
  lang?: string;
  dir?: string;
  charset?: string;
  viewport?: string;
  favicon?: string;
  meta: MetaInfo;
  headings: HeadingItem[];
  headingCounts: Record<string, number>;
  /** External script URLs (capped). */
  scriptSrcs: string[];
  /** Identifiers of matched inline-script fingerprints, e.g. 'gtm', 'fbq'. */
  inlineHints: string[];
  stylesheetHrefs: string[];
  /** Matched DOM selectors / attribute fingerprints, e.g. '[data-reactroot]'. */
  domHints: string[];
  /** Class-name fingerprints, e.g. 'tailwind-classes', 'bootstrap-grid'. */
  classHints: string[];
  fonts: FontInfo[];
  images: { total: number; withAlt: number; lazy: number };
  links: { total: number; internal: number; external: number; anchors: number };
  forms: number;
  iframes: string[];
  structuredDataTypes: string[];
  /** MAIN-world globals snapshot keyed by probe id. */
  globals: Record<string, GlobalHit>;
  /** Serialized outer HTML length (bytes approx) — page weight indicator. */
  htmlBytes: number;
  wordCount: number;
  performance: PerformanceInfo;
  storage: { cookieCount: number; cookieNames: string[]; localStorageKeys: number; sessionStorageKeys: number };
  serviceWorker: boolean;
  webManifest?: string;
  /** Non-fatal collection warnings. */
  warnings: string[];
}

export interface DnsRecordSet {
  A: string[];
  AAAA: string[];
  CNAME: string[];
  MX: { exchange: string; priority: number }[];
  TXT: string[];
  NS: string[];
  SOA?: string;
  CAA: string[];
}

export interface GeoInfo {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  isp?: string;
  org?: string;
  asn?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface CertInfo {
  issuer?: string;
  subject?: string;
  commonName?: string;
  san: string[];
  notBefore?: string;
  notAfter?: string;
  daysRemaining?: number;
  serialNumber?: string;
  source: 'crt.sh' | 'certspotter' | 'tls' | 'unknown';
}

export interface RobotsInfo {
  exists: boolean;
  status?: number;
  sitemaps: string[];
  disallowCount: number;
  snippet?: string;
}

export interface SitemapInfo {
  exists: boolean;
  status?: number;
  urlCount?: number;
  isIndex?: boolean;
  checkedUrl?: string;
}

/** Everything the background service worker (or Express server) resolves off-page. */
export interface NetworkInfo {
  hostname: string;
  dns: DnsRecordSet;
  /** Primary IP used for geolocation (first A, else first AAAA). */
  primaryIp?: string;
  geo?: GeoInfo;
  cert?: CertInfo;
  robots: RobotsInfo;
  sitemap: SitemapInfo;
  errors: string[];
}

export interface CookieInfo {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
}

export interface HeadersInfo {
  source: 'webrequest' | 'fetch' | 'server' | 'none';
  status?: number;
  /** e.g. 'HTTP/2', 'HTTP/1.1' (from statusLine) or nextHopProtocol fallback. */
  httpVersion?: string;
  /** Lowercased header names -> values. */
  headers: Record<string, string>;
  cookies: CookieInfo[];
  finalUrl?: string;
  redirectCount?: number;
}

export interface SecurityCheck {
  id: string;
  label: string;
  header: string;
  present: boolean;
  value?: string;
  severity: 'critical' | 'important' | 'recommended';
  description: string;
}

export interface SeoCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface Scores {
  security: { score: number; grade: string };
  seo: { score: number; grade: string };
  performance: { score: number; label: string };
}

/** The final, UI-ready report assembled by src/lib/report.ts. */
export interface AnalysisReport {
  url: string;
  hostname: string;
  scannedAt: string;
  source: 'extension' | 'server' | 'demo';
  raw: RawScanData;
  network: NetworkInfo;
  headersInfo: HeadersInfo;
  technologies: TechDetection[];
  securityChecks: SecurityCheck[];
  seoChecks: SeoCheck[];
  scores: Scores;
}

/** Background response bundle for a network lookup request. */
export interface NetworkBundle {
  network: NetworkInfo;
  headersInfo: HeadersInfo;
}
