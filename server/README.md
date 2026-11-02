# whatstack-server (optional companion API)

Express + TypeScript backend that powers the **plain-web** WhatStack dashboard.
The Chrome extension in the repository root is fully self-contained and does
**not** require this server.

## Run

```bash
cd server
npm install
npm run dev        # http://localhost:4000  (tsx watch)
```

Then, in the repository root, `npm run dev` — Vite proxies `/api` to port 4000,
so the web dashboard performs real server-side scans.

## API

### `GET /api/health`
`{ "ok": true, "service": "whatstack-server" }`

### `POST /api/analyze`
```bash
curl -X POST http://localhost:4000/api/analyze \
  -H 'content-type: application/json' \
  -d '{"url":"https://github.com"}'
```

Returns `{ raw, network, headersInfo }` — the same shapes the extension
produces (`src/shared/types.ts`), so the frontend runs identical detection
and scoring. Highlights:

- **URL normalization**: adds `https://`, strips root trailing slash, drops credentials/fragment.
- **SSRF guard**: refuses localhost / `.local` / private & link-local ranges after DNS lookup.
- **Fetching**: Axios, 12s timeout, ≤5 redirects, 5 MB cap, graceful per-module errors.
- **Parsing**: Cheerio — meta/OpenGraph/Twitter, H1–H6, scripts, fonts, JSON-LD, links, images.
- **DNS**: native `node:dns` — A, AAAA, CNAME, MX, TXT, NS, SOA, CAA.
- **SSL**: native `node:tls` peer certificate (issuer, CN, SANs, expiry, days remaining).
- **Geo**: ipwho.is (country, city, ISP, ASN).
- **Crawl files**: robots.txt parsing + sitemap discovery/counting.
- **Limits**: 30 requests/minute/IP.

> Runtime JS globals (`window.React`, `__next_f`, …) are invisible to static
> scraping — use the extension for those signals, or swap `fetchHtml` for a
> Puppeteer/Playwright page evaluation of `src/content/injected.ts`'s probe list.
