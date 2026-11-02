/**
 * Security / SEO / performance grading.
 * Pure functions over the merged signals — shared by extension, server
 * and demo modes so every surface grades identically.
 */

import type {
  HeadersInfo,
  NetworkInfo,
  RawScanData,
  Scores,
  SecurityCheck,
  SeoCheck,
} from '../shared/types';

export function buildSecurityChecks(
  raw: RawScanData,
  headersInfo: HeadersInfo,
): SecurityCheck[] {
  const h = headersInfo.headers;
  const isHttps = raw.url.toLowerCase().startsWith('https://');
  const csp = h['content-security-policy'];
  const frameAncestors = csp?.match(/frame-ancestors[^;]*/i)?.[0];

  const checks: SecurityCheck[] = [
    {
      id: 'https', label: 'HTTPS / TLS transport', header: '(scheme)',
      present: isHttps, value: isHttps ? 'https' : 'http', severity: 'critical',
      description: 'Traffic is encrypted in transit with TLS.',
    },
    {
      id: 'hsts', label: 'Strict-Transport-Security (HSTS)', header: 'strict-transport-security',
      present: !!h['strict-transport-security'], value: h['strict-transport-security'],
      severity: 'critical',
      description: 'Forces browsers to only connect over HTTPS, defeating SSL-stripping.',
    },
    {
      id: 'csp', label: 'Content-Security-Policy', header: 'content-security-policy',
      present: !!csp, value: csp, severity: 'critical',
      description: 'Whitelists trusted content sources; primary defense against XSS and injection.',
    },
    {
      id: 'xfo', label: 'Clickjacking protection', header: 'x-frame-options / frame-ancestors',
      present: !!h['x-frame-options'] || !!frameAncestors,
      value: h['x-frame-options'] ?? frameAncestors, severity: 'important',
      description: 'Prevents the page being framed by attacker sites (clickjacking).',
    },
    {
      id: 'xcto', label: 'X-Content-Type-Options', header: 'x-content-type-options',
      present: (h['x-content-type-options'] ?? '').toLowerCase().includes('nosniff'),
      value: h['x-content-type-options'], severity: 'important',
      description: 'Stops MIME-type sniffing attacks (expects "nosniff").',
    },
    {
      id: 'referrer', label: 'Referrer-Policy', header: 'referrer-policy',
      present: !!h['referrer-policy'], value: h['referrer-policy'], severity: 'recommended',
      description: 'Controls how much referrer information leaks to other origins.',
    },
    {
      id: 'permissions', label: 'Permissions-Policy', header: 'permissions-policy',
      present: !!h['permissions-policy'], value: h['permissions-policy'], severity: 'recommended',
      description: 'Restricts powerful browser features (camera, geolocation, payment, …).',
    },
    {
      id: 'coop', label: 'Cross-Origin-Opener-Policy', header: 'cross-origin-opener-policy',
      present: !!h['cross-origin-opener-policy'], value: h['cross-origin-opener-policy'],
      severity: 'recommended',
      description: 'Isolates the browsing context group from cross-origin windows.',
    },
    {
      id: 'coep', label: 'Cross-Origin-Embedder-Policy', header: 'cross-origin-embedder-policy',
      present: !!h['cross-origin-embedder-policy'], value: h['cross-origin-embedder-policy'],
      severity: 'recommended',
      description: 'Requires explicit opt-in for cross-origin resources; enables cross-origin isolation.',
    },
  ];
  return checks;
}

const SEVERITY_WEIGHT: Record<SecurityCheck['severity'], number> = {
  critical: 3, important: 2, recommended: 1,
};

