#!/usr/bin/env node
/**
 * Render src/assets/icons/icon.svg to PNG @ 16/32/48/128 px using sharp.
 * Run: node scripts/render-icons.mjs
 */
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = join(here, '..', 'src', 'assets', 'icons');
const SRC = join(ICON_DIR, 'icon.svg');

const sizes = [16, 32, 48, 128];

const svg = await readFile(SRC);

for (const size of sizes) {
  const out = join(ICON_DIR, `icon-${size}.png`);
  await sharp(svg, { density: Math.max(72, size * 4) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`wrote ${out}`);
}
