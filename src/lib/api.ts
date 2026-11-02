/**
 * Web-mode API client: talks to the optional Express companion server
 * (POST /api/analyze). Used when the dashboard runs as a plain web page;
 * the Chrome extension never takes this path.
 */

import type { HeadersInfo, NetworkInfo, RawScanData } from '../shared/types';
import { pickDemo } from './demo';

export interface ServerAnalyzeResult {
  raw: RawScanData;
  network: NetworkInfo;
  headersInfo: HeadersInfo;
  fromServer: boolean;
}

export async function analyzeViaServer(url: string, timeoutMs = 25_000): Promise<ServerAnalyzeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const json = (await res.json()) as { raw: RawScanData; network: NetworkInfo; headersInfo: HeadersInfo };
    if (!json.raw || !json.network || !json.headersInfo) throw new Error('Malformed server response');
    return { ...json, fromServer: true };
  } finally {
    clearTimeout(timer);
  }
}

/** Server-first, demo-fixture fallback (used for the browsable web demo). */
export async function analyzeForWeb(url: string): Promise<ServerAnalyzeResult> {
  try {
    return await analyzeViaServer(url);
  } catch {
    const demo = pickDemo(url);
    return { raw: demo.raw, network: demo.network, headersInfo: demo.headersInfo, fromServer: false };
  }
}

export function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.runtime?.id &&
    typeof chrome.tabs?.query === 'function'
  );
}

export function isPopupSurface(): boolean {
  return window.location.pathname.endsWith('popup.html');
}
