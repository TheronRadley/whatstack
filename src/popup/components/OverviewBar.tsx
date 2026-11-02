/**
 * Site identity + headline scores strip rendered above the tabs.
 */

import { Globe2, ShieldCheck } from 'lucide-react';
import type { AnalysisReport } from '../../shared/types';
import { flagEmoji, formatBytes, formatMs, protocolLabel } from '../../lib/report';
import { Badge, ScoreRing, Stat } from './ui';

export function OverviewBar({ report }: { report: AnalysisReport }) {
  const { raw, network, headersInfo, scores, technologies } = report;
  const cert = network.cert;
  return (
    <div className="animate-fadeUp border-b border-line/80 bg-abyss/70 px-4 py-3">
      <div className="flex items-start gap-3">
        {raw.favicon ? (
          <img
            src={raw.favicon}
            alt=""
            className="mt-0.5 h-8 w-8 shrink-0 rounded-lg border border-line bg-panel2 object-contain p-1"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2">
            <Globe2 className="h-4 w-4 text-zinc-400" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-white" title={raw.title}>
            {raw.title || raw.hostname}
          </div>
          <div className="truncate font-mono text-[11px] text-zinc-500" title={raw.url}>
            {raw.url}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={report.source === 'extension' ? 'mint' : report.source === 'server' ? 'cyan' : 'amber'}>
              {report.source === 'extension' ? '● Live runtime scan' : report.source === 'server' ? '● Server scan' : '● Demo data'}
            </Badge>
            <Badge tone="violet">{technologies.length} technologies</Badge>
            <Badge>{protocolLabel(raw, headersInfo)}</Badge>
            {network.primaryIp && (
              <Badge>
                {flagEmoji(network.geo?.countryCode)} {network.primaryIp}
                {network.geo?.country ? ` · ${network.geo.country}` : ''}
              </Badge>
            )}
            {cert && (
              <Badge tone={cert.daysRemaining !== undefined && cert.daysRemaining < 14 ? 'rose' : 'neutral'}>
                <ShieldCheck className="h-3 w-3" /> SSL
                {cert.daysRemaining !== undefined ? ` · ${cert.daysRemaining}d left` : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <div className="flex shrink-0 gap-3">
          <ScoreRing score={scores.security.score} label="Security" sub={`Grade ${scores.security.grade}`} />
          <ScoreRing score={scores.seo.score} label="SEO" sub={`Grade ${scores.seo.grade}`} />
          <ScoreRing score={scores.performance.score} label="Speed" sub={scores.performance.label} />
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <Stat label="Load time" value={formatMs(raw.performance.loadMs)} hint={`TTFB ${formatMs(raw.performance.ttfbMs)}`} />
          <Stat
            label="Page weight"
            value={formatBytes(raw.performance.totalTransferBytes || raw.htmlBytes)}
            hint={`${raw.performance.resourceCount} resources`}
          />
          <Stat label="HTTP status" value={headersInfo.status ? String(headersInfo.status) : '—'} hint={headersInfo.source === 'webrequest' ? 'observed live' : headersInfo.source} />
          <Stat label="Server" value={headersInfo.headers['server'] ?? 'Hidden'} hint={headersInfo.headers['x-powered-by'] ? `via ${headersInfo.headers['x-powered-by']}` : undefined} />
        </div>
      </div>
    </div>
  );
}
