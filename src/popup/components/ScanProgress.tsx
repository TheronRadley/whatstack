/**
 * Loading experience: terminal-style typewriter narrating the current scan
 * step on top of a dashboard skeleton.
 */

import { Loader2, Radar } from 'lucide-react';
import { useEffect, useState } from 'react';

function useTypewriter(text: string, speed = 16): string {
  const [out, setOut] = useState('');
  useEffect(() => {
    setOut('');
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return out;
}

export function ScanProgress({ label, targetUrl }: { label: string; targetUrl?: string }) {
  const typed = useTypewriter(label);
  return (
    <div className="animate-fadeUp px-4 py-5">
      <div className="relative overflow-hidden rounded-xl border border-line bg-abyss px-4 py-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-neon-violet/20 to-transparent animate-scanline" />
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neon-violet/40 bg-neon-violet/10">
            <Radar className="h-4.5 w-4.5 text-neon-soft animate-pulse" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
              Scanning{targetUrl ? <span className="truncate font-mono text-[11px] font-normal text-zinc-400">{targetUrl}</span> : null}
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-neon-mint" />
            </div>
            <div className="ws-mono mt-0.5 h-4 text-neon-mint">
              <span className="text-zinc-500">$ </span>
              {typed}
              <span className="animate-blink">▋</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3" aria-hidden>
        <div className="flex gap-3">
          <div className="ws-skeleton h-16 w-16 rounded-full" />
          <div className="ws-skeleton h-16 w-16 rounded-full" />
          <div className="ws-skeleton h-16 w-16 rounded-full" />
          <div className="ws-skeleton h-16 flex-1" />
        </div>
        <div className="ws-skeleton h-28 w-full" />
        <div className="ws-skeleton h-20 w-full" />
        <div className="ws-skeleton h-32 w-full" />
      </div>
    </div>
  );
}
