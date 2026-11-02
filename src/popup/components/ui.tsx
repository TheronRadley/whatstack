/**
 * Shared presentational primitives: cards, badges, score rings, copy
 * buttons, "Not Detected" fallbacks and the Lucide icon mapper.
 */

import {
  Atom, BarChart3, Bone, Box, Bug, Check, CircleDot, Cloud, Code2, Coffee,
  Component, Cookie, Copy, Cpu, CreditCard, Database, Dog, Droplets,
  FastForward, FileCode2, Flame, Frame, Gauge, Gem, Ghost, Github, Globe,
  Key, Layers, LayoutGrid, LayoutTemplate, LineChart, MapPin, MessageCircle,
  Mountain, MountainSnow, Package, Paintbrush, PenTool, Rabbit, Rocket,
  Route, Server, ServerCog, Shield, ShieldCheck, ShoppingBag, ShoppingCart,
  Smartphone, Sparkles, Square, Tags, Target, Thermometer, Triangle, Type,
  Video, Wind, X, Youtube, Zap, Eye, Activity, Boxes, type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

const ICONS: Record<string, LucideIcon> = {
  atom: Atom, 'bar-chart-3': BarChart3, bone: Bone, box: Box, bug: Bug,
  'circle-dot': CircleDot, cloud: Cloud, 'code-2': Code2, coffee: Coffee,
  component: Component, cookie: Cookie, cpu: Cpu, 'credit-card': CreditCard,
  database: Database, dog: Dog, droplets: Droplets, 'fast-forward': FastForward,
  'file-code': FileCode2, flame: Flame, 'flame-kindling': Flame, frame: Frame,
  gauge: Gauge, gem: Gem, ghost: Ghost, github: Github, globe: Globe, hub: Boxes,
  key: Key, layers: Layers, 'layout-grid': LayoutGrid,
  'layout-template': LayoutTemplate, 'line-chart': LineChart, 'map-pin': MapPin,
  'message-circle': MessageCircle, mountain: Mountain, 'mountain-snow': MountainSnow,
  package: Package, paintbrush: Paintbrush, 'pen-tool': PenTool, rabbit: Rabbit,
  rocket: Rocket, route: Route, server: Server, 'server-cog': ServerCog,
  shield: Shield, 'shield-check': ShieldCheck, 'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart, smartphone: Smartphone, sparkles: Sparkles,
  square: Square, tags: Tags, target: Target, thermometer: Thermometer,
  triangle: Triangle, type: Type, video: Video, wind: Wind, youtube: Youtube,
  zap: Zap, eye: Eye, activity: Activity, hedgehog: Activity,
};

export function TechIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Cpu;
  return <Icon className={className} strokeWidth={1.8} />;
}

export function Card({
  title, icon, children, right, className = '',
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-panel/90 shadow-card ${className}`}>
      <header className="flex items-center gap-2 border-b border-line/70 px-3.5 py-2.5">
        <span className="text-neon-soft">{icon}</span>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-200">{title}</h3>
        {right && <span className="ml-auto">{right}</span>}
      </header>
      <div className="px-3.5 py-3">{children}</div>
    </section>
  );
}

export function Badge({
  children, tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'violet' | 'mint' | 'amber' | 'rose' | 'cyan';
}) {
  const tones: Record<string, string> = {
    neutral: 'border-line bg-panel2 text-zinc-300',
    violet: 'border-neon-violet/40 bg-neon-violet/15 text-neon-soft',
    mint: 'border-neon-mint/40 bg-neon-mint/10 text-neon-mint',
    amber: 'border-neon-amber/40 bg-neon-amber/10 text-neon-amber',
    rose: 'border-neon-rose/40 bg-neon-rose/10 text-neon-rose',
    cyan: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function NotDetected({ label = 'Not Detected' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500">
      <X className="h-3.5 w-3.5 text-zinc-600" />
      {label}
    </span>
  );
}

export function KeyVal({ k, v, mono = false }: { k: string; v?: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="shrink-0 text-[11px] uppercase tracking-wide text-zinc-500">{k}</span>
      <span className={`min-w-0 text-right text-[12px] text-zinc-200 ${mono ? 'font-mono break-all' : 'break-words'}`}>
        {v === undefined || v === null || v === '' ? <NotDetected /> : v}
      </span>
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch { /* clipboard unavailable */ }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:border-neon-violet/50 hover:text-white"
    >
      {copied ? <Check className="h-3 w-3 text-neon-mint" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export function ScoreRing({ score, label, sub }: { score: number; label: string; sub: string }) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34d399' : score >= 55 ? '#fbbf24' : '#fb7185';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[64px] w-[64px]">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#23233a" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-white">
          {score}
        </div>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-semibold text-zinc-200">{label}</div>
        <div className="text-[10px] text-zinc-500">{sub}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-line/70 bg-abyss/60 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-semibold text-zinc-100" title={typeof value === 'string' ? value : undefined}>
        {value}
      </div>
      {hint && <div className="truncate text-[10px] text-zinc-500">{hint}</div>}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-abyss/50 px-3 py-2.5 text-[12px] text-zinc-500">
      {children}
    </div>
  );
}
