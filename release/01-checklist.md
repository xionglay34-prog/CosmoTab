## 01 · 上线流程清单

按顺序执行；勾选每一步。

---

### A. 一次性准备（只做一次）

- [ ] 注册 Chrome Web Store 开发者账号
  - 打开 https://chrome.google.com/webstore/devconsole
  - Google 账号登录 → 支付 **$5** 注册费（Visa / Mastercard）
  - 接受协议、填开发者公开名（建议 `CosmoTab`）
- [ ] 创建公开 GitHub 仓库（如还没）
  - 至少包含 README + LICENSE（建议 MIT）
- [ ] 把 `release/04-privacy-policy.md` 内容部署到 **GitHub Pages**
  - 仓库 Settings → Pages → Source: `main` / `docs/` 目录
  - 把 `04-privacy-policy.md` 复制到仓库根的 `docs/privacy.md`
  - 等待 Pages 部署完成 → 拿到 URL，例如  
    `https://leonxlnx.github.io/CosmoTab/privacy.html`
  - **这个 URL 是商店"隐私政策"必填字段，没有这个一定被拒**

---

### B. 每次发版

- [ ] 更新 `manifest.config.ts` 的 `version`（必须递增，如 `0.1.0` → `0.1.1`）
- [ ] 跑 `npm run release` —— 自动 build + zip
  - 输出 `release/dist.zip`，可直接上传商店
- [ ] 跑 `npm run promo` —— 自动生成商店所需的 4 类图
  - `release/screenshots/icon-128.png`（必填，已存在则跳过）
  - `release/screenshots/promo-small-440x280.png`（小宣传图，必填）
  - `release/screenshots/promo-marquee-1400x560.png`（大宣传图，强烈推荐）
  - `release/screenshots/screen-1.png ~ screen-5.png`（产品截图 1280×800）

> 截图也可以用真实扩展界面手动拍，见 `05-screenshots.md`。手动截图通常通过率更高。

---

### C. 上传到商店

进入 Dev Console → 新建项目 → 上传 `release/dist.zip`，按下表填写：

#### 1. 商店发布信息
| 字段 | 值（来源） |
| --- | --- |
| 名称 | `CosmoTab` |
| 简短说明 | `02-store-listing.md` § 简短说明（132 字以内） |
| 详细说明 | `02-store-listing.md` § 详细介绍 |
| 类别 | `生产工具` (Productivity) |
| 语言 | 中文（简体）；可选添加 English |
| 图标 128×128 | `release/screenshots/icon-128.png` |
| 小宣传图块 440×280 | `release/screenshots/promo-small-440x280.png` |
| 大宣传图块 1400×560 | `release/screenshots/promo-marquee-1400x560.png` |
| 截图 1280×800 (3-5 张) | `release/screenshots/screen-*.png` |

#### 2. 隐私惯例
| 字段 | 值 |
| --- | --- |
| 单一用途说明 | `02-store-listing.md` § 单一用途 |
| 各项权限解释 | `03-permissions.md`（逐字粘贴） |
| 数据使用 → 收集 / 共享 / 出售 | **全部勾选 "否"** |
| 隐私政策 URL | 你的 GitHub Pages URL |

#### 3. 分发设置
| 字段 | 推荐值 |
| --- | --- |
| 可见性 | 公开 / 仅含链接（内测建议先选"仅含链接"过审，再切公开） |
| 国家/地区 | 全部（默认） |

---

### D. 提交审核

- [ ] 通读一遍 `06-faq.md`，提前规避常见拒因
- [ ] 点击 **提交审核**
- [ ] 等待 1–3 个工作日，审核结果发邮件
- [ ] 若被拒：按邮件提示对照 `06-faq.md` 修复 → 重新提交

---

### E. 上线后

- [ ] 把商店 URL 写到 GitHub README 顶部徽章
- [ ] 截图替换成商店实际截图链接
- [ ] 后续每次 bump version 重复 B + C，**只有源码变更需要重新审核；只改商店描述/截图无需重审**
