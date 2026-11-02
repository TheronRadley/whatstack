/**
 * Scan orchestration.
 *
 * Extension mode: query the active tab -> ask content.js for a live DOM
 * scan (injecting it on demand if the tab predates the extension) -> ask
 * background.js for DNS/geo/cert/headers -> assemble the report -> badge.
 *
 * Web mode: POST to the Express companion server, falling back to clearly
 * labelled demo fixtures so the dashboard is demonstrable anywhere.
 */

import { useCallback, useRef, useState } from 'react';
import { MSG, makeRequestId } from '../../shared/messages';
import type {
  AnalysisReport,
  NetworkBundle,
  RawScanData,
} from '../../shared/types';
import { getHostname, isRestrictedUrl, normalizeUrl } from '../../shared/url';
import { analyzeForWeb, isExtensionContext, isPopupSurface } from '../../lib/api';
import { buildReport, emptyHeaders, emptyNetwork } from '../../lib/report';

export type ScanPhase =
  | 'idle' | 'connecting' | 'dom' | 'globals' | 'dns' | 'network' | 'scoring' | 'done' | 'error';

export interface ScanState {
  phase: ScanPhase;
  stepLabel: string;
  report: AnalysisReport | null;
  error: string | null;
  restrictedUrl?: string;
  targetUrl?: string;
}

const INITIAL: ScanState = { phase: 'idle', stepLabel: '', report: null, error: null };

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendTabScan(tabId: number): Promise<RawScanData> {
  const attempt = () =>
    chrome.tabs.sendMessage(tabId, { type: MSG.SCAN, requestId: makeRequestId() }) as Promise<
      { ok: boolean; data?: RawScanData; error?: string } | undefined
    >;

  let response: { ok: boolean; data?: RawScanData; error?: string } | undefined;
  try {
    response = await attempt();
  } catch {
    // Content script missing (tab opened before install/update): inject & retry.
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await delay(120);
    response = await attempt();
  }
  if (!response?.ok || !response.data) {
    throw new Error(response?.error ?? 'The page did not respond to the WhatStack content script.');
  }
  return response.data;
}

async function requestNetwork(hostname: string, url: string, tabId: number): Promise<NetworkBundle> {
  const response = (await chrome.runtime.sendMessage({
    type: MSG.NETWORK, hostname, url, tabId,
  })) as { ok: boolean; bundle?: NetworkBundle; error?: string } | undefined;
  if (!response?.ok || !response.bundle) {
    throw new Error(response?.error ?? 'Background network lookup failed.');
  }
  return response.bundle;
}

export function useAnalysis() {
  const [state, setState] = useState<ScanState>(INITIAL);
  const runRef = useRef(0);

  const setPhase = useCallback((phase: ScanPhase, stepLabel: string, patch?: Partial<ScanState>) => {
    setState((s) => ({ ...s, phase, stepLabel, ...patch }));
  }, []);

  /**
   * Pick the tab to scan. In the popup that's the active tab of the current
   * window. In the full-page dashboard the active tab is *this* extension
   * page, so fall back to the most recently used scannable web tab.
   */
  const pickTargetTab = useCallback(async (): Promise<chrome.tabs.Tab | undefined> => {
    if (isPopupSurface()) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    }
    const self = await chrome.tabs.getCurrent().catch(() => undefined);
    const tabs = await chrome.tabs.query({});
    return tabs
      .filter((t) => t.id !== self?.id && t.url && !isRestrictedUrl(t.url))
      .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0]
      ?? tabs.find((t) => t.active);
  }, []);

  /** Extension: scan whatever tab is currently active. */
  const scanActiveTab = useCallback(async () => {
    const run = ++runRef.current;
    setState({ ...INITIAL, phase: 'connecting', stepLabel: 'Connecting to active tab…' });
    try {
      const tab = await pickTargetTab();
      if (!tab?.id || !tab.url) throw new Error('No active tab found.');
      if (isRestrictedUrl(tab.url)) {
        setState({
          phase: 'error', stepLabel: '', report: null,
          error: 'This page cannot be analyzed. Browsers block extensions on internal pages (chrome://, about:, extension pages) and the Web Store.',
          restrictedUrl: tab.url,
        });
        return;
      }
      const hostname = getHostname(tab.url);

      setPhase('dom', 'Parsing DOM, meta tags & headings…', { targetUrl: tab.url });
      const rawPromise = sendTabScan(tab.id);

      setPhase('dns', 'Fetching DNS records & IP geolocation…');
      const bundlePromise = requestNetwork(hostname, tab.url, tab.id).catch(
        (): NetworkBundle => ({ network: emptyNetwork(hostname), headersInfo: emptyHeaders() }),
      );

      const raw = await rawPromise;
      if (run !== runRef.current) return;
      setPhase('globals', 'Inspecting JS runtime globals & framework fingerprints…');
      const bundle = await bundlePromise;
      if (run !== runRef.current) return;

      setPhase('network', 'Checking SSL certificate & security headers…');
      await delay(60);
      setPhase('scoring', 'Scoring SEO, security & performance…');

      const report = buildReport(raw, bundle.network, bundle.headersInfo, 'extension');
      chrome.runtime
        .sendMessage({ type: MSG.BADGE, tabId: tab.id, count: report.technologies.length })
        .catch(() => undefined);

      setState({ phase: 'done', stepLabel: 'Analysis complete', report, error: null, targetUrl: tab.url });
    } catch (err) {
      if (run !== runRef.current) return;
      setState({
        phase: 'error', stepLabel: '', report: null,
        error: err instanceof Error ? err.message : 'Scan failed unexpectedly.',
      });
    }
  }, [setPhase, pickTargetTab]);

  /** Web mode: analyze an arbitrary URL via the companion server / demo data. */
  const scanUrl = useCallback(async (input: string) => {
    const run = ++runRef.current;
    const normalized = normalizeUrl(input);
    if (!normalized) {
      setState({
        phase: 'error', stepLabel: '', report: null,
        error: `"${input}" is not a valid website URL. Try something like vercel.com or https://example.com.`,
      });
      return;
    }
    setState({ ...INITIAL, phase: 'connecting', stepLabel: `Resolving ${getHostname(normalized)}…`, targetUrl: normalized });
    try {
      const steps: [ScanPhase, string, number][] = [
        ['dom', 'Fetching HTML & parsing meta tags…', 420],
        ['dns', 'Fetching DNS records (A, AAAA, MX, TXT)…', 420],
        ['network', 'Checking SSL certificate & security headers…', 420],
        ['scoring', 'Scoring SEO, security & performance…', 260],
      ];
      const resultPromise = analyzeForWeb(normalized);
      for (const [phase, label, wait] of steps) {
        if (run !== runRef.current) return;
        setPhase(phase, label);
        await delay(wait);
      }
      const result = await resultPromise;
      if (run !== runRef.current) return;
      const report = buildReport(
        result.raw, result.network, result.headersInfo,
        result.fromServer ? 'server' : 'demo',
      );
      setState({ phase: 'done', stepLabel: 'Analysis complete', report, error: null, targetUrl: normalized });
    } catch (err) {
      if (run !== runRef.current) return;
      setState({
        phase: 'error', stepLabel: '', report: null,
        error: err instanceof Error ? err.message : 'Analysis failed.',
      });
    }
  }, [setPhase]);

  const scan = isExtensionContext() ? scanActiveTab : scanUrl;

  return { state, scanActiveTab, scanUrl, scan, isExtension: isExtensionContext() };
}
