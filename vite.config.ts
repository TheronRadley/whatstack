import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// WhatStack build strategy:
// - Vite builds ONLY the React surfaces (popup.html + index.html full-page dashboard).
// - background.js / content.js / injected.js are bundled separately by
//   scripts/build-extension.mjs (esbuild, IIFE) so Chrome receives classic,
//   single-file scripts with no ES-module chunks (required for content scripts).
// - public/manifest.json + public/icons/* are copied verbatim into dist/.
export default defineConfig({
  // Relative asset paths so popup.html/index.html work from chrome-extension://
  // URLs and any static subpath alike.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow proxied preview hosts (e.g. *.e2b.app) in dev sandboxes.
    allowedHosts: true,
    proxy: {
      // Web-demo mode: forward API calls to the optional Express companion server.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // MV3 extension pages run under a strict CSP: never inline assets as
    // data: URLs or inline <script> blocks.
    assetsInlineLimit: 0,
    modulePreload: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        index: resolve(__dirname, 'index.html'),
      },
    },
  },
});
