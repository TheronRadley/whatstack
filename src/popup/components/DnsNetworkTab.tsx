/**
 * Tab 3 — Raw DNS & Network Footprint: DNS record tables, IP geolocation,
 * SSL/TLS certificate and the full raw response-header dump.
 */

import { CalendarClock, Globe2, ListTree, Lock, MapPin, Network } from 'lucide-react';
import type { AnalysisReport } from '../../shared/types';
import { Badge, Card, CopyButton, EmptyNote, KeyVal, NotDetected } from './ui';
import { flagEmoji } from '../../lib/report';

function DnsSection({ label, values, mono = true }: { label: string; values: string[]; mono?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Badge tone={values.length ? 'violet' : 'neutral'}>{label}</Badge>
        <span className="text-[10px] text-zinc-600">{values.length} record{values.length === 1 ? '' : 's'}</span>
        {values.length > 0 && <span className="ml-auto"><CopyButton text={values.join('\n')} label="Copy" /></span>}
      </div>
      {values.length === 0 ? (
        <div className="pl-1"><NotDetected label="No records" /></div>
      ) : (
        <div className="space-y-0.5 rounded-lg border border-line/70 bg-void px-2.5 py-2">
          {values.map((v) => (
            <div key={v} className={`break-all text-zinc-300 ${mono ? 'font-mono text-[10.5px]' : 'text-[11px]'}`}>{v}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function DnsNetworkTab({ report, wide }: { report: AnalysisReport; wide: boolean }) {
  const { network, headersInfo } = report;
  const dns = network.dns;
  const geo = network.geo;
  const cert = network.cert;
  const headerEntries = Object.entries(headersInfo.headers).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={`grid gap-3 ${wide ? 'lg:grid-cols-2' : ''}`}>
      <Card title="IP Address & Geolocation" icon={<MapPin className="h-4 w-4" />}>
        {network.primaryIp ? (
          <div className="divide-y divide-line/50">
            <KeyVal k="Primary IP" v={network.primaryIp} mono />
            <KeyVal
              k="Location"
              v={geo ? `${flagEmoji(geo.countryCode)} ${[geo.city, geo.region, geo.country].filter(Boolean).join(', ')}` : undefined}
            />
            <KeyVal k="ISP / Org" v={geo?.isp ?? geo?.org} />
            <KeyVal k="ASN" v={geo?.asn} mono />
            <KeyVal k="Timezone" v={geo?.timezone} />
            <KeyVal
              k="Coordinates"
              v={geo?.latitude !== undefined && geo?.longitude !== undefined
                ? `${geo.latitude.toFixed(2)}, ${geo.longitude.toFixed(2)}`
                : undefined}
              mono
            />
            <KeyVal k="IPv4 (A)" v={dns.A.length ? dns.A.join(', ') : undefined} mono />
            <KeyVal k="IPv6 (AAAA)" v={dns.AAAA.length ? dns.AAAA.join(', ') : undefined} mono />
          </div>
        ) : (
          <EmptyNote>DNS returned no A/AAAA records for this host, so geolocation is unavailable.</EmptyNote>
        )}
      </Card>

      <Card
        title="SSL / TLS Certificate"
        icon={<Lock className="h-4 w-4" />}
        right={cert ? <Badge tone="neutral">via {cert.source} CT logs</Badge> : undefined}
      >
        {cert ? (
          <div className="divide-y divide-line/50">
            <KeyVal k="Issuer" v={cert.issuer} />
            <KeyVal k="Common name" v={cert.commonName} mono />
            <KeyVal k="Valid from" v={fmtDate(cert.notBefore)} />
            <KeyVal
              k="Expires"
              v={
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-zinc-500" />
                  {fmtDate(cert.notAfter)}
                  {cert.daysRemaining !== undefined && (
                    <Badge tone={cert.daysRemaining < 14 ? 'rose' : cert.daysRemaining < 45 ? 'amber' : 'mint'}>
                      {cert.daysRemaining}d remaining
                    </Badge>
                  )}
                </span>
              }
            />
            <KeyVal k="SANs" v={cert.san.length ? cert.san.slice(0, 4).join(', ') + (cert.san.length > 4 ? ` +${cert.san.length - 4}` : '') : undefined} mono />
            <KeyVal k="HTTPS" v={report.url.startsWith('https') ? 'Enabled' : 'Not in use'} />
          </div>
        ) : (
          <EmptyNote>
            {report.url.startsWith('https')
              ? 'No matching certificate was found in Certificate Transparency logs (crt.sh / Cert Spotter). The site may use a private CA or a very new cert.'
              : 'This page was served over plain HTTP — no TLS certificate in use.'}
          </EmptyNote>
        )}
      </Card>

      <Card
        title="Raw DNS Records"
        icon={<ListTree className="h-4 w-4" />}
        right={
          <CopyButton
            label="Copy all"
            text={[
              ...dns.A.map((v) => `A\t${v}`), ...dns.AAAA.map((v) => `AAAA\t${v}`),
              ...dns.CNAME.map((v) => `CNAME\t${v}`),
              ...dns.MX.map((m) => `MX\t${m.priority} ${m.exchange}`),
              ...dns.TXT.map((v) => `TXT\t${v}`), ...dns.NS.map((v) => `NS\t${v}`),
              ...(dns.SOA ? [`SOA\t${dns.SOA}`] : []), ...dns.CAA.map((v) => `CAA\t${v}`),
            ].join('\n')}
          />
        }
        className={wide ? 'lg:col-span-2' : ''}
      >
        <div className={`grid gap-3 ${wide ? 'md:grid-cols-2' : ''}`}>
          <DnsSection label="A" values={dns.A} />
          <DnsSection label="AAAA" values={dns.AAAA} />
          <DnsSection label="CNAME" values={dns.CNAME} />
          <DnsSection label="MX" values={dns.MX.map((m) => `${m.priority} · ${m.exchange}`)} />
          <DnsSection label="NS" values={dns.NS} />
          <DnsSection label="SOA" values={dns.SOA ? [dns.SOA] : []} />
          <DnsSection label="CAA" values={dns.CAA} />
          <DnsSection label="TXT" values={dns.TXT} />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-zinc-600">
          <Globe2 className="h-3 w-3" />
          Resolved live via DNS-over-HTTPS (Google Public DNS, Cloudflare fallback).
        </p>
      </Card>

      <Card
        title={`Raw Response Headers (${headerEntries.length})`}
        icon={<Network className="h-4 w-4" />}
        right={
          headerEntries.length > 0
            ? <CopyButton label="Copy headers" text={headerEntries.map(([k, v]) => `${k}: ${v}`).join('\n')} />
            : undefined
        }
        className={wide ? 'lg:col-span-2' : ''}
      >
        {headerEntries.length === 0 ? (
          <NotDetected label="No headers captured (reload the tab and re-scan)" />
        ) : (
          <div className="ws-scroll max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-line/70 bg-void px-2.5 py-2 pr-1">
            {headersInfo.status && (
              <div className="font-mono text-[10.5px] font-semibold text-neon-mint">
                {headersInfo.httpVersion ?? 'HTTP'} {headersInfo.status}
              </div>
            )}
            {headerEntries.map(([k, v]) => (
              <div key={k} className="break-all font-mono text-[10.5px] leading-relaxed">
                <span className="text-neon-cyan">{k}</span>
                <span className="text-zinc-600">: </span>
                <span className="text-zinc-300">{v}</span>
              </div>
            ))}
          </div>
        )}
        {network.errors.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {network.errors.map((e) => (
              <li key={e} className="text-[11px] text-neon-amber">⚠ {e}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
