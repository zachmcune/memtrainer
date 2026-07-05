#!/usr/bin/env node
// Generates PWA PNG icons with no external/native dependencies.
// Draws a rounded dark tile with a centered spade (the app mark).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

const BG = [15, 23, 42]; // #0f172a
const TILE = [30, 41, 59]; // #1e293b
const SPADE = [226, 232, 240]; // #e2e8f0
const ACCENT = [56, 189, 248]; // #38bdf8

// CRC32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Spade test in normalized coords centered at origin, y-up, roughly [-1,1].
function insideSpade(x, y) {
  // Heart pointing up (spade top) via flipped heart equation, scaled.
  const hx = x / 1.05;
  const hy = -y / 1.05 + 0.15;
  const heart = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * hy * hy * hy;
  if (heart <= 0) return true;
  // Flared foot/stem below the lobes for the classic spade silhouette.
  if (y < -0.7 && y > -1.35) {
    const halfW = 0.05 + (-y - 0.7) * 0.55;
    if (Math.abs(x) < halfW) return true;
  }
  return false;
}

function drawIcon(size, spadeScale) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = size * 0.18; // corner radius
  const inset = size * 0.06;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let col = BG;
      // Rounded tile background.
      const inTile = insideRoundedRect(px, py, inset, inset, size - inset, size - inset, r);
      if (inTile) col = TILE;

      // Spade centered.
      const nx = (px - size / 2) / (size * spadeScale);
      const ny = (size / 2 - py) / (size * spadeScale);
      if (insideSpade(nx, ny)) {
        col = ny > 0.55 ? ACCENT : SPADE;
      }

      const i = (py * size + px) * 4;
      rgba[i] = col[0];
      rgba[i + 1] = col[1];
      rgba[i + 2] = col[2];
      rgba[i + 3] = 255;
    }
  }
  return encodePNG(size, size, rgba);
}

function insideRoundedRect(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.min(Math.max(px, x0 + r), x1 - r);
  const cy = Math.min(Math.max(py, y0 + r), y1 - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

writeFileSync(join(OUT_DIR, 'icon-192.png'), drawIcon(192, 0.34));
writeFileSync(join(OUT_DIR, 'icon-512.png'), drawIcon(512, 0.34));
writeFileSync(join(OUT_DIR, 'icon-maskable-512.png'), drawIcon(512, 0.28));
console.log('Icons written to', OUT_DIR);
