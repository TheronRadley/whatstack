/**
 * Technology detection evaluator.
 * Runs every rule in rules.ts against the merged live signals (DOM scan +
 * MAIN-world globals + response headers + cookies), extracts versions,
 * assigns confidence, resolves implications (Next.js -> React, ...) and
 * returns a de-duplicated, evidence-backed detection list.
 */

import type {
  Confidence,
  HeadersInfo,
  RawScanData,
  TechDetection,
} from '../shared/types';
import { TECH_RULES, type TechRule } from './rules';

export interface SignalBundle {
  raw: RawScanData;
  headersInfo: HeadersInfo;
}

const STRONG = new Set(['global', 'header', 'generator', 'script', 'dom']);
const MEDIUM = new Set(['inline', 'cookie', 'iframe', 'stylesheet']);

function confidenceFor(kinds: Set<string>): Confidence {
  const strongCount = [...kinds].filter((k) => STRONG.has(k)).length;
  if (strongCount >= 2) return 'high';
  if (strongCount === 1) return kinds.size > 1 ? 'high' : 'medium';
  if ([...kinds].some((k) => MEDIUM.has(k))) return 'medium';
  return 'low';
}

function evaluateRule(rule: TechRule, signals: SignalBundle): TechDetection | null {
  const { raw, headersInfo } = signals;
  const evidence: string[] = [];
  const kinds = new Set<string>();
  let version: string | undefined;

  // MAIN-world globals
  for (const probeId of rule.globals ?? []) {
    const hitInfo = raw.globals[probeId];
    if (hitInfo?.present) {
      kinds.add('global');
      evidence.push(hitInfo.detail ? `Runtime global: ${hitInfo.detail}` : `Runtime global "${probeId}" detected`);
      if (!version && hitInfo.version) version = hitInfo.version;
    }
  }

  // <meta name="generator">
  if (rule.generator && raw.meta.generator) {
    const m = raw.meta.generator.match(rule.generator);
    if (m) {
      kinds.add('generator');
      evidence.push(`Generator meta: "${raw.meta.generator}"`);
      if (!version && m[1]) version = m[1];
    }
  }

  // Script URLs
  for (const re of rule.scripts ?? []) {
    const found = raw.scriptSrcs.find((src) => re.test(src));
    if (found) {
      kinds.add('script');
      evidence.push(`Script: ${shortenUrl(found)}`);
      if (!version) {
        const vm = found.match(re);
        const candidate = vm?.slice(1).find((g) => g && /^[\d.]+$/.test(g));
        if (candidate) version = candidate;
      }
      break;
    }
  }

  // Stylesheets
  for (const re of rule.stylesheets ?? []) {
    const found = raw.stylesheetHrefs.find((href) => re.test(href));
    if (found) {
      kinds.add('stylesheet');
      evidence.push(`Stylesheet: ${shortenUrl(found)}`);
      break;
    }
  }

  // DOM fingerprints
  for (const hint of rule.domHints ?? []) {
    if (raw.domHints.includes(hint)) {
      kinds.add('dom');
      evidence.push(`DOM fingerprint: ${hint}`);
    }
  }

  // Class fingerprints (weakest signal on its own)
  for (const hint of rule.classHints ?? []) {
    if (raw.classHints.includes(hint)) {
      kinds.add('class');
      evidence.push(`Class-name fingerprint: ${hint}`);
    }
  }

  // Inline script fingerprints
  for (const hint of rule.inlineHints ?? []) {
    if (raw.inlineHints.includes(hint)) {
      kinds.add('inline');
      evidence.push(`Inline script fingerprint: ${hint}`);
    }
  }

  // Iframes
  for (const re of rule.iframes ?? []) {
    const found = raw.iframes.find((src) => re.test(src));
    if (found) {
      kinds.add('iframe');
      evidence.push(`Embed: ${shortenUrl(found)}`);
      break;
    }
  }

  // Response headers
  for (const matcher of rule.headers ?? []) {
    const value = headersInfo.headers[matcher.name.toLowerCase()];
    if (value === undefined) continue;
    if (matcher.pattern) {
      const m = value.match(matcher.pattern);
      if (!m) continue;
      if (!version && matcher.versionGroup && m[1]) version = m[1];
    }
    kinds.add('header');
    evidence.push(`Header ${matcher.name}: ${value.slice(0, 80)}`);
  }

  // Cookies (JS-visible names from the page + Set-Cookie names from headers)
  const cookieNames = [
    ...raw.storage.cookieNames,
    ...headersInfo.cookies.map((c) => c.name),
  ];
  for (const re of rule.cookies ?? []) {
    const found = cookieNames.find((name) => re.test(name));
    if (found) {
      kinds.add('cookie');
      evidence.push(`Cookie: ${found}`);
      break;
    }
  }

  if (evidence.length === 0) return null;

  return {
    id: rule.id,
    name: rule.name,
    category: rule.category,
    version,
    confidence: confidenceFor(kinds),
    evidence: [...new Set(evidence)].slice(0, 5),
    website: rule.website,
    icon: rule.icon,
  };
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 38 ? `${u.pathname.slice(0, 35)}…` : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return url.slice(0, 60);
  }
}

