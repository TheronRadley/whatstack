/**
 * Mirrors src/shared/types.ts in the extension so POST /api/analyze returns
 * payloads the exact same detection + scoring pipeline can consume.
 * Keep in sync with the root project.
 */

export interface GlobalHit {
  present: boolean;
  version?: string;
  detail?: string;
}

export interface HeadingItem {
  level: number;
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
  protocol?: string;
  ttfbMs?: number;
  domContentLoadedMs?: number;
  loadMs?: number;
  documentTransferBytes?: number;
  totalTransferBytes: number;
  totalDecodedBytes: number;
  resourceCount: number;
  resourcesByType: Record<string, { count: number; transferBytes: number }>;
}

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
  scriptSrcs: string[];
  inlineHints: string[];
  stylesheetHrefs: string[];
  domHints: string[];
  classHints: string[];
  fonts: FontInfo[];
  images: { total: number; withAlt: number; lazy: number };
  links: { total: number; internal: number; external: number; anchors: number };
  forms: number;
  iframes: string[];
  structuredDataTypes: string[];
  globals: Record<string, GlobalHit>;
  htmlBytes: number;
  wordCount: number;
  performance: PerformanceInfo;
  storage: { cookieCount: number; cookieNames: string[]; localStorageKeys: number; sessionStorageKeys: number };
  serviceWorker: boolean;
  webManifest?: string;
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

export interface NetworkInfo {
  hostname: string;
  dns: DnsRecordSet;
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
  httpVersion?: string;
  headers: Record<string, string>;
  cookies: CookieInfo[];
  finalUrl?: string;
  redirectCount?: number;
}

export interface AnalyzeResponse {
  raw: RawScanData;
  network: NetworkInfo;
  headersInfo: HeadersInfo;
}
