/**
 * WhatStack popup / dashboard root.
 *
 * Surfaces:
 * - Chrome extension popup (popup.html): fixed 460×600 shell, auto-scans
 *   the active tab on open.
 * - Full-page dashboard (index.html, also the extension options page and
 *   the plain-web demo): wide responsive layout with manual URL input in
 *   web mode, same auto-scan inside the extension.
 */

import {
  AlertTriangle, ArrowLeft, Download, Expand, Layers, ListTree,
  RefreshCw, Search, ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { isPopupSurface } from '../lib/api';
import { useAnalysis } from './hooks/useAnalysis';
import { DnsNetworkTab } from './components/DnsNetworkTab';
import { Landing } from './components/Landing';
import { OverviewBar } from './components/OverviewBar';
import { ScanProgress } from './components/ScanProgress';
import { SeoSecurityTab } from './components/SeoSecurityTab';
import { TechStackTab } from './components/TechStackTab';
import type { AnalysisReport } from '../shared/types';

type TabId = 'tech' | 'seo' | 'dns';

const TABS: { id: TabId; label: string; icon: typeof Layers }[] = [
  { id: 'tech', label: 'Tech Stack', icon: Layers },
  { id: 'seo', label: 'SEO & Security', icon: ShieldCheck },
  { id: 'dns', label: 'Raw DNS', icon: ListTree },
];

function exportReport(report: AnalysisReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whatstack-${report.hostname}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function App() {
  const { state, scanActiveTab, scanUrl, isExtension } = useAnalysis();
  const [tab, setTab] = useState<TabId>('tech');
  const [manualUrl, setManualUrl] = useState('');
  const [showLanding, setShowLanding] = useState(false);

  const popup = isPopupSurface();
  const wide = !popup;
  const scanning = ['connecting', 'dom', 'globals', 'dns', 'network', 'scoring'].includes(state.phase);
  const report = state.report;

  // Extension: scan the active tab the moment the popup opens.
  useEffect(() => {
    if (isExtension) void scanActiveTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExtension]);

  const openFullDashboard = () => {
    if (isExtension) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') }).catch(() => undefined);
    } else {
      window.open('/index.html', '_blank');
    }
  };

  const rescan = () => {
    if (isExtension) void scanActiveTab();
    else if (state.targetUrl) void scanUrl(state.targetUrl);
  };

  const header = (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-abyss/90 px-4 py-2.5 backdrop-blur">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-neon-violet/40 bg-gradient-to-br from-neon-violet/25 to-neon-mint/10">
        <Layers className="h-4 w-4 text-neon-soft" />
      </span>
      <span className="text-[15px] font-extrabold tracking-tight text-white">
        What<span className="text-neon-soft">Stack</span>
      </span>
      <span className="hidden rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] text-zinc-500 sm:inline">
        {isExtension ? 'MV3 extension' : 'web mode'}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        {!isExtension && report && (
          <button
            type="button"
            onClick={() => setShowLanding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-neon-violet/50 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> New scan
          </button>
        )}
        {report && (
          <>
            <button
              type="button"
              onClick={rescan}
              title="Rescan"
              className="inline-flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-neon-violet/50 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Rescan</span>
            </button>
            <button
              type="button"
              onClick={() => exportReport(report)}
              title="Export JSON report"
              className="inline-flex items-center gap-1 rounded-md border border-neon-violet/40 bg-neon-violet/15 px-2 py-1.5 text-[11px] font-semibold text-neon-soft transition hover:brightness-125"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </>
        )}
        {popup && (
          <button
            type="button"
            onClick={openFullDashboard}
            title="Open full dashboard in a tab"
            className="inline-flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-neon-violet/50 hover:text-white"
          >
            <Expand className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );

  const manualBar = !isExtension && !scanning && (report || state.phase === 'error') && !showLanding && (
    <div className="shrink-0 border-b border-line/70 bg-abyss/60 px-4 py-2">
      <div className="ws-glow-input flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <input
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && manualUrl.trim()) void scanUrl(manualUrl.trim());
          }}
          placeholder="Scan another website…"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-white placeholder-zinc-500 outline-none"
        />
        <button
          type="button"
          onClick={() => manualUrl.trim() && void scanUrl(manualUrl.trim())}
          className="shrink-0 rounded-md bg-gradient-to-r from-neon-violet to-violet-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:brightness-110"
        >
          Analyze Stack
        </button>
      </div>
    </div>
  );

  const body = useMemo(() => {
    if (scanning) return <ScanProgress label={state.stepLabel} targetUrl={state.targetUrl} />;

    if (state.phase === 'error') {
      return (
        <div className="animate-fadeUp px-4 py-8">
          <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 px-4 py-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <AlertTriangle className="h-5 w-5 text-neon-amber" />
              Scan unavailable
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-300">{state.error}</p>
            {state.restrictedUrl && (
              <p className="mt-2 break-all font-mono text-[11px] text-zinc-500">{state.restrictedUrl}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={rescan}
                className="rounded-lg bg-gradient-to-r from-neon-violet to-violet-500 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:brightness-110"
              >
                Try again
              </button>
              {!isExtension && (
                <button
                  type="button"
                  onClick={() => setShowLanding(true)}
                  className="rounded-lg border border-line bg-panel2 px-3.5 py-2 text-[12px] font-medium text-zinc-200 transition hover:border-neon-violet/50"
                >
                  Scan a different site
                </button>
              )}
            </div>
            {isExtension && (
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                Navigate to any regular http(s) website, then reopen WhatStack — the scan starts automatically.
              </p>
            )}
          </div>
        </div>
      );
    }

    if (!report || (!isExtension && showLanding)) {
      return (
        <Landing
          wide={wide}
          onAnalyze={(url) => {
            setShowLanding(false);
            void scanUrl(url);
          }}
        />
      );
    }

    return (
      <>
        <OverviewBar report={report} />
        <nav className="sticky top-0 z-10 flex shrink-0 gap-1 border-b border-line bg-abyss/95 px-3 py-2 backdrop-blur">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
                tab === id
                  ? 'border border-neon-violet/50 bg-neon-violet/15 text-white shadow-glow'
                  : 'border border-transparent text-zinc-400 hover:bg-panel2 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
        <div className={`animate-fadeUp px-3 py-3 ${wide ? 'mx-auto w-full max-w-6xl px-4' : ''}`}>
          {tab === 'tech' && <TechStackTab report={report} wide={wide} />}
          {tab === 'seo' && <SeoSecurityTab report={report} wide={wide} />}
          {tab === 'dns' && <DnsNetworkTab report={report} wide={wide} />}
          {report.raw.warnings.length > 0 && (
            <ul className="mt-3 space-y-0.5 px-1">
              {report.raw.warnings.map((w) => (
                <li key={w} className="text-[11px] text-zinc-600">Note: {w}</li>
              ))}
            </ul>
          )}
          <footer className="px-1 py-4 text-center text-[10.5px] text-zinc-600">
            WhatStack · scanned {new Date(report.scannedAt).toLocaleString()} ·{' '}
            {report.source === 'demo'
              ? 'Demo fixture (start the Express server or load the extension for live data)'
              : 'All analysis runs locally in your browser'}
          </footer>
        </div>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, scanning, report, tab, wide, isExtension, showLanding]);

  if (popup) {
    return (
      <div className="ws-popup-shell mx-auto bg-void">
        {header}
        {manualBar}
        <main className="ws-scroll min-h-0 flex-1">{body}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-void">
      {header}
      {manualBar}
      <main className="ws-scroll flex-1">{body}</main>
    </div>
  );
}