export function gradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function buildSeoChecks(raw: RawScanData, network: NetworkInfo): SeoCheck[] {
  const title = raw.meta.title ?? raw.title ?? '';
  const description = raw.meta.description ?? '';
  const h1Count = raw.headingCounts.h1 ?? 0;
  const ogReady = ['og:title', 'og:description', 'og:image', 'og:type'].filter(
    (k) => raw.meta.openGraph[k],
  ).length;
  const altCoverage = raw.images.total
    ? Math.round((raw.images.withAlt / raw.images.total) * 100)
    : 100;

  // Heading hierarchy sanity: no skipped levels (e.g. h1 -> h3).
  let hierarchyOk = true;
  let prev = 0;
  for (const heading of raw.headings) {
    if (prev && heading.level > prev + 1) { hierarchyOk = false; break; }
    prev = heading.level;
  }

  return [
    {
      id: 'title', label: 'Title tag (10–60 chars)',
      passed: title.length >= 10 && title.length <= 60,
      detail: title ? `"${title.slice(0, 70)}" (${title.length} chars)` : 'Missing <title>',
    },
    {
      id: 'description', label: 'Meta description (50–160 chars)',
      passed: description.length >= 50 && description.length <= 160,
      detail: description ? `${description.length} chars` : 'Missing meta description',
    },
    {
      id: 'h1', label: 'Exactly one <h1>',
      passed: h1Count === 1, detail: `${h1Count} found`,
    },
    {
      id: 'hierarchy', label: 'Heading hierarchy has no skipped levels',
      passed: hierarchyOk, detail: hierarchyOk ? 'Clean h1→h6 nesting' : 'A heading level is skipped',
    },
    {
      id: 'canonical', label: 'Canonical URL',
      passed: !!raw.meta.canonical, detail: raw.meta.canonical ?? 'No <link rel="canonical">',
    },
    {
      id: 'opengraph', label: 'OpenGraph tags (title/description/image/type)',
      passed: ogReady >= 3, detail: `${ogReady}/4 core tags present`,
    },
    {
      id: 'twitter', label: 'Twitter Card',
      passed: !!raw.meta.twitter['twitter:card'],
      detail: raw.meta.twitter['twitter:card'] ?? 'No twitter:card tag',
    },
    {
      id: 'viewport', label: 'Mobile viewport',
      passed: !!raw.viewport, detail: raw.viewport ?? 'No viewport meta',
    },
    {
      id: 'lang', label: 'HTML lang attribute',
      passed: !!raw.lang, detail: raw.lang ?? 'No lang attribute',
    },
    {
      id: 'alt', label: 'Image alt-text coverage ≥ 80%',
      passed: altCoverage >= 80,
      detail: raw.images.total ? `${altCoverage}% of ${raw.images.total} images` : 'No images',
    },
    {
      id: 'structured', label: 'Structured data (JSON-LD)',
      passed: raw.structuredDataTypes.length > 0,
      detail: raw.structuredDataTypes.length ? raw.structuredDataTypes.join(', ') : 'None found',
    },
    {
      id: 'robots-file', label: 'robots.txt present',
      passed: network.robots.exists,
      detail: network.robots.exists ? `${network.robots.disallowCount} disallow rule(s)` : 'Not found (404)',
    },
    {
      id: 'sitemap', label: 'sitemap.xml present',
      passed: network.sitemap.exists,
      detail: network.sitemap.exists
        ? `${network.sitemap.urlCount ?? '?'} URLs${network.sitemap.isIndex ? ' (index)' : ''}`
        : 'Not found',
    },
    {
      id: 'indexable', label: 'Page is indexable (no noindex)',
      passed: !(raw.meta.robots ?? '').toLowerCase().includes('noindex'),
      detail: raw.meta.robots ?? 'No robots meta (defaults to index)',
    },
  ];
}

export function computeScores(
  raw: RawScanData,
  securityChecks: SecurityCheck[],
  seoChecks: SeoCheck[],
): Scores {
  const totalWeight = securityChecks.reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0);
  const earned = securityChecks.reduce(
    (s, c) => s + (c.present ? SEVERITY_WEIGHT[c.severity] : 0), 0,
  );
  const securityScore = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;

  const seoScore = seoChecks.length
    ? Math.round((seoChecks.filter((c) => c.passed).length / seoChecks.length) * 100)
    : 0;

  // Performance heuristic: reward fast loads & light pages.
  const load = raw.performance.loadMs ?? 2500;
  const mb = (raw.performance.totalTransferBytes || raw.htmlBytes) / 1_048_576;
  let perf = 100;
  if (load > 1000) perf -= Math.min(45, (load - 1000) / 120);
  if (mb > 1) perf -= Math.min(35, (mb - 1) * 7);
  if (raw.performance.resourceCount > 80) perf -= Math.min(15, (raw.performance.resourceCount - 80) / 20);
  const perfScore = Math.max(5, Math.min(100, Math.round(perf)));

  return {
    security: { score: securityScore, grade: gradeFromScore(securityScore) },
    seo: { score: seoScore, grade: gradeFromScore(seoScore) },
    performance: {
      score: perfScore,
      label: perfScore >= 80 ? 'Fast' : perfScore >= 55 ? 'Moderate' : 'Slow',
    },
  };
}
