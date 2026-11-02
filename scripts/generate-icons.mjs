#!/usr/bin/env node
/**
 * Generates WhatStack PNG icons (16/32/48/128) with zero dependencies:
 * a tiny software rasterizer + a minimal PNG encoder (zlib + CRC32).
 * Design: dark rounded square, neon violet→mint "stacked layers" glyph.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const VIOLET = [139, 92, 246];
const MINT = [52, 211, 153];

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const r = size * 0.24; // corner radius
  const cx = size / 2;
  // Three stacked diamond layers (isometric "stack" glyph).
  const layers = [0.30, 0.50, 0.70].map((cy, i) => ({
    cy: size * cy,
    hw: size * 0.30, // half width
    hh: size * 0.105, // half height
    t: i / 2,
  }));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded-rect mask
      const dx = Math.max(r - x, 0, x - (size - 1 - r));
      const dy = Math.max(r - y, 0, y - (size - 1 - r));
      if (dx * dx + dy * dy > r * r) continue; // transparent
      // Background: deep void with subtle vertical gradient
      const gt = y / size;
      let R = lerp(16, 8, gt), G = lerp(16, 8, gt), B = lerp(28, 14, gt), A = 255;
      // Glyph layers
      for (const L of layers) {
        const inDiamond =
          Math.abs(x - cx) / L.hw + Math.abs(y - L.cy) / L.hh <= 1 && L.hw > 0;
        if (inDiamond) {
          R = Math.round(lerp(VIOLET[0], MINT[0], L.t));
          G = Math.round(lerp(VIOLET[1], MINT[1], L.t));
          B = Math.round(lerp(VIOLET[2], MINT[2], L.t));
        }
      }
      px[i] = R; px[i + 1] = G; px[i + 2] = B; px[i + 3] = A;
    }
  }
  return encodePng(size, px);
}

for (const size of [16, 32, 48, 128]) {
  const file = path.join(outDir, `icon${size}.png`);
  writeFileSync(file, render(size));
  console.log(`[whatstack] wrote ${file}`);
}
