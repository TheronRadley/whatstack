/**
 * WhatStack MAIN-world probe (injected.js).
 *
 * Content scripts run in an ISOLATED world and cannot see the page's own
 * JavaScript globals. This script is injected into the page's MAIN world by
 * content.js, snapshots well-known runtime indicators (React, Vue, Angular,
 * jQuery, analytics pixels, ...) and posts them back via window.postMessage.
 *
 * It is read-only, defensive (every probe is wrapped in try/catch because
 * hostile or exotic pages can define throwing getters), and idempotent.
 */

import { POST } from '../shared/messages';
import type { GlobalHit } from '../shared/types';

type AnyWindow = Window & Record<string, any>;

const w = window as AnyWindow;

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

function hit(present: unknown, version?: unknown, detail?: unknown): GlobalHit | undefined {
  if (!present) return undefined;
  const out: GlobalHit = { present: true };
  if (typeof version === 'string' && version) out.version = version.slice(0, 64);
  if (typeof detail === 'string' && detail) out.detail = detail.slice(0, 160);
  return out;
}

function collectGlobals(): Record<string, GlobalHit> {
  const g: Record<string, GlobalHit> = {};
  const put = (key: string, value: GlobalHit | undefined) => {
    if (value) g[key] = value;
  };

  // --- React / Next.js / Gatsby / Remix -----------------------------------
  put('react', safe(() => hit(w.React, w.React?.version)));
  put(
    'react-dom',
    safe(() =>
      hit(w.ReactDOM || document.querySelector('[data-reactroot]'), w.ReactDOM?.version),
    ),
  );
  put(
    'react-devtools-hook',
    safe(() => {
      const hook = w.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook?.renderers) return undefined;
      const renderers = [...(hook.renderers.values?.() ?? [])] as any[];
      const version = renderers.find((r) => r?.version)?.version;
      return hit(renderers.length > 0, version, renderers.length ? 'React renderer attached' : undefined);
    }),
  );
  put(
    'nextjs',
    safe(() =>
      hit(
        w.__NEXT_DATA__ || w.__next_f || document.getElementById('__next'),
        w.__NEXT_DATA__?.buildId ? undefined : undefined,
        w.__next_f ? '__next_f (App Router / RSC)' : w.__NEXT_DATA__ ? '__NEXT_DATA__ (Pages Router)' : '#__next root',
      ),
    ),
  );
  put('next-router', safe(() => hit(w.next?.router)));
  put('gatsby', safe(() => hit(w.___gatsby || document.getElementById('___gatsby'))));
  put('remix', safe(() => hit(w.__remixContext || w.__remixManifest)));
  put('preact', safe(() => hit(w.preact, (w.preact as any)?.version)));

  // --- Vue / Nuxt ----------------------------------------------------------
  put('Vue', safe(() => hit(w.Vue, w.Vue?.version)));
  put(
    'vue-devtools-hook',
    safe(() => {
      const hook = w.__VUE_DEVTOOLS_GLOBAL_HOOK__;
      const apps: any[] = hook?.apps ?? [];
      const version = apps[0]?.version;
      return hit(w.__VUE__ || apps.length > 0, version, apps.length ? `${apps.length} Vue app(s)` : undefined);
    }),
  );
  put('nuxt', safe(() => hit(w.__NUXT__ || w.$nuxt || document.getElementById('__nuxt'))));

  // --- Angular -------------------------------------------------------------
  put(
    'angular',
    safe(() => {
      const el = document.querySelector('[ng-version]');
      const version = el?.getAttribute('ng-version') ?? undefined;
      return hit(w.ng || el || typeof w.getAllAngularRootElements === 'function', version ?? undefined);
    }),
  );
  put('angularjs', safe(() => hit(w.angular, w.angular?.version?.full)));

  // --- Svelte / Ember / Backbone / Alpine / HTMX / Lit ---------------------
  put('svelte', safe(() => hit(document.querySelector('[class*="svelte-"]') || w.__svelte)));
  put('ember', safe(() => hit(w.Ember, w.Ember?.VERSION)));
  put('backbone', safe(() => hit(w.Backbone, w.Backbone?.VERSION)));
  put('alpine', safe(() => hit(w.Alpine, w.Alpine?.version)));
  put('htmx', safe(() => hit(w.htmx, w.htmx?.version)));
  put('lit', safe(() => hit((w as any).litHtmlVersions?.length || (w as any).litElementVersions?.length)));
  put('polymer', safe(() => hit(w.Polymer)));
  put('astro', safe(() => hit(document.querySelector('astro-island, [data-astro-cid]'))));
  put('jquery', safe(() => hit(w.jQuery || w.$, (w.jQuery || w.$)?.fn?.jquery)));
  put('lodash', safe(() => hit(w._, w._?.VERSION)));
  put('underscore', safe(() => hit(w._ && !w._?.VERSION ? w._ : undefined)));
  put('moment', safe(() => hit(w.moment, w.moment?.version)));
  put('threejs', safe(() => hit(w.THREE, w.THREE?.REVISION ? `r${w.THREE.REVISION}` : undefined)));
  put('d3', safe(() => hit(w.d3, w.d3?.version)));
  put('gsap', safe(() => hit(w.gsap, w.gsap?.version)));
  put('turbo', safe(() => hit(w.Turbo)));
  put('stimulus', safe(() => hit(w.Stimulus)));
  put('livewire', safe(() => hit(w.Livewire)));
  put('inertia', safe(() => hit(document.querySelector('[data-page]') && w.__inertia)));

  // --- CMS / commerce runtimes ---------------------------------------------
  put('wordpress', safe(() => hit(w.wp || w.wpApiSettings, undefined, w.wp ? 'window.wp present' : undefined)));
  put('woocommerce', safe(() => hit(w.woocommerce_params || w.wc_add_to_cart_params)));
  put('shopify', safe(() => hit(w.Shopify, undefined, w.Shopify?.theme?.name ? `Theme: ${w.Shopify.theme.name}` : w.Shopify?.shop)));
  put('webflow', safe(() => hit(w.Webflow)));
  put('wix', safe(() => hit(w.wixBiSession || document.querySelector('meta[name="wix-dynamic-custom-elements"]'))));
  put('squarespace', safe(() => hit(w.Squarespace || w.Static?.SQUARESPACE_CONTEXT)));
  put('ghost', safe(() => hit(document.querySelector('meta[name="generator"][content^="Ghost"]'))));
  put('drupal', safe(() => hit(w.Drupal, undefined, 'window.Drupal present')));
  put('joomla', safe(() => hit(w.Joomla)));
  put('magento', safe(() => hit(w.Mage || document.querySelector('script[type="text/x-magento-init"]'))));
  put('hubspot-cms', safe(() => hit(document.querySelector('meta[name="generator"][content*="HubSpot" i]'))));
  put('framer', safe(() => hit(document.querySelector('[data-framer-name], #main[data-framer-hydrate-v2]'))));

  // --- Analytics / marketing ------------------------------------------------
  put('gtag', safe(() => hit(typeof w.gtag === 'function' || w.google_tag_data, undefined, w.google_tag_data?.ics ? 'gtag.js runtime' : undefined)));
  put('google-analytics', safe(() => hit(w.ga || w.gaData || typeof w.gtag === 'function', undefined, w.gaData ? Object.keys(w.gaData)[0] : undefined)));
  put('gtm', safe(() => hit(w.google_tag_manager, undefined, w.google_tag_manager ? Object.keys(w.google_tag_manager).filter((k) => k.startsWith('GTM-'))[0] : undefined)));
  put('dataLayer', safe(() => hit(Array.isArray(w.dataLayer), undefined, Array.isArray(w.dataLayer) ? `dataLayer (${w.dataLayer.length} events)` : undefined)));
  put('meta-pixel', safe(() => hit(typeof w.fbq === 'function', w.fbq?.version, w._fbq ? 'fbq loaded' : undefined)));
  put('tiktok-pixel', safe(() => hit(w.ttq)));
  put('twitter-pixel', safe(() => hit(w.twq)));
  put('linkedin-insight', safe(() => hit(w._linkedin_partner_id || w.lintrk)));
  put('snap-pixel', safe(() => hit(w.snaptr)));
  put('pinterest-tag', safe(() => hit(w.pintrk)));
  put('hotjar', safe(() => hit(w.hj || w._hjSettings, undefined, w._hjSettings?.hjid ? `Site ID ${w._hjSettings.hjid}` : undefined)));
  put('mixpanel', safe(() => hit(w.mixpanel)));
  put('segment', safe(() => hit(w.analytics && typeof w.analytics.track === 'function')));
  put('posthog', safe(() => hit(w.posthog, w.posthog?.version)));
  put('plausible', safe(() => hit(typeof w.plausible === 'function')));
  put('matomo', safe(() => hit(w._paq || w.Matomo || w.Piwik)));
  put('clarity', safe(() => hit(typeof w.clarity === 'function')));
  put('fullstory', safe(() => hit(w.FS || w._fs_namespace)));
  put('amplitude', safe(() => hit(w.amplitude)));
  put('heap', safe(() => hit(w.heap)));
  put('hubspot', safe(() => hit(w._hsq)));
  put('intercom', safe(() => hit(w.Intercom || w.intercomSettings)));
  put('crisp', safe(() => hit(w.$crisp)));
  put('zendesk', safe(() => hit(w.zE || w.zdassets)));
  put('drift', safe(() => hit(w.drift || w.driftt)));
  put('tawk', safe(() => hit(w.Tawk_API)));
  put('optimizely', safe(() => hit(w.optimizely)));
  put('vwo', safe(() => hit(w._vwo_code || w.VWO)));
  put('onetrust', safe(() => hit(w.OneTrust || w.Optanon)));
  put('cookiebot', safe(() => hit(w.Cookiebot)));
  put('recaptcha', safe(() => hit(w.grecaptcha || document.querySelector('.g-recaptcha, [data-sitekey]'))));
  put('hcaptcha', safe(() => hit(w.hcaptcha)));
  put('turnstile', safe(() => hit(w.turnstile)));

  // --- Payments / misc -------------------------------------------------------
  put('stripe', safe(() => hit(typeof w.Stripe === 'function')));
  put('paypal', safe(() => hit(w.paypal)));
  put('paddle', safe(() => hit(w.Paddle)));
  put('cloudflare-js', safe(() => hit((w as any).__CF$cv$params || document.querySelector('script[src*="cloudflareinsights"], script[src*="/cdn-cgi/"]'))));
  put('sentry', safe(() => hit(w.Sentry || (w as any).__SENTRY__)));
  put('datadog', safe(() => hit(w.DD_RUM)));
  put('newrelic', safe(() => hit(w.newrelic)));
  put('service-worker-reg', safe(() => hit('serviceWorker' in navigator && !!navigator.serviceWorker?.controller, undefined, navigator.serviceWorker?.controller?.scriptURL)));
  put('webpack', safe(() => hit(w.webpackChunk || Object.keys(w).some((k) => k.startsWith('webpackChunk')), undefined, 'webpackChunk runtime')));
  put('vite-client', safe(() => hit(document.querySelector('script[src*="/@vite/client"]'), undefined, 'Vite dev/HMR client')));
  put('turbopack', safe(() => hit((w as any).TURBOPACK || document.querySelector('script[src*="turbopack"]'))));
  put('wasm', safe(() => hit(typeof WebAssembly === 'object' && performance.getEntriesByType('resource').some((r: any) => r.name?.endsWith('.wasm')), undefined, 'WebAssembly module loaded')));

  return g;
}

function respond(requestId?: string) {
  const payload = collectGlobals();
  window.postMessage({ source: POST.GLOBALS, requestId, payload }, window.location.origin);
}

// Respond on request from the content script…
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as { source?: string; requestId?: string } | null;
  if (data?.source === POST.REQUEST) respond(data.requestId);
});

// …and announce once on injection so scans that race the listener still work.
respond();
