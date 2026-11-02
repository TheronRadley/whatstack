/**
 * WhatStack technology fingerprint rules (Wappalyzer-style, hand-curated).
 * Each rule lists the live signals that prove a technology is in use.
 * The evaluator lives in detect.ts; keep rules purely declarative.
 */

import type { TechCategory } from '../shared/types';

export interface HeaderMatcher {
  name: string;
  pattern?: RegExp;
  /** Capture group 1 of `pattern` becomes the detected version. */
  versionGroup?: boolean;
}

export interface TechRule {
  id: string;
  name: string;
  category: TechCategory;
  icon: string;
  website?: string;
  /** MAIN-world global probe ids (see injected.ts). */
  globals?: string[];
  scripts?: RegExp[];
  stylesheets?: RegExp[];
  domHints?: string[];
  classHints?: string[];
  inlineHints?: string[];
  iframes?: RegExp[];
  /** Tested against the <meta name="generator"> content; group 1 = version. */
  generator?: RegExp;
  headers?: HeaderMatcher[];
  /** Cookie names (JS-visible or Set-Cookie) that betray the stack. */
  cookies?: RegExp[];
  /** Detecting this tech implies these rule ids are also present. */
  implies?: string[];
}

export const TECH_RULES: TechRule[] = [
  // ---------------------------------------------------------------- CMS
  {
    id: 'wordpress', name: 'WordPress', category: 'cms', icon: 'layout-template',
    website: 'https://wordpress.org',
    globals: ['wordpress'], domHints: ['wp-content', 'wp-includes'], inlineHints: ['wordpress'],
    generator: /WordPress\s*([\d.]+)?/i,
    headers: [{ name: 'x-powered-by', pattern: /wordpress/i }, { name: 'link', pattern: /wp-json/i }],
    scripts: [/\/wp-includes\//, /\/wp-content\//],
    implies: ['php'],
  },
  {
    id: 'woocommerce', name: 'WooCommerce', category: 'ecommerce', icon: 'shopping-cart',
    website: 'https://woocommerce.com',
    globals: ['woocommerce'], generator: /WooCommerce\s*([\d.]+)?/i,
    scripts: [/woocommerce/i], implies: ['wordpress'],
  },
  {
    id: 'shopify', name: 'Shopify', category: 'ecommerce', icon: 'shopping-bag',
    website: 'https://www.shopify.com',
    globals: ['shopify'], domHints: ['shopify-cdn'], inlineHints: ['shopify'],
    scripts: [/cdn\.shopify\.com/], headers: [{ name: 'x-shopid' }, { name: 'x-shopify-stage' }, { name: 'powered-by', pattern: /shopify/i }],
  },
  {
    id: 'webflow', name: 'Webflow', category: 'cms', icon: 'pen-tool',
    website: 'https://webflow.com',
    globals: ['webflow'], domHints: ['[data-wf-page]'], inlineHints: ['webflow'],
    scripts: [/webflow\.js/, /d3e54v103j8qbb\.cloudfront\.net/],
  },
  {
    id: 'wix', name: 'Wix', category: 'cms', icon: 'pen-tool', website: 'https://www.wix.com',
    globals: ['wix'], inlineHints: ['wix'], scripts: [/wixstatic\.com/, /static\.parastorage\.com/],
    headers: [{ name: 'x-wix-request-id' }],
  },
  {
    id: 'squarespace', name: 'Squarespace', category: 'cms', icon: 'square',
    website: 'https://www.squarespace.com',
    globals: ['squarespace'], inlineHints: ['squarespace'],
    scripts: [/squarespace\.com/, /sqsp\.net/], generator: /Squarespace/i,
  },
  {
    id: 'ghost', name: 'Ghost', category: 'cms', icon: 'ghost', website: 'https://ghost.org',
    globals: ['ghost'], generator: /Ghost\s*([\d.]+)?/i, scripts: [/\/ghost\//, /ghost\.io/],
  },
  {
    id: 'drupal', name: 'Drupal', category: 'cms', icon: 'droplets', website: 'https://www.drupal.org',
    globals: ['drupal'], generator: /Drupal\s*([\d.]+)?/i,
    headers: [{ name: 'x-drupal-cache' }, { name: 'x-generator', pattern: /drupal/i }],
    scripts: [/\/core\/assets\/|drupal\.js/], implies: ['php'],
  },
  {
    id: 'joomla', name: 'Joomla', category: 'cms', icon: 'layout-template', website: 'https://www.joomla.org',
    globals: ['joomla'], generator: /Joomla!?\s*([\d.]+)?/i, scripts: [/\/media\/jui\/|joomla/i], implies: ['php'],
  },
  {
    id: 'magento', name: 'Magento / Adobe Commerce', category: 'ecommerce', icon: 'shopping-cart',
    website: 'https://magento.com',
    globals: ['magento'], scripts: [/mage\//, /magento/i, /Magento_[A-Za-z]+/],
    cookies: [/^mage-cache/, /^form_key$/],
    headers: [{ name: 'x-magento-cache-debug' }], implies: ['php'],
  },
  {
    id: 'prestashop', name: 'PrestaShop', category: 'ecommerce', icon: 'shopping-cart',
    generator: /PrestaShop/i, scripts: [/prestashop/i], implies: ['php'],
  },
  {
    id: 'hubspot-cms', name: 'HubSpot CMS', category: 'cms', icon: 'hub',
    globals: ['hubspot-cms'], generator: /HubSpot/i, scripts: [/hs-scripts\.com/, /hubspotonweb/i],
  },
  {
    id: 'framer', name: 'Framer', category: 'cms', icon: 'frame', website: 'https://www.framer.com',
    globals: ['framer'], domHints: ['[data-framer]'], generator: /Framer/i,
    scripts: [/framerusercontent\.com/, /framer\.com/],
  },
  {
    id: 'contentful', name: 'Contentful', category: 'cms', icon: 'database',
    scripts: [/images\.ctfassets\.net/, /cdn\.contentful\.com/],
  },
  {
    id: 'sanity', name: 'Sanity', category: 'cms', icon: 'database',
    scripts: [/cdn\.sanity\.io/],
  },
  {
    id: 'strapi', name: 'Strapi', category: 'cms', icon: 'database',
    headers: [{ name: 'x-powered-by', pattern: /strapi/i }],
  },

  // ------------------------------------------------------- JS frameworks
  {
    id: 'react', name: 'React', category: 'framework', icon: 'atom', website: 'https://react.dev',
    globals: ['react', 'react-dom', 'react-devtools-hook'],
    domHints: ['[data-reactroot]'],
    scripts: [/react(?:-dom)?(?:\.production)?(?:\.min)?\.js/, /react@[\d.]+/],
  },
  {
    id: 'nextjs', name: 'Next.js', category: 'framework', icon: 'triangle', website: 'https://nextjs.org',
    globals: ['nextjs', 'next-router'], domHints: ['#__next'], inlineHints: ['nextjs'],
    scripts: [/\/_next\/static\//], headers: [{ name: 'x-powered-by', pattern: /Next\.js/i }],
    implies: ['react'],
  },
  {
    id: 'Vue', name: 'Vue.js', category: 'framework', icon: 'layers', website: 'https://vuejs.org',
    globals: ['Vue', 'vue-devtools-hook'], domHints: ['[data-v-app]', 'vue-scoped'],
    scripts: [/vue(?:\.runtime)?(?:\.global)?(?:\.prod)?(?:\.min)?\.js/, /vue@[\d.]+/],
  },
  {
    id: 'nuxt', name: 'Nuxt', category: 'framework', icon: 'mountain', website: 'https://nuxt.com',
    globals: ['nuxt'], domHints: ['#__nuxt'], inlineHints: ['nuxt'],
    scripts: [/\/_nuxt\//], implies: ['Vue'],
  },
  {
    id: 'angular', name: 'Angular', category: 'framework', icon: 'shield', website: 'https://angular.dev',
    globals: ['angular'], domHints: ['[ng-version]'],
    scripts: [/main\.[\da-f]+\.js/, /polyfills\.[\da-f]+\.js/, /angular\.io/],
  },
  {
    id: 'angularjs', name: 'AngularJS (1.x)', category: 'framework', icon: 'shield',
    globals: ['angularjs'], scripts: [/angular(?:\.min)?\.js/],
  },
  {
    id: 'svelte', name: 'Svelte / SvelteKit', category: 'framework', icon: 'flame', website: 'https://svelte.dev',
    globals: ['svelte'], scripts: [/\/_app\/immutable\//],
  },
  {
    id: 'ember', name: 'Ember.js', category: 'framework', icon: 'flame-kindling',
    globals: ['ember'], scripts: [/ember(?:\.min)?\.js/],
  },
  {
    id: 'backbone', name: 'Backbone.js', category: 'library', icon: 'bone',
    globals: ['backbone'], scripts: [/backbone(?:\.min)?\.js/],
  },
  {
    id: 'preact', name: 'Preact', category: 'framework', icon: 'atom',
    globals: ['preact'], scripts: [/preact(?:\.min)?\.js/],
  },
  {
    id: 'alpine', name: 'Alpine.js', category: 'framework', icon: 'mountain-snow',
    globals: ['alpine'], domHints: ['x-data'], scripts: [/alpinejs|alpine(?:\.min)?\.js/],
  },
  {
    id: 'htmx', name: 'htmx', category: 'library', icon: 'zap', website: 'https://htmx.org',
    globals: ['htmx'], domHints: ['hx-attr'], scripts: [/htmx(?:\.min)?\.js/],
  },
  {
    id: 'astro', name: 'Astro', category: 'framework', icon: 'rocket', website: 'https://astro.build',
    globals: ['astro'], domHints: ['astro-island', '[data-astro-cid]'], generator: /Astro\s*v?([\d.]+)?/i,
  },
  {
    id: 'gatsby', name: 'Gatsby', category: 'framework', icon: 'circle-dot',
    globals: ['gatsby'], inlineHints: ['gatsby'], scripts: [/webpack-runtime-.*\.js/, /gatsby/],
    implies: ['react'],
  },
  {
    id: 'remix', name: 'Remix / React Router', category: 'framework', icon: 'route',
    globals: ['remix'], inlineHints: ['remix'], implies: ['react'],
  },
  {
    id: 'jquery', name: 'jQuery', category: 'library', icon: 'code-2', website: 'https://jquery.com',
    globals: ['jquery'], scripts: [/jquery(?:-|\.)?([\d.]+)?(?:\.min)?\.js/],
  },
  {
    id: 'lodash', name: 'Lodash', category: 'library', icon: 'code-2',
    globals: ['lodash'], scripts: [/lodash(?:\.min)?\.js/],
  },
  {
    id: 'threejs', name: 'Three.js', category: 'library', icon: 'box', website: 'https://threejs.org',
    globals: ['threejs'], scripts: [/three(?:\.min)?\.js/],
  },
  {
    id: 'd3', name: 'D3.js', category: 'library', icon: 'bar-chart-3',
    globals: ['d3'], scripts: [/d3(?:\.v\d)?(?:\.min)?\.js/],
  },
  {
    id: 'gsap', name: 'GSAP', category: 'library', icon: 'sparkles',
    globals: ['gsap'], scripts: [/gsap(?:\.min)?\.js/, /ScrollTrigger/],
  },
  {
    id: 'lit', name: 'Lit', category: 'library', icon: 'component',
    globals: ['lit'],
  },
  {
    id: 'turbo', name: 'Hotwire Turbo', category: 'framework', icon: 'gauge',
    globals: ['turbo'], domHints: ['[data-turbo]'],
  },
  {
    id: 'livewire', name: 'Laravel Livewire', category: 'framework', icon: 'zap',
    globals: ['livewire'], domHints: ['livewire-attr'], scripts: [/livewire/], implies: ['php'],
  },

  // ------------------------------------------------------------ CSS / UI
  {
    id: 'tailwind', name: 'Tailwind CSS', category: 'css', icon: 'wind', website: 'https://tailwindcss.com',
    classHints: ['tailwind-classes'], scripts: [/cdn\.tailwindcss\.com/],
    stylesheets: [/tailwind/i],
  },
  {
    id: 'bootstrap', name: 'Bootstrap', category: 'css', icon: 'layout-grid', website: 'https://getbootstrap.com',
    classHints: ['bootstrap-classes'],
    scripts: [/bootstrap(?:\.bundle)?(?:\.min)?\.js/], stylesheets: [/bootstrap(?:\.min)?\.css/],
  },
  {
    id: 'mui', name: 'Material UI', category: 'css', icon: 'component',
    domHints: ['mui'], implies: ['react'],
  },
  {
    id: 'chakra', name: 'Chakra UI', category: 'css', icon: 'component',
    domHints: ['chakra'], implies: ['react'],
  },
  {
    id: 'radix', name: 'Radix UI / shadcn', category: 'css', icon: 'component',
    domHints: ['radix'], implies: ['react'],
  },
  {
    id: 'styled-components', name: 'styled-components', category: 'css', icon: 'paintbrush',
    classHints: ['styled-components'], implies: ['react'],
  },
  {
    id: 'emotion', name: 'Emotion', category: 'css', icon: 'paintbrush',
    classHints: ['emotion'],
  },
  {
    id: 'bulma', name: 'Bulma', category: 'css', icon: 'layout-grid',
    stylesheets: [/bulma(?:\.min)?\.css/],
  },
  {
    id: 'foundation', name: 'Foundation', category: 'css', icon: 'layout-grid',
    scripts: [/foundation(?:\.min)?\.js/], stylesheets: [/foundation(?:\.min)?\.css/],
  },
  {
    id: 'font-awesome', name: 'Font Awesome', category: 'font', icon: 'type',
    domHints: ['font-awesome'], scripts: [/kit\.fontawesome\.com/], stylesheets: [/font-?awesome/i],
  },

  // --------------------------------------------------- Analytics / pixels
  {
    id: 'ga4', name: 'Google Analytics 4', category: 'analytics', icon: 'line-chart',
    globals: ['gtag'], inlineHints: ['ga4'],
    scripts: [/googletagmanager\.com\/gtag\/js/],
  },
  {
    id: 'google-analytics', name: 'Google Analytics (Universal)', category: 'analytics', icon: 'line-chart',
    globals: ['google-analytics'], inlineHints: ['ua-analytics'],
    scripts: [/google-analytics\.com\/analytics\.js/],
  },
  {
    id: 'gtm', name: 'Google Tag Manager', category: 'marketing', icon: 'tags',
    globals: ['gtm'], inlineHints: ['gtm'], scripts: [/googletagmanager\.com\/gtm\.js/],
  },
  {
    id: 'meta-pixel', name: 'Meta Pixel', category: 'marketing', icon: 'target',
    globals: ['meta-pixel'], inlineHints: ['fbq'], scripts: [/connect\.facebook\.net/],
  },
  {
    id: 'tiktok-pixel', name: 'TikTok Pixel', category: 'marketing', icon: 'target',
    globals: ['tiktok-pixel'], inlineHints: ['tiktok'], scripts: [/analytics\.tiktok\.com/],
  },
  {
    id: 'twitter-pixel', name: 'X (Twitter) Pixel', category: 'marketing', icon: 'target',
    globals: ['twitter-pixel'], scripts: [/static\.ads-twitter\.com/],
  },
  {
    id: 'linkedin-insight', name: 'LinkedIn Insight Tag', category: 'marketing', icon: 'target',
    globals: ['linkedin-insight'], scripts: [/snap\.licdn\.com/],
  },
  {
    id: 'hotjar', name: 'Hotjar', category: 'analytics', icon: 'thermometer',
    globals: ['hotjar'], inlineHints: ['hotjar'], scripts: [/static\.hotjar\.com/],
  },
  {
    id: 'mixpanel', name: 'Mixpanel', category: 'analytics', icon: 'line-chart',
    globals: ['mixpanel'], scripts: [/cdn\.mxpnl\.com/, /mixpanel/],
  },
  {
    id: 'segment', name: 'Segment', category: 'analytics', icon: 'route',
    globals: ['segment'], inlineHints: ['segment'], scripts: [/cdn\.segment\.com/],
  },
  {
    id: 'posthog', name: 'PostHog', category: 'analytics', icon: 'hedgehog',
    globals: ['posthog'], inlineHints: ['posthog'], scripts: [/posthog/],
  },
  {
    id: 'plausible', name: 'Plausible Analytics', category: 'analytics', icon: 'line-chart',
    globals: ['plausible'], inlineHints: ['plausible'], scripts: [/plausible\.io\/js/],
  },
  {
    id: 'matomo', name: 'Matomo', category: 'analytics', icon: 'line-chart',
    globals: ['matomo'], scripts: [/matomo(?:\.js)?/, /piwik\.js/],
  },
  {
    id: 'clarity', name: 'Microsoft Clarity', category: 'analytics', icon: 'eye',
    globals: ['clarity'], inlineHints: ['clarity'], scripts: [/clarity\.ms/],
  },
  {
    id: 'fullstory', name: 'FullStory', category: 'analytics', icon: 'eye',
    globals: ['fullstory'], scripts: [/fullstory\.com/, /edge\.fullstory\.com/],
  },
  {
    id: 'amplitude', name: 'Amplitude', category: 'analytics', icon: 'activity',
    globals: ['amplitude'], scripts: [/cdn\.amplitude\.com/],
  },
  {
    id: 'hubspot', name: 'HubSpot Tracking', category: 'marketing', icon: 'hub',
    globals: ['hubspot'], inlineHints: ['hubspot'], scripts: [/js\.hs-scripts\.com/, /js\.hs-analytics\.net/],
  },
  {
    id: 'cloudflare-analytics', name: 'Cloudflare Web Analytics', category: 'analytics', icon: 'cloud',
    globals: ['cloudflare-js'], scripts: [/static\.cloudflareinsights\.com/],
  },
  {
    id: 'vercel-analytics', name: 'Vercel Analytics', category: 'analytics', icon: 'triangle',
    scripts: [/\/_vercel\/insights\//, /va\.vercel-scripts\.com/],
  },

  // --------------------------------------------------------- Widgets/chat
  {
    id: 'intercom', name: 'Intercom', category: 'widget', icon: 'message-circle',
    globals: ['intercom'], inlineHints: ['intercom'], scripts: [/widget\.intercom\.io/],
  },
  {
    id: 'crisp', name: 'Crisp Chat', category: 'widget', icon: 'message-circle',
    globals: ['crisp'], inlineHints: ['crisp'], scripts: [/client\.crisp\.chat/],
  },
  {
    id: 'zendesk', name: 'Zendesk Chat', category: 'widget', icon: 'message-circle',
    globals: ['zendesk'], scripts: [/static\.zdassets\.com/, /zendesk\.com/],
  },
  {
    id: 'drift', name: 'Drift', category: 'widget', icon: 'message-circle',
    globals: ['drift'], scripts: [/js\.driftt\.com/],
  },
  {
    id: 'tawk', name: 'Tawk.to', category: 'widget', icon: 'message-circle',
    globals: ['tawk'], scripts: [/embed\.tawk\.to/],
  },
  {
    id: 'onetrust', name: 'OneTrust', category: 'widget', icon: 'cookie',
    globals: ['onetrust'], scripts: [/cdn\.cookielaw\.org/, /optanon/],
  },
  {
    id: 'cookiebot', name: 'Cookiebot', category: 'widget', icon: 'cookie',
    globals: ['cookiebot'], scripts: [/consent\.cookiebot\.com/],
  },
  {
    id: 'youtube', name: 'YouTube Embed', category: 'video', icon: 'youtube',
    iframes: [/youtube(?:-nocookie)?\.com\/embed/],
  },
  {
    id: 'vimeo', name: 'Vimeo Embed', category: 'video', icon: 'video',
    iframes: [/player\.vimeo\.com/],
  },
  {
    id: 'google-maps', name: 'Google Maps', category: 'widget', icon: 'map-pin',
    scripts: [/maps\.googleapis\.com/, /maps\.google\.com/], iframes: [/google\.com\/maps/],
  },

  // ------------------------------------------------------------ Payments
  {
    id: 'stripe', name: 'Stripe', category: 'payment', icon: 'credit-card',
    globals: ['stripe'], inlineHints: ['stripe'], scripts: [/js\.stripe\.com/],
  },
  {
    id: 'paypal', name: 'PayPal', category: 'payment', icon: 'credit-card',
    globals: ['paypal'], scripts: [/paypal\.com\/sdk/],
  },
  {
    id: 'paddle', name: 'Paddle', category: 'payment', icon: 'credit-card',
    globals: ['paddle'], scripts: [/cdn\.paddle\.com/],
  },

  // ------------------------------------------------------------- Security
  {
    id: 'recaptcha', name: 'Google reCAPTCHA', category: 'security', icon: 'shield-check',
    globals: ['recaptcha'], domHints: ['g-recaptcha'], inlineHints: ['recaptcha'],
    scripts: [/google\.com\/recaptcha/, /gstatic\.com\/recaptcha/],
  },
  {
    id: 'hcaptcha', name: 'hCaptcha', category: 'security', icon: 'shield-check',
    globals: ['hcaptcha'], domHints: ['h-captcha'], scripts: [/js\.hcaptcha\.com/],
  },
  {
    id: 'turnstile', name: 'Cloudflare Turnstile', category: 'security', icon: 'shield-check',
    globals: ['turnstile'], domHints: ['cf-turnstile'], inlineHints: ['turnstile'],
    scripts: [/challenges\.cloudflare\.com/],
  },
  {
    id: 'sentry', name: 'Sentry', category: 'other', icon: 'bug',
    globals: ['sentry'], inlineHints: ['sentry'], scripts: [/browser\.sentry-cdn\.com/, /js\.sentry-cdn\.com/],
  },
  {
    id: 'datadog', name: 'Datadog RUM', category: 'other', icon: 'dog',
    globals: ['datadog'], scripts: [/datadoghq-browser-agent/],
  },

  // ---------------------------------------------- Hosting / CDN / servers
  {
    id: 'cloudflare', name: 'Cloudflare', category: 'cdn', icon: 'cloud', website: 'https://www.cloudflare.com',
    globals: ['cloudflare-js'],
    headers: [
      { name: 'cf-ray' }, { name: 'cf-cache-status' },
      { name: 'server', pattern: /^cloudflare$/i },
    ],
    scripts: [/cdn-cgi\/scripts/, /ajax.cloudflare\.com/],
  },
  {
    id: 'vercel', name: 'Vercel', category: 'hosting', icon: 'triangle', website: 'https://vercel.com',
    headers: [{ name: 'x-vercel-id' }, { name: 'x-vercel-cache' }, { name: 'server', pattern: /^Vercel$/i }],
    scripts: [/\/_vercel\//],
  },
  {
    id: 'netlify', name: 'Netlify', category: 'hosting', icon: 'globe', website: 'https://www.netlify.com',
    headers: [{ name: 'x-nf-request-id' }, { name: 'server', pattern: /netlify/i }],
  },
  {
    id: 'cloudfront', name: 'AWS CloudFront', category: 'cdn', icon: 'cloud',
    headers: [{ name: 'x-amz-cf-id' }, { name: 'x-amz-cf-pop' }, { name: 'via', pattern: /cloudfront/i }],
  },
  {
    id: 'aws', name: 'Amazon Web Services', category: 'hosting', icon: 'cloud',
    headers: [{ name: 'x-amz-request-id' }, { name: 'server', pattern: /amazon/i }],
    scripts: [/s3\.amazonaws\.com/, /\.s3\.[a-z0-9-]+\.amazonaws\.com/],
  },
  {
    id: 'fastly', name: 'Fastly', category: 'cdn', icon: 'fast-forward',
    headers: [{ name: 'x-served-by', pattern: /cache-/i }, { name: 'fastly-restarts' }, { name: 'via', pattern: /varnish/i }],
  },
  {
    id: 'akamai', name: 'Akamai', category: 'cdn', icon: 'cloud',
    headers: [{ name: 'x-akamai-transformed' }, { name: 'server', pattern: /akamai/i }, { name: 'x-check-cacheable' }],
  },
  {
    id: 'github-pages', name: 'GitHub Pages', category: 'hosting', icon: 'github',
    headers: [{ name: 'x-github-request-id' }, { name: 'server', pattern: /github\.com/i }],
  },
  {
    id: 'firebase', name: 'Firebase Hosting', category: 'hosting', icon: 'flame',
    scripts: [/\/__\/firebase\//, /gstatic\.com\/firebasejs/],
  },
  {
    id: 'azure', name: 'Microsoft Azure', category: 'hosting', icon: 'cloud',
    headers: [{ name: 'x-azure-ref' }, { name: 'x-ms-request-id' }],
  },
  {
    id: 'bunnycdn', name: 'Bunny CDN', category: 'cdn', icon: 'rabbit',
    headers: [{ name: 'cdn-pullzone' }, { name: 'cdn-uid' }, { name: 'server', pattern: /bunnycdn/i }],
  },
  {
    id: 'keycdn', name: 'KeyCDN', category: 'cdn', icon: 'key',
    headers: [{ name: 'x-cache', pattern: /keycdn/i }, { name: 'server', pattern: /keycdn/i }],
  },
  {
    id: 'nginx', name: 'Nginx', category: 'server', icon: 'server',
    headers: [{ name: 'server', pattern: /nginx(?:\/([\d.]+))?/i, versionGroup: true }],
  },
  {
    id: 'apache', name: 'Apache HTTP Server', category: 'server', icon: 'server',
    headers: [{ name: 'server', pattern: /Apache(?:\/([\d.]+))?/i, versionGroup: true }],
  },
  {
    id: 'litespeed', name: 'LiteSpeed', category: 'server', icon: 'server',
    headers: [{ name: 'server', pattern: /LiteSpeed/i }, { name: 'x-litespeed-cache' }],
  },
  {
    id: 'iis', name: 'Microsoft IIS', category: 'server', icon: 'server',
    headers: [{ name: 'server', pattern: /Microsoft-IIS(?:\/([\d.]+))?/i, versionGroup: true }],
  },
  {
    id: 'express', name: 'Express (Node.js)', category: 'framework', icon: 'server-cog',
    headers: [{ name: 'x-powered-by', pattern: /^Express$/i }],
  },
  {
    id: 'aspnet', name: 'ASP.NET', category: 'framework', icon: 'server-cog',
    headers: [{ name: 'x-aspnet-version' }, { name: 'x-powered-by', pattern: /ASP\.NET/i }],
    cookies: [/ASP\.NET_SessionId/i, /\.AspNetCore/i],
  },
  {
    id: 'php', name: 'PHP', category: 'language', icon: 'file-code',
    headers: [{ name: 'x-powered-by', pattern: /PHP(?:\/([\d.]+))?/i, versionGroup: true }],
    cookies: [/^PHPSESSID$/],
  },
  {
    id: 'laravel', name: 'Laravel', category: 'framework', icon: 'server-cog',
    cookies: [/laravel_session/i, /XSRF-TOKEN/], implies: ['php'],
  },
  {
    id: 'django', name: 'Django', category: 'framework', icon: 'server-cog',
    // csrftoken is a strong Django tell; sessionid alone is generic, so it
    // is intentionally not used. (A bare SAMEORIGIN header proves nothing.)
    cookies: [/^csrftoken$/],
  },
  {
    id: 'rails', name: 'Ruby on Rails', category: 'framework', icon: 'gem',
    headers: [{ name: 'x-powered-by', pattern: /Phusion Passenger/i }, { name: 'x-runtime' }],
    scripts: [/rails-ujs/, /@rails/],
  },
  {
    id: 'java', name: 'Java (JSESSIONID)', category: 'language', icon: 'coffee',
    cookies: [/^JSESSIONID$/i],
  },

  // ---------------------------------------------------------------- Build
  {
    id: 'webpack', name: 'webpack', category: 'build', icon: 'package',
    globals: ['webpack'],
  },
  {
    id: 'vite', name: 'Vite', category: 'build', icon: 'zap',
    globals: ['vite-client'],
  },
  {
    id: 'turbopack', name: 'Turbopack', category: 'build', icon: 'zap',
    globals: ['turbopack'],
  },
  {
    id: 'pwa', name: 'Progressive Web App (Service Worker)', category: 'other', icon: 'smartphone',
    globals: ['service-worker-reg'],
  },
  {
    id: 'wasm', name: 'WebAssembly', category: 'other', icon: 'cpu',
    globals: ['wasm'],
  },
];

export const CATEGORY_LABELS: Record<TechCategory, string> = {
  cms: 'CMS',
  ecommerce: 'E-commerce',
  framework: 'JS Framework',
  library: 'JS Library',
  css: 'CSS / UI Framework',
  analytics: 'Analytics',
  marketing: 'Marketing / Ads',
  hosting: 'Hosting',
  cdn: 'CDN',
  server: 'Web Server',
  language: 'Language / Runtime',
  payment: 'Payments',
  video: 'Video',
  font: 'Fonts / Icons',
  security: 'Security / Bot Protection',
  widget: 'Widgets / Chat',
  build: 'Build Tool',
  other: 'Other',
};

/** Display order for category groups in the dashboard. */
export const CATEGORY_ORDER: TechCategory[] = [
  'cms', 'ecommerce', 'framework', 'library', 'css',
  'hosting', 'cdn', 'server', 'language',
  'analytics', 'marketing', 'payment', 'widget', 'video', 'font',
  'security', 'build', 'other',
];