/** Detections derived from font sources rather than generic rules. */
function fontDetections(signals: SignalBundle): TechDetection[] {
  const out: TechDetection[] = [];
  const sources = new Set(signals.raw.fonts.map((f) => f.source));
  const families = (src: string) =>
    signals.raw.fonts.filter((f) => f.source === src).map((f) => f.family).slice(0, 6).join(', ');
  if (sources.has('google-fonts')) {
    out.push({
      id: 'google-fonts', name: 'Google Fonts', category: 'font', confidence: 'high',
      evidence: [`Families: ${families('google-fonts')}`], icon: 'type',
      website: 'https://fonts.google.com',
    });
  }
  if (sources.has('adobe-fonts')) {
    out.push({
      id: 'adobe-fonts', name: 'Adobe Fonts', category: 'font', confidence: 'high',
      evidence: ['Typekit kit stylesheet detected'], icon: 'type',
      website: 'https://fonts.adobe.com',
    });
  }
  return out;
}

export function detectTechnologies(signals: SignalBundle): TechDetection[] {
  const detected = new Map<string, TechDetection>();

  for (const rule of TECH_RULES) {
    const hitResult = evaluateRule(rule, signals);
    if (hitResult) detected.set(rule.id, hitResult);
  }
  for (const fd of fontDetections(signals)) {
    if (!detected.has(fd.id)) detected.set(fd.id, fd);
  }

  // Resolve implications (one pass is enough for our rule graph).
  const byId = new Map(TECH_RULES.map((r) => [r.id, r]));
  for (const id of [...detected.keys()]) {
    for (const impliedId of byId.get(id)?.implies ?? []) {
      if (detected.has(impliedId)) continue;
      const impliedRule = byId.get(impliedId);
      if (!impliedRule) continue;
      const parent = detected.get(id)!;
      detected.set(impliedId, {
        id: impliedRule.id,
        name: impliedRule.name,
        category: impliedRule.category,
        confidence: 'medium',
        evidence: [`Implied by ${parent.name}`],
        website: impliedRule.website,
        icon: impliedRule.icon,
      });
    }
  }

  // Suppress near-duplicate noise: webpack runtime is implied by most
  // modern frameworks; keep it only when no framework was identified.
  const hasFramework = [...detected.values()].some((d) => d.category === 'framework');
  if (hasFramework) detected.delete('webpack');

  // GA4 supersedes the generic Universal Analytics hit when both fire
  // from the same gtag runtime.
  if (detected.has('ga4') && detected.has('google-analytics')) {
    const ua = detected.get('google-analytics')!;
    if (!ua.evidence.some((e) => e.includes('UA-') || e.includes('analytics.js'))) {
      detected.delete('google-analytics');
    }
  }

  return [...detected.values()];
}
