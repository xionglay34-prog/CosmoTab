// 一键打包发布产物：
//   1. 校验 manifest version
//   2. 跑 npm run build
//   3. 把 dist/ 打成 release/dist.zip（不带 dist/ 前缀）
//
// 使用：node scripts/release.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const RELEASE = resolve(ROOT, 'release');
const ZIP_PATH = resolve(RELEASE, 'dist.zip');

function run(cmd, opts = {}) {
  console.log(`▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

// 1. 读 manifest version 用于打印提示
const manifestSrc = readFileSync(
  resolve(ROOT, 'manifest.config.ts'),
  'utf8',
);
const versionMatch = manifestSrc.match(/version:\s*['"]([\d.]+)['"]/);
const version = versionMatch ? versionMatch[1] : 'unknown';

console.log(`\n📦 Building CosmoTab v${version} ...\n`);

// 2. 确保旧 zip 删掉
mkdirSync(RELEASE, { recursive: true });
if (existsSync(ZIP_PATH)) rmSync(ZIP_PATH);

// 3. build
run('npm run build');

// 4. zip
if (!existsSync(DIST)) {
  console.error('❌ dist/ 不存在，build 失败');
  process.exit(1);
}
run(`cd "${DIST}" && zip -qr "${ZIP_PATH}" .`);

console.log(`\n✅ 完成：${ZIP_PATH}`);
console.log(`   版本：${version}`);
console.log(`   下一步：上传到 https://chrome.google.com/webstore/devconsole\n`);
