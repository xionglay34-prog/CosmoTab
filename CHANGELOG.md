# Changelog

All notable changes to **CosmoTab** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-10

🚀 **First public release** — submitted to Chrome Web Store.

### Added
- 🚀 **一键整理**：把所有打开的标签按域名自动归入 Chrome 原生标签组
- 🧹 **三种去重模式**：
  - `Strict`：URL 完全相同才合并
  - `Loose`：忽略 `#hash` 和追踪参数后比对（推荐）
  - `Domain`：同一域名只保留最近访问的一个（激进）
- ⏱ **最近访问排序**：基于 `chrome.tabs.onActivated` 实时打点，置顶刚用过的标签
- ↩️ **撤销关闭**：基于 `chrome.sessions` 的一键 Undo
- 🛡 **白名单保护**：固定标签 / 加白页面永不被自动关闭
- 🪟 **侧边栏视图**：通过 `chrome.sidePanel` 在浏览器侧栏快速浏览
- 🌗 **浅色 / 深色主题**：跟随系统或手动切换
- ❌ **单标签关闭**：卡片尾部 hover 才显示 ×，不与时间戳重叠
- 🎨 **品牌资产**：iOS 风蓝色文件夹 + sparkle 扩展图标
- 🐱 **手绘趴猫 + GSAP 3D 视差**：工具栏的细节交互
- 🔒 **隐私政策**：100% 本地运行，零数据收集（[查看](https://xionglay34-prog.github.io/CosmoTab/privacy)）

### Tech
- Manifest V3 + Service Worker
- TypeScript 5 + React 18
- Vite 7 + `@crxjs/vite-plugin`
- GSAP 用于工具栏微交互

### Known Limitations
- 仅支持 Chromium 系浏览器（Chrome / Edge / Brave / Arc）
- 不支持 iframe 内容
- `Domain` 模式对多账号场景（如多个 Gmail）需谨慎使用

---

[0.1.0]: https://github.com/xionglay34-prog/CosmoTab/releases/tag/v0.1.0
