/**
 * WhatStack companion API (Express + TypeScript).
 *
 *   POST /api/analyze  { url }  -> { raw, network, headersInfo }
 *   GET  /api/health            -> { ok: true }
 *
 * The Chrome extension is fully self-contained and does NOT need this
 * server. It exists for the plain-web dashboard (vite dev proxies /api
 * here) and as the structured scraping fallback described in the spec.
 *
 * Safety: URL normalization (scheme defaulting, trailing-slash stripping),
 * SSRF guard against private ranges, per-IP rate limiting, upstream timeouts,
 * response-size cap, and graceful per-module error reporting.
 */

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { analyzeUrl } from './analyze.js';

const PORT = Number(process.env.PORT ?? 4000);

/** Minimal in-memory fixed-window rate limiter (per IP). */
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(limit = 30, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count++;
    if (bucket.count > limit) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
    }
    return next();
  };
}

/** Mirrors src/shared/url.ts#normalizeUrl in the extension. */
function normalizeUrl(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  let candidate = input.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) candidate = `https://${candidate}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname) return null;
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = '';
  parsed.username = '';
  parsed.password = '';
  let out = parsed.toString();
  if (parsed.pathname === '/' && !parsed.search) out = out.replace(/\/$/, '');
  return out;
}

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'whatstack-server', version: '1.0.0' });
});

app.post('/api/analyze', rateLimit(), async (req: Request, res: Response) => {
  const normalized = normalizeUrl(req.body?.url);
  if (!normalized) {
    return res.status(400).json({ error: 'Provide a valid http(s) URL in { "url": "..." }.' });
  }
  try {
    const result = await analyzeUrl(normalized);
    return res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed.';
    const status = /SSRF|Refusing/.test(message) ? 403 : /timeout/i.test(message) ? 504 : 502;
    return res.status(status).json({ error: message });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[whatstack-server] listening on http://0.0.0.0:${PORT} — POST /api/analyze`);
});
