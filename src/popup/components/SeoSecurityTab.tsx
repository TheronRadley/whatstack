/**
 * Tab 2 — SEO & Security Audit: meta architecture, heading hierarchy,
 * crawl files, security-headers grading, cookie flags and performance.
 */

import {
  CheckCircle2, FileSearch, Gauge, Heading1, ListChecks, ShieldX, XCircle,
} from 'lucide-react';
import type { AnalysisReport } from '../../shared/types';
import { formatBytes, formatMs, protocolLabel } from '../../lib/report';
import { Badge, Card, EmptyNote, KeyVal, NotDetected } from './ui';

function PassIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-neon-mint" />
    : <XCircle className="h-4 w-4 shrink-0 text-neon-rose" />;
}

export function SeoSecurityTab({ report, wide }: { report: AnalysisReport; wide: boolean }) {
  const { raw, network, headersInfo, securityChecks, seoChecks, scores } = report;
  const og = raw.meta.openGraph;
  const tw = raw.meta.twitter;
  const byType = Object.entries(raw.performance.resourcesByType).sort((a, b) => b[1].transferBytes - a[1].transferBytes);
  const maxBytes = Math.max(1, ...byType.map(([, v]) => v.transferBytes));

  return (
    <div className={`grid gap-3 ${wide ? 'lg:grid-cols-2' : ''}`}>
      <Card
        title={`SEO Audit — ${scores.seo.score}/100 (Grade ${scores.seo.grade})`}
        icon={<ListChecks className="h-4 w-4" />}
      >
        <ul className="space-y-1.5">
          {seoChecks.map((check) => (
            <li key={check.id} className="flex items-start gap-2 text-[12px]">
              <PassIcon ok={check.passed} />
              <span className="min-w-0">
                <span className="text-zinc-200">{check.label}</span>
                <span className="block truncate font-mono text-[10px] text-zinc-500" title={check.detail}>
                  {check.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Meta Architecture" icon={<FileSearch className="h-4 w-4" />}>
        <div className="divide-y divide-line/50">
          <KeyVal k="Title" v={raw.meta.title ?? raw.title} />
          <KeyVal k="Description" v={raw.meta.description} />
          <KeyVal k="Keywords" v={raw.meta.keywords} />
          <KeyVal k="Canonical" v={raw.meta.canonical} mono />
          <KeyVal k="Robots meta" v={raw.meta.robots} />
          <KeyVal k="Generator" v={raw.meta.generator} />
          <KeyVal k="Theme color" v={raw.meta.themeColor} />
          <KeyVal k="Charset" v={raw.charset} />
        </div>
        <div className="mt-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">OpenGraph</div>
          {Object.keys(og).length === 0 ? (
            <div className="mt-1"><NotDetected label="No OpenGraph tags" /></div>
          ) : (
            <div className="mt-1 space-y-0.5">
              {Object.entries(og).slice(0, 8).map(([k, v]) => (
                <div key={k} className="truncate font-mono text-[10.5px] text-zinc-400" title={`${k} = ${v}`}>
                  <span className="text-neon-cyan">{k}</span> = {v}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Twitter Card</div>
          {Object.keys(tw).length === 0 ? (
            <div className="mt-1"><NotDetected label="No Twitter Card tags" /></div>
          ) : (
            <div className="mt-1 space-y-0.5">
              {Object.entries(tw).slice(0, 6).map(([k, v]) => (
                <div key={k} className="truncate font-mono text-[10.5px] text-zinc-400" title={`${k} = ${v}`}>
                  <span className="text-neon-cyan">{k}</span> = {v}
                </div>
              ))}
            </div>
          )}
        </div>
        {raw.structuredDataTypes.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {raw.structuredDataTypes.map((t) => <Badge key={t} tone="violet">{t}</Badge>)}
          </div>
        )}
      </Card>

      <Card title="Heading Structure (H1–H6)" icon={<Heading1 className="h-4 w-4" />}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Badge key={n} tone={(raw.headingCounts[`h${n}`] ?? 0) > 0 ? 'violet' : 'neutral'}>
              H{n}: {raw.headingCounts[`h${n}`] ?? 0}
            </Badge>
          ))}
        </div>
        {raw.headings.length === 0 ? (
          <NotDetected label="No headings found" />
        ) : (
          <div className="ws-scroll max-h-44 space-y-0.5 overflow-y-auto pr-1">
            {raw.headings.slice(0, 40).map((h, i) => (
              <div
                key={`${h.level}-${i}`}
                className="flex items-baseline gap-2 text-[12px]"
                style={{ paddingLeft: `${(h.level - 1) * 14}px` }}
              >
                <span className="shrink-0 font-mono text-[10px] font-bold text-neon-soft">H{h.level}</span>
                <span className="truncate text-zinc-300" title={h.text}>{h.text || '(empty)'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Crawl Files" icon={<FileSearch className="h-4 w-4" />}>
        <div className="divide-y divide-line/50">
          <KeyVal
            k="robots.txt"
            v={network.robots.exists ? `HTTP ${network.robots.status ?? 200} · ${network.robots.disallowCount} disallow(s)` : undefined}
          />
          <KeyVal
            k="sitemap.xml"
            v={network.sitemap.exists
              ? `${network.sitemap.urlCount ?? '?'} URLs${network.sitemap.isIndex ? ' · sitemap index' : ''}`
              : undefined}
          />
          <KeyVal k="Sitemap URL" v={network.sitemap.checkedUrl ?? network.robots.sitemaps[0]} mono />
        </div>
        {network.robots.snippet && (
          <pre className="ws-scroll mt-2 max-h-28 overflow-auto rounded-lg border border-line/70 bg-void px-2.5 py-2 font-mono text-[10px] leading-relaxed text-zinc-400">
            {network.robots.snippet}
          </pre>
        )}
      </Card>

      <Card
        title={`Security Headers — ${scores.security.score}/100 (Grade ${scores.security.grade})`}
        icon={<ShieldX className="h-4 w-4" />}
        right={<Badge tone="neutral">source: {headersInfo.source}</Badge>}
        className={wide ? 'lg:col-span-2' : ''}
      >
        {headersInfo.source === 'none' ? (
          <EmptyNote>
            Response headers could not be captured for this page, so the security grade reflects
            transport security only. Reload the tab and re-scan to observe live headers.
          </EmptyNote>
        ) : (
          <ul className={`grid gap-1.5 ${wide ? 'md:grid-cols-2' : ''}`}>
            {securityChecks.map((check) => (
              <li key={check.id} className="rounded-lg border border-line/70 bg-abyss/60 px-3 py-2">
                <div className="flex items-start gap-2">
                  <PassIcon ok={check.present} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-medium text-zinc-100">{check.label}</span>
                      <Badge tone={check.severity === 'critical' ? 'rose' : check.severity === 'important' ? 'amber' : 'neutral'}>
                        {check.severity}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{check.description}</p>
                    {check.present && check.value && (
                      <div className="mt-1 truncate rounded bg-void px-1.5 py-1 font-mono text-[10px] text-neon-mint" title={check.value}>
                        {check.header}: {check.value}
                      </div>
                    )}
                    {!check.present && (
                      <div className="mt-1 font-mono text-[10px] text-neon-rose">Missing: {check.header}</div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {headersInfo.cookies.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Set-Cookie flags ({headersInfo.cookies.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {headersInfo.cookies.slice(0, 10).map((c) => (
                <Badge key={c.name} tone={c.secure && c.httpOnly ? 'mint' : 'amber'}>
                  {c.name}
                  <span className="opacity-70">
                    {c.secure ? ' Secure' : ''}{c.httpOnly ? ' HttpOnly' : ''}{c.sameSite ? ` SameSite=${c.sameSite}` : ''}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card title={`Performance — ${scores.performance.label}`} icon={<Gauge className="h-4 w-4" />} className={wide ? 'lg:col-span-2' : ''}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-line/70 bg-abyss/60 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Protocol</div>
            <div className="text-[14px] font-bold text-white">{protocolLabel(raw, headersInfo)}</div>
          </div>
          <div className="rounded-lg border border-line/70 bg-abyss/60 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">TTFB</div>
            <div className="text-[14px] font-bold text-white">{formatMs(raw.performance.ttfbMs)}</div>
          </div>
          <div className="rounded-lg border border-line/70 bg-abyss/60 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">DOM Ready</div>
            <div className="text-[14px] font-bold text-white">{formatMs(raw.performance.domContentLoadedMs)}</div>
          </div>
          <div className="rounded-lg border border-line/70 bg-abyss/60 px-2.5 py-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Full Load</div>
            <div className="text-[14px] font-bold text-white">{formatMs(raw.performance.loadMs)}</div>
          </div>
        </div>
        {byType.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Transfer by resource type · total {formatBytes(raw.performance.totalTransferBytes)}
            </div>
            {byType.slice(0, 7).map(([type, v]) => (
              <div key={type} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 shrink-0 font-mono text-zinc-400">{type} ×{v.count}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neon-violet to-neon-mint"
                    style={{ width: `${Math.max(3, (v.transferBytes / maxBytes) * 100)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-zinc-500">{formatBytes(v.transferBytes)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
