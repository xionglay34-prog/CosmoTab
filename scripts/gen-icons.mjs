// 一次性脚本：生成 4 个纯色圆形 PNG 占位图标。
// 使用 node 内置 zlib 构造合法 PNG，零依赖。
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'src', 'assets', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

const SIZES = [16, 32, 48, 128];
// 主色调：深紫蓝 + 白色圆点
const BG = [124, 131, 255, 255];
const FG = [255, 255, 255, 255];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function buildPng(size) {
  const cx = size / 2;
  const r2 = (size / 2 - 0.5) ** 2;
  const inner = (size * 0.18) ** 2;

  // raw scanlines: 每行前缀 filter byte 0
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cx + 0.5;
      const d2 = dx * dx + dy * dy;
      let px;
      if (d2 > r2) {
        px = [0, 0, 0, 0];
      } else if (d2 < inner) {
        px = FG;
      } else {
        px = BG;
      }
      const off = y * (rowBytes + 1) + 1 + x * 4;
      raw[off] = px[0];
      raw[off + 1] = px[1];
      raw[off + 2] = px[2];
      raw[off + 3] = px[3];
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const s of SIZES) {
  const png = buildPng(s);
  const out = resolve(OUT_DIR, `icon-${s}.png`);
  writeFileSync(out, png);
  console.log('wrote', out, png.length, 'bytes');
}
