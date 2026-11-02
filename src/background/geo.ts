/**
 * IP geolocation + SSL certificate intelligence.
 *
 * Geo: ipwho.is (no key required) with an ip-api.com HTTPS-pro endpoint
 * shape fallback via ipapi.co. Certs: browsers expose no certificate API to
 * extensions, so WhatStack reads Certificate Transparency logs (crt.sh,
 * Cert Spotter fallback) and surfaces the freshest matching certificate.
 */

import type { CertInfo, GeoInfo } from '../shared/types';
import { fetchWithTimeout } from './dns';
import { registrableDomain } from '../shared/url';

export async function lookupGeo(ip: string): Promise<GeoInfo | undefined> {
  // Primary: ipwho.is
  try {
    const res = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(ip)}`, {}, 7000);
    if (res.ok) {
      const j: any = await res.json();
      if (j?.success !== false) {
        return {
          ip,
          country: j.country,
          countryCode: j.country_code,
          region: j.region,
          city: j.city,
          isp: j.connection?.isp,
          org: j.connection?.org,
          asn: j.connection?.asn ? `AS${j.connection.asn}` : undefined,
          timezone: j.timezone?.id,
          latitude: typeof j.latitude === 'number' ? j.latitude : undefined,
          longitude: typeof j.longitude === 'number' ? j.longitude : undefined,
        };
      }
    }
  } catch { /* fall through to fallback */ }

  // Fallback: ipapi.co
  try {
    const res = await fetchWithTimeout(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {}, 7000);
    if (res.ok) {
      const j: any = await res.json();
      if (!j?.error) {
        return {
          ip,
          country: j.country_name,
          countryCode: j.country_code,
          region: j.region,
          city: j.city,
          isp: j.org,
          org: j.org,
          asn: j.asn,
          timezone: j.timezone,
          latitude: typeof j.latitude === 'number' ? j.latitude : undefined,
          longitude: typeof j.longitude === 'number' ? j.longitude : undefined,
        };
      }
    }
  } catch { /* both providers unreachable */ }
  return undefined;
}

function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

interface CrtShRow {
  issuer_name: string;
  common_name: string;
  name_value: string;
  not_before: string;
  not_after: string;
  serial_number: string;
}

function parseIssuer(issuerName: string): string {
  // "C=US, O=Let's Encrypt, CN=R3" -> "Let's Encrypt (R3)"
  const o = issuerName.match(/(?:^|,\s*)O=([^,]+)/)?.[1];
  const cn = issuerName.match(/(?:^|,\s*)CN=([^,]+)/)?.[1];
  if (o && cn && o !== cn) return `${o} (${cn})`;
  return o || cn || issuerName;
}

export async function lookupCert(hostname: string): Promise<CertInfo | undefined> {
  const domain = registrableDomain(hostname);
  // Primary: crt.sh certificate transparency search.
  try {
    const res = await fetchWithTimeout(
      `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&deduplicate=Y`,
      { headers: { accept: 'application/json' } },
      12000,
    );
    if (res.ok) {
      const rows = (await res.json()) as CrtShRow[];
      const now = Date.now();
      const matching = rows
        .filter((r) => {
          const names = (r.name_value || '').split('\n').map((s) => s.trim().toLowerCase());
          return names.some(
            (n) => n === hostname || n === domain || (n.startsWith('*.') && hostname.endsWith(n.slice(1))),
          );
        })
        .sort((a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime());
      const best = matching.find((r) => new Date(r.not_after).getTime() > now) ?? matching[0];
      if (best) {
        return {
          issuer: parseIssuer(best.issuer_name),
          subject: best.common_name,
          commonName: best.common_name,
          san: [...new Set((best.name_value || '').split('\n').map((s) => s.trim()).filter(Boolean))].slice(0, 12),
          notBefore: best.not_before,
          notAfter: best.not_after,
          daysRemaining: daysUntil(best.not_after),
          serialNumber: best.serial_number,
          source: 'crt.sh',
        };
      }
    }
  } catch { /* fall through */ }

  // Fallback: Cert Spotter issuances API.
  try {
    const res = await fetchWithTimeout(
      `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=false&expand=dns_names&expand=issuer`,
      { headers: { accept: 'application/json' } },
      12000,
    );
    if (res.ok) {
      const rows: any[] = await res.json();
      const sorted = rows.sort(
        (a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime(),
      );
      const best = sorted[0];
      if (best) {
        return {
          issuer: best.issuer?.name ? parseIssuer(best.issuer.name) : undefined,
          subject: best.dns_names?.[0],
          commonName: best.dns_names?.[0],
          san: (best.dns_names ?? []).slice(0, 12),
          notBefore: best.not_before,
          notAfter: best.not_after,
          daysRemaining: daysUntil(best.not_after),
          source: 'certspotter',
        };
      }
    }
  } catch { /* CT logs unreachable */ }
  return undefined;
}
