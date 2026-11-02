/**
 * Tab 1 — Tech Stack: detected technologies grouped by category, fonts,
 * page composition and storage footprint.
 */

import { BarChart3, Layers, Type, Database } from 'lucide-react';
import type { AnalysisReport, TechCategory, TechDetection } from '../../shared/types';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../lib/rules';
import { formatBytes } from '../../lib/report';
import { Badge, Card, EmptyNote, KeyVal, NotDetected, TechIcon } from './ui';

function ConfidenceDot({ level }: { level: TechDetection['confidence'] }) {
  const colors = { high: 'bg-neon-mint', medium: 'bg-neon-amber', low: 'bg-zinc-500' } as const;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500" title={`${level} confidence`}>
      <span className={`h-1.5 w-1.5 rounded-full ${colors[level]}`} />
      {level}
    </span>
  );
}

function TechRow({ tech }: { tech: TechDetection }) {
  return (
    <div className="group rounded-lg border border-line/70 bg-abyss/60 px-3 py-2 transition hover:border-neon-violet/40">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-panel2 text-neon-soft">
          <TechIcon name={tech.icon} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">{tech.name}</span>
        {tech.version && <Badge tone="violet">v{tech.version}</Badge>}
        <ConfidenceDot level={tech.confidence} />
      </div>
      {tech.evidence.length > 0 && (
        <div className="mt-1 space-y-0.5 pl-9">
          {tech.evidence.slice(0, 3).map((e) => (
            <div key={e} className="truncate font-mono text-[10px] text-zinc-500" title={e}>
              ↳ {e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TechStackTab({ report, wide }: { report: AnalysisReport; wide: boolean }) {
  const { raw, technologies } = report;

  const grouped = new Map<TechCategory, TechDetection[]>();
  for (const tech of technologies) {
    const list = grouped.get(tech.category) ?? [];
    list.push(tech);
    grouped.set(tech.category, list);
  }

  return (
    <div className={`grid gap-3 ${wide ? 'lg:grid-cols-2' : ''}`}>
      <Card
        title={`Detected Technologies (${technologies.length})`}
        icon={<Layers className="h-4 w-4" />}
        className={wide ? 'lg:col-span-2' : ''}
      >
        {technologies.length === 0 ? (
          <EmptyNote>
            No known technologies matched our {`100+`} fingerprints. This site may use a custom or
            heavily obfuscated stack — check the raw script inventory below.
          </EmptyNote>
        ) : (
          <div className="space-y-3.5">
            {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((category) => (
              <div key={category}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="h-px flex-1 bg-line/70" />
                  <span className="text-[10px] text-zinc-600">{grouped.get(category)!.length}</span>
                </div>
                <div className={`grid gap-1.5 ${wide ? 'md:grid-cols-2' : ''}`}>
                  {grouped.get(category)!.map((tech) => <TechRow key={tech.id} tech={tech} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Typography & Fonts" icon={<Type className="h-4 w-4" />}>
        {raw.fonts.length === 0 ? (
          <NotDetected label="No webfonts detected (system fonts likely)" />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {raw.fonts.map((f) => (
              <Badge key={`${f.family}-${f.source}`} tone={f.source === 'google-fonts' ? 'cyan' : 'neutral'}>
                {f.family}
                <span className="opacity-60">· {f.source}</span>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card title="Page Composition" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="divide-y divide-line/50">
          <KeyVal k="External scripts" v={String(raw.scriptSrcs.length)} />
          <KeyVal k="Stylesheets" v={String(raw.stylesheetHrefs.length)} />
          <KeyVal k="Images" v={`${raw.images.total} (${raw.images.lazy} lazy-loaded)`} />
          <KeyVal k="Links" v={`${raw.links.total} · ${raw.links.internal} internal · ${raw.links.external} external`} />
          <KeyVal k="Forms" v={String(raw.forms)} />
          <KeyVal k="Iframes / embeds" v={String(raw.iframes.length)} />
          <KeyVal k="HTML size (DOM)" v={formatBytes(raw.htmlBytes)} />
          <KeyVal k="Word count" v={raw.wordCount ? raw.wordCount.toLocaleString() : undefined} />
          <KeyVal k="Language" v={raw.lang} />
          <KeyVal k="Service Worker (PWA)" v={raw.serviceWorker ? 'Active' : undefined} />
          <KeyVal k="Web App Manifest" v={raw.webManifest ? 'Present' : undefined} />
        </div>
      </Card>

      <Card title="Storage Footprint" icon={<Database className="h-4 w-4" />}>
        <div className="divide-y divide-line/50">
          <KeyVal k="JS-visible cookies" v={String(raw.storage.cookieCount)} />
          <KeyVal k="localStorage keys" v={String(raw.storage.localStorageKeys)} />
          <KeyVal k="sessionStorage keys" v={String(raw.storage.sessionStorageKeys)} />
        </div>
        {raw.storage.cookieNames.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {raw.storage.cookieNames.slice(0, 14).map((name) => (
              <span key={name} className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                {name}
              </span>
            ))}
            {raw.storage.cookieNames.length > 14 && (
              <span className="text-[10px] text-zinc-600">+{raw.storage.cookieNames.length - 14} more</span>
            )}
          </div>
        )}
        {raw.scriptSrcs.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] font-medium text-zinc-400 hover:text-white">
              Script inventory ({raw.scriptSrcs.length})
            </summary>
            <div className="ws-scroll mt-2 max-h-36 space-y-0.5 overflow-y-auto pr-1">
              {raw.scriptSrcs.map((src) => (
                <div key={src} className="truncate font-mono text-[10px] text-zinc-500" title={src}>
                  {src}
                </div>
              ))}
            </div>
          </details>
        )}
      </Card>
    </div>
  );
}
