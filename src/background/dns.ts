/**
 * DNS resolution via DNS-over-HTTPS (DoH).
 * Browser extension service workers have no native dns module, so WhatStack
 * queries Google Public DNS (dns.google/resolve) with a Cloudflare
 * (cloudflare-dns.com/dns-query) fallback. All lookups run concurrently and
 * degrade gracefully per-record-type.
 */

import type { DnsRecordSet } from '../shared/types';

const TYPE_CODES: Record<string, number> = {
  A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28, CAA: 257,
};

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function queryGoogle(name: string, type: string): Promise<DohAnswer[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetchWithTimeout(url, { headers: { accept: 'application/dns-json' } });
  if (!res.ok) throw new Error(`DoH ${res.status}`);
  const json = (await res.json()) as DohResponse;
  return json.Answer ?? [];
}

async function queryCloudflare(name: string, type: string): Promise<DohAnswer[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetchWithTimeout(url, { headers: { accept: 'application/dns-json' } });
  if (!res.ok) throw new Error(`DoH ${res.status}`);
  const json = (await res.json()) as DohResponse;
  return json.Answer ?? [];
}

async function query(name: string, type: keyof typeof TYPE_CODES): Promise<DohAnswer[]> {
  try {
    return await queryGoogle(name, type);
  } catch {
    try {
      return await queryCloudflare(name, type);
    } catch {
      return [];
    }
  }
}

const clean = (v: string) => v.replace(/\.$/, '').trim();

export async function resolveAllDns(hostname: string): Promise<DnsRecordSet> {
  const types = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'] as const;
  const results = await Promise.allSettled(types.map((t) => query(hostname, t)));
  const byType = new Map<string, DohAnswer[]>();
  types.forEach((t, i) => {
    const r = results[i];
    byType.set(t, r.status === 'fulfilled' ? r.value : []);
  });

  const dataOf = (t: string) =>
    (byType.get(t) ?? [])
      .filter((a) => a.type === TYPE_CODES[t])
      .map((a) => clean(a.data));

  // If the host is a CNAME, A/AAAA answers may only appear at the target.
  const cname = dataOf('CNAME');
  let a = dataOf('A');
  let aaaa = dataOf('AAAA');
  if (cname.length && a.length === 0) {
    a = (await query(cname[0], 'A')).filter((x) => x.type === 1).map((x) => clean(x.data));
  }
  if (cname.length && aaaa.length === 0) {
    aaaa = (await query(cname[0], 'AAAA')).filter((x) => x.type === 28).map((x) => clean(x.data));
  }

  const mx = (byType.get('MX') ?? [])
    .filter((x) => x.type === TYPE_CODES.MX)
    .map((x) => {
      const [priority, ...rest] = x.data.split(' ');
      return { exchange: clean(rest.join(' ')), priority: Number(priority) || 0 };
    })
    .sort((x, y) => x.priority - y.priority);

  const txt = (byType.get('TXT') ?? [])
    .filter((x) => x.type === TYPE_CODES.TXT)
    .map((x) => x.data.replace(/^"|"$/g, '').replace(/"\s+"/g, ''));

  const soaRaw = (byType.get('SOA') ?? []).find((x) => x.type === TYPE_CODES.SOA)?.data;

  return {
    A: a,
    AAAA: aaaa,
    CNAME: cname,
    MX: mx,
    TXT: txt,
    NS: dataOf('NS'),
    SOA: soaRaw ? clean(soaRaw.split(' ').slice(0, 2).join(' ')) : undefined,
    CAA: dataOf('CAA'),
  };
}
