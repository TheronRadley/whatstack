<div align="center">

# WhatStack ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-34d399.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)

**An enterprise grade, dark mode Manifest V3 Chrome Extension that exposes the complete technical DNA of any website in a single click.**

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

### 🔍 Overview

**WhatStack** is a high performance developer tool for deep-dive technographic auditing. Unlike standard tools that only scrape script tags, WhatStack dynamically evaluates the **live runtime** — JS globals (`window.React`, `__next_f`, `__VUE__`, …), DOM fingerprints, computed performance timing, the *real* response headers Chrome received, DNS routing, SSL intelligence and SEO architecture — and renders everything inside a sleek, cyber-minimalist dashboard.

### 📦 The 5 Analysis Modules

| Module | What you get |
|---|---|
| **Frontend Tech & Content** | CMS (WordPress, Shopify, Webflow, Wix…), JS frameworks & libraries with versions (React, Next.js, Vue, Nuxt, Angular, Svelte, jQuery…), CSS systems (Tailwind, Bootstrap, MUI, Radix…), fonts, analytics (GA4, GTM, Meta/TikTok pixels, Hotjar, PostHog, Segment…) — **100+ fingerprints, each with evidence + confidence** |
| **Infrastructure & Hosting** | Hosting/CDN identification (Vercel, Netlify, Cloudflare, AWS CloudFront, Fastly, Akamai…), web server (Nginx, Apache, LiteSpeed, IIS), SSL/TLS certificate (issuer, SANs, expiry countdown) |
| **SEO & Meta Architecture** | Title/description/keywords, OpenGraph & Twitter cards, canonical, H1–H6 counts + full hierarchy, JSON-LD types, robots.txt & sitemap.xml status, 14-point SEO audit |
| **Security & Performance** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer/Permissions-Policy, COOP/COEP graded **A+–F**, cookie flags, page weight, TTFB/load timing, HTTP/1.1 vs HTTP/2 vs HTTP/3 |
| **DNS & Network Footprint** | A, AAAA, CNAME, MX, TXT, NS, SOA, CAA records (live DNS-over-HTTPS), IP address + geolocation (country, city, ISP, ASN), full raw response-header dump |

### 🏗️ Architecture (Manifest V3)

```
┌────────────────────────────┐   chrome.tabs.sendMessage    ┌─────────────────────────┐
│ popup.html / index.html    │ ───────────────────────────▶ │ content.js (ISOLATED)   │
│ React + TS + Tailwind      │ ◀─────────────────────────── │ DOM / meta / headings / │
│ - auto-scans active tab    │        RawScanData           │ perf timing / storage   │
│ - detection engine (100+)  │                              └───────────┬─────────────┘
│ - A–F security/SEO scoring │                 injects <script>         │ window.postMessage
│ - JSON export, badge count │                              ┌───────────▼─────────────┐
└─────────────┬──────────────┘                              │ injected.js (MAIN world)│
              │ chrome.runtime.sendMessage                  │ __next_f, window.React, │
┌─────────────▼──────────────┐                              │ Vue/Angular hooks, fbq… │
│ background.js (SW)         │                              └─────────────────────────┘
│ - webRequest header capture│
│ - DNS-over-HTTPS, IP geo   │
│ - SSL via CT logs (crt.sh) │
│ - robots.txt / sitemap.xml │
│ - session cache + badge    │
└────────────────────────────┘
        optional ▼
┌────────────────────────────┐
│ server/ — Express API      │  POST /api/analyze (Axios + Cheerio + node:dns + node:tls)
│ powers the plain-web demo  │  SSRF-guarded, rate-limited, same JSON shapes
└────────────────────────────┘
```

**Why three page contexts?** Content scripts can't see page JS globals (isolated world), so
`content.js` injects `injected.js` into the MAIN world and merges its `postMessage` reply.
CORS-bound lookups (DNS, geo, certs, robots) run in the service worker, which also captures
the *genuine* main-frame response headers via `chrome.webRequest` (including `Set-Cookie`
flags and the HTTP version — things `fetch()` hides).

### 🚀 Quick Start

