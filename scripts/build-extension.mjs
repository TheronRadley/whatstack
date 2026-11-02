#!/usr/bin/env node
/**
 * Bundles the three extension scripts (background service worker, content
 * script, MAIN-world injected probe) as single-file IIFE bundles with esbuild.
 * Chrome content scripts cannot be ES modules with chunk imports, so these
 * entries are intentionally kept out of the Vite/Rollup graph.
 *
 * Usage:
 *   node scripts/build-extension.mjs           # one-off production build
 *   node scripts/build-extension.mjs --watch   # rebuild on change (dev)
 */
import { context } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const watch = process.argv.includes('--watch');

const entries = [
  { in: 'src/background/background.ts', out: 'dist/background.js' },
  { in: 'src/content/content.ts', out: 'dist/content.js' },
  { in: 'src/content/injected.ts', out: 'dist/injected.js' },
];

await mkdir(path.join(root, 'dist'), { recursive: true });

const contexts = [];
try {
  for (const entry of entries) {
    const ctx = await context({
      entryPoints: [path.join(root, entry.in)],
      outfile: path.join(root, entry.out),
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: ['chrome109'],
      minify: !watch,
      sourcemap: watch ? 'inline' : false,
      logLevel: 'info',
      legalComments: 'none',
    });
    contexts.push(ctx);
    if (watch) {
      await ctx.watch();
      console.log(`[whatstack] watching ${entry.in} -> ${entry.out}`);
    } else {
      await ctx.rebuild();
      console.log(`[whatstack] bundled ${entry.in} -> ${entry.out}`);
      await ctx.dispose();
    }
  }
} catch (err) {
  console.error('[whatstack] extension bundling failed', err);
  process.exit(1);
}

if (watch) {
  console.log('[whatstack] watching extension scripts… (Ctrl+C to stop)');
}
