// 生成 Chrome Web Store 商店所需的图块：
//   - icon-128.png            （128×128，已有则跳过）
//   - promo-small-440x280.png （小宣传图块，必填）
//   - promo-marquee-1400x560  （大宣传图块，推荐）
//
// 用 sharp 在内存里 SVG → PNG，无需任何外部依赖（sharp 已在 devDependencies）。
//
// 使用：node scripts/gen-promo.mjs
import sharp from 'sharp';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'release/screenshots');
mkdirSync(OUT, { recursive: true });

// === 1. 复制 icon-128 到输出目录 ===
const iconSrc = resolve(ROOT, 'src/assets/icons/icon-128.png');
const iconDst = resolve(OUT, 'icon-128.png');
if (existsSync(iconSrc)) {
  copyFileSync(iconSrc, iconDst);
  console.log(`✓ ${iconDst}`);
} else {
  console.warn(`⚠ 找不到 ${iconSrc}，跳过 icon 复制`);
}

// 共享：品牌渐变 + logo 简化版（蓝色文件夹方块）
const brand = (w, h, title, subtitle, opts = {}) => {
  const tagFontSize = opts.tagFontSize ?? 28;
  const titleFontSize = opts.titleFontSize ?? Math.round(h * 0.16);
  const subtitleFontSize = opts.subtitleFontSize ?? Math.round(h * 0.058);
  const logoSize = opts.logoSize ?? Math.round(h * 0.4);
  const logoX = opts.logoX ?? Math.round(w * 0.06);
  const logoY = opts.logoY ?? Math.round(h * 0.5 - logoSize / 2);
  const textX = logoX + logoSize + Math.round(w * 0.04);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6f8cff"/>
      <stop offset="55%" stop-color="#5a72ff"/>
      <stop offset="100%" stop-color="#4f63f7"/>
    </linearGradient>
    <linearGradient id="folder" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e8efff"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.7" cy="0.3" r="0.8">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- 背景 -->
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <!-- 装饰小星 -->
  <g fill="#ffffff" opacity="0.25">
    <circle cx="${w * 0.85}" cy="${h * 0.18}" r="2.5"/>
    <circle cx="${w * 0.92}" cy="${h * 0.42}" r="1.5"/>
    <circle cx="${w * 0.78}" cy="${h * 0.78}" r="2"/>
  </g>
  <!-- Logo: 三层文件夹堆叠 -->
  <g transform="translate(${logoX}, ${logoY})">
    <rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${logoSize * 0.22}" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)"/>
    <g transform="translate(${logoSize * 0.18}, ${logoSize * 0.22})">
      <path d="M${logoSize * 0.05},${logoSize * 0.1} L${logoSize * 0.32},${logoSize * 0.1} L${logoSize * 0.4},${logoSize * 0.18} L${logoSize * 0.62},${logoSize * 0.18} Q${logoSize * 0.66},${logoSize * 0.18} ${logoSize * 0.66},${logoSize * 0.22} L${logoSize * 0.66},${logoSize * 0.5} Q${logoSize * 0.66},${logoSize * 0.54} ${logoSize * 0.62},${logoSize * 0.54} L${logoSize * 0.05},${logoSize * 0.54} Q${logoSize * 0.01},${logoSize * 0.54} ${logoSize * 0.01},${logoSize * 0.5} L${logoSize * 0.01},${logoSize * 0.14} Q${logoSize * 0.01},${logoSize * 0.1} ${logoSize * 0.05},${logoSize * 0.1} Z"
            fill="url(#folder)" opacity="0.55"/>
      <path d="M${logoSize * 0.02},${logoSize * 0.18} L${logoSize * 0.3},${logoSize * 0.18} L${logoSize * 0.38},${logoSize * 0.26} L${logoSize * 0.6},${logoSize * 0.26} Q${logoSize * 0.64},${logoSize * 0.26} ${logoSize * 0.64},${logoSize * 0.3} L${logoSize * 0.64},${logoSize * 0.58} Q${logoSize * 0.64},${logoSize * 0.62} ${logoSize * 0.6},${logoSize * 0.62} L${logoSize * 0.02},${logoSize * 0.62} Q${logoSize * -0.02},${logoSize * 0.62} ${logoSize * -0.02},${logoSize * 0.58} L${logoSize * -0.02},${logoSize * 0.22} Q${logoSize * -0.02},${logoSize * 0.18} ${logoSize * 0.02},${logoSize * 0.18} Z"
            fill="url(#folder)" opacity="0.85"/>
      <path d="M${logoSize * -0.02},${logoSize * 0.26} L${logoSize * 0.28},${logoSize * 0.26} L${logoSize * 0.36},${logoSize * 0.34} L${logoSize * 0.58},${logoSize * 0.34} Q${logoSize * 0.62},${logoSize * 0.34} ${logoSize * 0.62},${logoSize * 0.38} L${logoSize * 0.62},${logoSize * 0.66} Q${logoSize * 0.62},${logoSize * 0.7} ${logoSize * 0.58},${logoSize * 0.7} L${logoSize * -0.02},${logoSize * 0.7} Q${logoSize * -0.06},${logoSize * 0.7} ${logoSize * -0.06},${logoSize * 0.66} L${logoSize * -0.06},${logoSize * 0.3} Q${logoSize * -0.06},${logoSize * 0.26} ${logoSize * -0.02},${logoSize * 0.26} Z"
            fill="url(#folder)"/>
      <!-- sparkle -->
      <path d="M${logoSize * 0.42} ${logoSize * 0.45} L${logoSize * 0.45} ${logoSize * 0.52} L${logoSize * 0.52} ${logoSize * 0.55} L${logoSize * 0.45} ${logoSize * 0.58} L${logoSize * 0.42} ${logoSize * 0.65} L${logoSize * 0.39} ${logoSize * 0.58} L${logoSize * 0.32} ${logoSize * 0.55} L${logoSize * 0.39} ${logoSize * 0.52} Z"
            fill="#5a72ff"/>
    </g>
  </g>
  <!-- 文案 -->
  <g font-family="-apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif" fill="#ffffff">
    <text x="${textX}" y="${h * 0.5 - subtitleFontSize * 0.4}" font-size="${titleFontSize}" font-weight="800" letter-spacing="-1">${title}</text>
    <text x="${textX}" y="${h * 0.5 + titleFontSize * 0.7}" font-size="${subtitleFontSize}" font-weight="500" opacity="0.85">${subtitle}</text>
  </g>
</svg>`;
};

const items = [
  {
    name: 'promo-small-440x280.png',
    w: 440,
    h: 280,
    title: 'CosmoTab',
    subtitle: '一键整理标签 · 按域名分组',
  },
  {
    name: 'promo-marquee-1400x560.png',
    w: 1400,
    h: 560,
    title: 'CosmoTab',
    subtitle: '一键整理 · 智能去重 · 撤销关闭 · 100% 本地运行',
  },
];

for (const it of items) {
  const svg = brand(it.w, it.h, it.title, it.subtitle);
  const out = resolve(OUT, it.name);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  console.log(`✓ ${out}`);
}

console.log(`\n📸 Promo 图已生成于 ${OUT}`);
console.log('   产品截图 (screen-1.png ~ screen-5.png) 请按 release/05-screenshots.md 手动拍。');