**Prerequisites:** Node.js ≥ 18, npm, and a Chromium-based browser.

```bash
git clone https://github.com
cd whatstack
npm install
npm run build        # typecheck + Vite (popup/dashboard) + esbuild (bg/content/injected) → dist/
```

**Load the extension:**

1. Open `chrome://extensions/` and enable **Developer mode** (top right).
2. Click **Load unpacked** and select the generated **`dist/`** folder.
3. Visit any website and click the WhatStack toolbar icon — the scan starts automatically.
   Use the **Expand** button for the full-page dashboard, **Export** for a JSON report.

**Web demo (no extension):**

```bash
npm run dev                    # http://localhost:5173 — demo fixtures, labelled in UI
npm run server:install         # optional: real server-side scans
npm run server:dev             # Express API on :4000 (Vite proxies /api → :4000)
```

**Development:**

```bash
npm run dev:ext      # watch-rebuild background/content/injected into dist/
npm run typecheck    # tsc --noEmit (strict)
npm run icons        # regenerate public/icons/*.png (zero-dependency PNG encoder)
npm run lint
```

### 🗂️ Project Layout

```
whatstack/
├── public/
│   ├── manifest.json          # MV3 manifest (copied verbatim to dist/)
│   └── icons/                 # generated PNG icons 16/32/48/128
├── popup.html                 # extension popup entry (460×600)
├── index.html                 # full-page dashboard + options page + web demo
├── scripts/
│   ├── build-extension.mjs    # esbuild IIFE bundles: background/content/injected
│   └── generate-icons.mjs
├── src/
│   ├── shared/                # types.ts · messages.ts (protocol) · url.ts
│   ├── content/
│   │   ├── content.ts         # live DOM audit (ISOLATED world)
│   │   └── injected.ts        # JS-globals probe (MAIN world)
│   ├── background/
│   │   ├── background.ts      # service worker: routing, cache, badge, webRequest
│   │   ├── dns.ts             # DNS-over-HTTPS (Google + Cloudflare fallback)
│   │   ├── geo.ts             # IP geolocation + SSL via CT logs
│   │   └── http.ts            # header capture, robots.txt, sitemap.xml
│   ├── lib/
│   │   ├── rules.ts           # 100+ technology fingerprint rules
│   │   ├── detect.ts          # rule evaluator (evidence, versions, confidence)
│   │   ├── scoring.ts         # security/SEO checks + A–F grades
│   │   ├── report.ts          # final AnalysisReport assembly
│   │   ├── api.ts             # web-mode client for the Express API
│   │   └── demo.ts            # labelled demo fixtures for the web demo
│   └── popup/
│       ├── App.tsx            # shell: header, tabs, popup vs wide layout
│       ├── hooks/useAnalysis.ts
│       └── components/        # Landing, ScanProgress (typewriter+skeleton),
│                              # OverviewBar, TechStackTab, SeoSecurityTab, DnsNetworkTab
└── server/                    # optional Express companion (own package.json)
    └── src/                   # index.ts (API) · analyze.ts · types.ts
```

### 🔐 Permissions — and why

| Permission | Reason |
|---|---|
| `activeTab` + `scripting` | Run/injected the scanner in the tab you click on (incl. tabs opened before install) |
| `host_permissions: http/https` | Service-worker fetches (robots/sitemap/headers) + content script on any site |
| `webRequest` (observe-only) | Capture true main-frame response headers & cookie flags — never blocks/modifies traffic |
| `storage` | 5-minute per-host cache in `chrome.storage.session` |

All analysis runs locally in your browser. External calls go only to public
infrastructure APIs (Google/Cloudflare DoH, ipwho.is, crt.sh) with the target
hostname/IP — the same data any DNS lookup reveals. No WhatStack server, no telemetry.

### 🛠️ Tech Profile

- **UI:** React 18 + TypeScript (strict) + Vite + Tailwind CSS + Lucide icons
- **Extension scripts:** esbuild single-file IIFE bundles (MV3-safe content scripts)
- **Server (optional):** Express 4 + Axios + Cheerio + native `node:dns` / `node:tls`

### 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE).
