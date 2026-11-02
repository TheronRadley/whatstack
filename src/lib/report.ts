/**
 * Report assembly: merges raw scan + network + headers into the final
 * AnalysisReport consumed by every dashboard component and the JSON export.
 */

import type {
  AnalysisReport,
  HeadersInfo,
  NetworkInfo,
  RawScanData,
} from '../shared/types';
import { detectTechnologies } from './detect';
import { buildSecurityChecks, buildSeoChecks, computeScores } from './scoring';

export function emptyNetwork(hostname: string): NetworkInfo {
  return {
    hostname,
    dns: { A: [], AAAA: [], CNAME: [], MX: [], TXT: [], NS: [], CAA: [] },
    robots: { exists: false, sitemaps: [], disallowCount: 0 },
    sitemap: { exists: false },
    errors: [],
  };
}

export function emptyHeaders(): HeadersInfo {
  return { source: 'none', headers: {}, cookies: [] };
}

/** Normalize protocol strings from various sources to a display label. */
export function protocolLabel(raw: RawScanData, headersInfo: HeadersInfo): string {
  const fromHeaders = headersInfo.httpVersion; // e.g. "HTTP/2"
  if (fromHeaders) return fromHeaders.toUpperCase();
  const p = (raw.performance.protocol ?? '').toLowerCase();
  if (p === 'h3' || p.startsWith('h3-')) return 'HTTP/3';
  if (p === 'h2') return 'HTTP/2';
  if (p === 'http/1.1') return 'HTTP/1.1';
  if (p === 'http/1.0') return 'HTTP/1.0';
  if (p === 'quic') return 'HTTP/3 (QUIC)';
  return 'Not Detected';
}

export function buildReport(
  raw: RawScanData,
  network: NetworkInfo,
  headersInfo: HeadersInfo,
  source: AnalysisReport['source'],
): AnalysisReport {
  const technologies = detectTechnologies({ raw, headersInfo });
  const securityChecks = buildSecurityChecks(raw, headersInfo);
  const seoChecks = buildSeoChecks(raw, network);
  const scores = computeScores(raw, securityChecks, seoChecks);
  return {
    url: raw.url,
    hostname: raw.hostname,
    scannedAt: raw.scannedAt,
    source,
    raw,
    network,
    headersInfo,
    technologies,
    securityChecks,
    seoChecks,
    scores,
  };
}

export function formatBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return 'Not Detected';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** ISO 3166-1 alpha-2 -> flag emoji (regional indicator pair). */
export function flagEmoji(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function formatMs(ms: number | undefined): string {
  if (ms === undefined || ms < 0) return 'Not Detected';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
