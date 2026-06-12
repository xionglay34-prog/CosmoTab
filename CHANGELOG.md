# Changelog

All notable changes to **CosmoTab** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-12

🐛 **Bugfix release** — focused on tab-group correctness and cleaner visuals.

### Fixed
- 🪟 **重复分组消失**：每次「一键整理」会先把目标标签从旧组解绑，再统一建新组，杜绝并排出现多个同名 chip（如 `[lark][其他][lark]`）的问题
- 🧷 **整理后跨域污染**：调整了"去重 → 排序 → 分组"的顺序（之前 sort 会把 github 插进 aidp 组），现在同域名 tab 永远只会归到自己的组
- 🔗 **manifest `homepage_url`** 修正为正确的仓库地址 `xionglay34-prog/CosmoTab`

### Changed
- 🎨 **配色改为淡色系**：分组颜色限定在 `blue · cyan · pink · purple` 四种柔和色，移除高饱和的 red / yellow / green，`grey` 留给特殊用途
- 🏷 **组名简化**：标签栏 chip 上的标题从完整 hostname 缩成业务标识：
  - `aidp.bytedance.net` → **aidp**
  - `neeko-aidp.bytedance.net` → **neeko**
  - `meego.larkoffice.com` → **meego**
  - `bytedance.larkoffice.com` → **lark**（首段是租户名时回退到根域 + 别名表）
  - `www.notion.so` → **notion**
- 🚫 **不再为零散 tab 建「其他」组**：单独域名的 tab 直接散落在标签栏，不占用 chip 空间

### Tech
- 新增 `clusterByDomain` 排序策略：簇间按"簇内最近访问时间"降序，簇内按 `lastAccessed` 降序

---

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

[0.1.1]: https://github.com/xionglay34-prog/CosmoTab/releases/tag/v0.1.1
[0.1.0]: https://github.com/xionglay34-prog/CosmoTab/releases/tag/v0.1.0
