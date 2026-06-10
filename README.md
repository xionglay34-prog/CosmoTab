<div align="center">

<img src="src/assets/icons/icon-128.png" alt="CosmoTab" width="96" height="96" />

# CosmoTab

**一键整理 Chrome 标签页：按域名分组 · 智能去重 · 按最近访问排序**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success.svg)](manifest.json)
[![Made with TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Built with Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Privacy Policy](https://img.shields.io/badge/Privacy-100%25%20Local-brightgreen)](https://xionglay34-prog.github.io/CosmoTab/privacy)

[功能](#-核心功能) · [截图](#-截图预览) · [安装](#-安装) · [开发](#-开发) · [隐私](#-隐私) · [贡献](#-贡献)

</div>

---

## 🌌 简介

如果你和我一样，一开 Chrome 就有 30+ 个标签页飘在窗口上方变成像素，**CosmoTab** 就是为你设计的。

它会把混乱的标签页**自动归类**到 Chrome 原生的标签组里，**智能合并重复**，按**最近访问时间**排序，还能**一键撤销**误关。

100% 本地运行，不收集任何数据。

---

## ✨ 核心功能

| 功能 | 说明 |
| --- | --- |
| 🚀 **一键整理** | 把所有打开的标签按域名分组，归入 Chrome 原生标签组 |
| 🧹 **智能去重** | 三种模式可切换：Strict / Loose / Domain |
| ⏱ **最近访问排序** | 自动把刚用过的标签置顶，相对时间 `1m / 13m / 2h` |
| ↩️ **撤销关闭** | 误关了？一键 Undo（基于 `chrome.sessions`）|
| 🛡 **白名单保护** | 固定的或加白的 tab 永不会被自动关闭 |
| 🪟 **侧边栏视图** | 在浏览器侧栏快速浏览所有标签，无需切窗口 |
| 🌗 **浅色 / 深色** | 双主题，跟随系统或手动切换 |

### 三种去重模式

| 模式 | 判定规则 | 适用 |
| --- | --- | --- |
| **Strict** | URL 字符串完全相同 | 保守整理，只合并真重复 |
| **Loose** | 去 `#hash`、追踪参数、参数排序后相同 | 日常使用推荐 |
| **Domain** ⚠️ | 同一域名只保留最近访问的一个 | 激进清理，慎用 |

---

## 📸 截图预览

| | |
| --- | --- |
| ![](release/screenshots/screen-1.png) | ![](release/screenshots/screen-2.png) |
| 深色 / Domain 模式 + 撤销提示 | Domain 警示态 + 域名分组 |

![](release/screenshots/screen-3.png)

> 浅色 / Loose 模式，一边浏览一边整理。

---

## 📦 安装

### 方式 1：Chrome Web Store（推荐，审核通过后）

> 🚧 商店审核中，预计 1-3 个工作日上线。

### 方式 2：从源码加载（开发者）

```bash
# 1. 克隆仓库
git clone https://github.com/xionglay34-prog/CosmoTab.git
cd CosmoTab

# 2. 安装依赖
npm install

# 3. 构建产物
npm run build
```

然后：

1. 打开 `chrome://extensions/`
2. 右上角开启 **开发者模式**
3. 点 **加载已解压的扩展程序** → 选择本仓库的 `dist/` 目录
4. 工具栏出现 CosmoTab 图标，点开即可使用

---

## 🛠 开发

```bash
# 监听模式（改代码自动重 build）
npm run dev

# 生产构建
npm run build

# 一键打 release zip
npm run release
```

### 项目结构

```
CosmoTab/
├── src/
│   ├── background/         # MV3 service worker（lastAccessed 打点 / 整理调度）
│   ├── core/               # 纯逻辑：dedupe / tabs / hibernation
│   ├── dashboard/          # 侧边栏 React UI
│   ├── shared/             # 共用工具
│   └── assets/icons/       # 扩展图标
├── manifest.config.ts      # MV3 manifest
├── vite.config.ts
├── docs/                   # GitHub Pages 站点（隐私政策）
└── release/                # 商店上架材料
```

### 技术栈

- **TypeScript** + **React 18**
- **Vite 7** + [@crxjs/vite-plugin](https://github.com/crxjs/chrome-extension-tools)
- **Manifest V3** + `chrome.sidePanel` API
- **GSAP** 处理工具栏 3D 视差与磁吸交互

---

## 🔒 隐私

CosmoTab 完全在你本地运行：

- ✅ **不收集任何数据**
- ✅ **不发送任何网络请求**
- ✅ 所有偏好（白名单、主题、模式）只保存在 `chrome.storage.local`
- ✅ 开源代码可审计

→ [完整隐私政策](https://xionglay34-prog.github.io/CosmoTab/privacy)

### 申请的权限

| 权限 | 用途 |
| --- | --- |
| `tabs` | 读取标签 URL / 标题 / favicon 用于分组与去重 |
| `tabGroups` | 把同域标签合并到 Chrome 原生标签组 |
| `sessions` | 撤销关闭 |
| `storage` | 保存用户偏好 |
| `sidePanel` | 在侧边栏显示主界面 |
| `favicon` | 显示站点图标 |

---

## 🐱 设计

- 🎨 **手绘风插画**：顶部有一只懒洋洋的猫趴着
- 🌈 **彩虹渐变 CTA**：一键整理按钮的辉光胶囊
- ✨ **GSAP 3D 视差**：鼠标悬停时的细微倾斜
- 📐 **8px 间距系统**：所有元素严格对齐
- 🇨🇳 **中文友好**：相对时间用 `刚刚 / 5m / 2h / 3d` 而非生硬的 ISO 时间

---

## 🐛 反馈

- 🐞 [提交 Issue](https://github.com/xionglay34-prog/CosmoTab/issues)
- 💌 邮箱：xionglay34@gmail.com

---

## 🙏 贡献

欢迎 PR！开发约定：

```bash
# 1. Fork & clone
# 2. 起一个新分支
git checkout -b feat/your-feature

# 3. 提交（用 Conventional Commits）
git commit -m "feat: add some-feature"

# 4. 推送 + 开 PR
```

---

## 📄 许可

MIT License © 2026 [xionglay34-prog](https://github.com/xionglay34-prog)
