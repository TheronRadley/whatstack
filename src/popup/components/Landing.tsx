/**
 * Web-mode landing: centered glowing search bar + module overview.
 * (In the extension the active tab is scanned automatically instead.)
 */

import { Database, Globe2, Layers, Lock, Search, Server, Zap } from 'lucide-react';
import { useState } from 'react';

const EXAMPLES = ['vercel.com', 'wordpress.org', 'shopify.com', 'github.com'];

const MODULES = [
  { icon: Layers, title: 'Frontend Tech', text: 'CMS, JS frameworks, CSS systems, fonts, analytics & tracking pixels.' },
  { icon: Server, title: 'Infrastructure', text: 'Hosting, CDN, web server fingerprint and SSL/TLS certificate intel.' },
  { icon: Search, title: 'SEO Architecture', text: 'Meta tags, OpenGraph, heading hierarchy, robots.txt & sitemap.xml.' },
  { icon: Lock, title: 'Security & Speed', text: 'CSP, HSTS and friends graded A–F, plus load timing and page weight.' },
  { icon: Database, title: 'DNS & Network', text: 'A, AAAA, MX, CNAME, TXT records with IP geolocation and ISP.' },
];

export function Landing({ onAnalyze, wide }: { onAnalyze: (url: string) => void; wide: boolean }) {
  const [value, setValue] = useState('');
  const submit = () => {
    if (value.trim()) onAnalyze(value.trim());
  };
  return (
    <div className={`animate-fadeUp px-4 ${wide ? 'mx-auto w-full max-w-3xl py-14' : 'py-8'}`}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-violet/40 bg-gradient-to-br from-neon-violet/25 to-neon-mint/10 shadow-glow">
          <Layers className="h-7 w-7 text-neon-soft" />
        </span>
        <h1 className="mt-4 bg-gradient-to-r from-white via-neon-soft to-neon-mint bg-clip-text text-[26px] font-extrabold tracking-tight text-transparent">
          What's it built with?
        </h1>
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-zinc-400">
          WhatStack exposes the complete technical DNA of any website — stack,
          hosting, DNS, security posture and SEO architecture in one scan.
        </p>
      </div>

      <div className="ws-glow-input animate-pulseGlow mt-6 flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 transition">
        <Globe2 className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Scan Any Website"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-white placeholder-zinc-500 outline-none"
        />
        <button
          type="button"
          onClick={submit}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-neon-violet to-violet-500 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          <Zap className="h-3.5 w-3.5" />
          Analyze Stack
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        <span className="text-[11px] text-zinc-500">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onAnalyze(ex)}
            className="rounded-full border border-line bg-panel px-2.5 py-1 font-mono text-[11px] text-zinc-300 transition hover:border-neon-violet/50 hover:text-white"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className={`mt-8 grid gap-2.5 ${wide ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {MODULES.map((m) => (
          <div key={m.title} className="rounded-xl border border-line bg-panel/80 px-3.5 py-3 text-left">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
              <m.icon className="h-4 w-4 text-neon-soft" />
              {m.title}
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">{m.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-600">
        Tip: load <span className="font-mono text-zinc-400">dist/</span> as an unpacked Chrome extension
        for full live-runtime detection (window globals, real response headers, performance timing).
      </p>
    </div>
  );
}
