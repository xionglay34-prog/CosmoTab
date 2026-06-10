## 05 · 截图脚本

商店要求 **1280×800** 或 640×400 的产品截图，至少 1 张，推荐 3-5 张。

---

### 必拍场景（按重要性排序）

| # | 场景 | 设备视图 | 重点展示 |
| --- | --- | --- | --- |
| 1 | **Dashboard 全景** | 普通 Chrome 窗口 | 多个域名分组 + Recent + 一键整理按钮 |
| 2 | **整理过程** | 同上 | 点击"一键整理"后标签合并到 Chrome 原生标签组 |
| 3 | **去重模式切换** | 同上 | Strict / Loose / Domain 三态 pill 高亮 |
| 4 | **暗色主题** | 同上 + 深色模式 | 同 #1 但是深色，体现双主题 |
| 5 | **侧边栏视图** | 缩窄到 360px | 体现侧边栏紧凑布局 + 关闭按钮 hover |

---

### 怎么拍

#### 方式 A：Chrome DevTools Device Mode（推荐）

1. 打开 Dashboard / 侧边栏，按 **F12**
2. DevTools 顶栏点 📱 切到 Device Mode
3. 顶部下拉选 **Responsive** → 输入尺寸 `1280 × 800`
4. 缩放比例选 100%
5. 摆好界面后右上角三点菜单 → **Capture screenshot**
6. 保存到 `release/screenshots/screen-1.png ~ screen-5.png`

#### 方式 B：macOS 原生截图

1. 把窗口手动调到 1280×800 附近
2. `⌘ + Shift + 4 + Space` 截整窗口
3. 用 Preview / 在线工具裁切到精确 1280×800

---

### 拍摄前检查清单

- [ ] 把示例标签替换成**公开网站**（GitHub / Wikipedia / Google / YouTube / Notion / Figma）
  - **绝对不要**出现公司内部域名（aidp.bytedance.net、meego.larkoffice.com 等）
  - 飞书文档 / 内部 IM 截图会**直接被打回**
- [ ] 确保示例标签名称无敏感信息
- [ ] 关闭书签栏 / 隐藏开发者书签
- [ ] 浏览器使用干净 profile（用 `⌘ + Shift + N` 无痕模式 + 临时安装扩展拍）
- [ ] 暗色主题截图前切深色

---

### 商店额外图块（需要 PNG，已自动生成）

| 图块 | 尺寸 | 文件 | 是否必填 |
| --- | --- | --- | --- |
| 商店图标 | 128×128 | `icon-128.png` | **必填** |
| 小宣传图块 | 440×280 | `promo-small-440x280.png` | **必填** |
| 大宣传图块 | 1400×560 | `promo-marquee-1400x560.png` | 推荐 |

这三张会由 `npm run promo` 用品牌色和 logo 自动渲出。运行：

```bash
npm run promo
```

输出到 `release/screenshots/`。

---

### 文案蒙层建议（可选，提高点击率）

如果想给截图加文字标题（"一键整理 30+ 标签"等），推荐：

- 字体：与品牌一致的中文 + 英文混排（Inter + 思源黑体 / PingFang）
- 颜色：白底场景用深色文字 (#1a1a1a)，深色场景用 (#fafafa)
- 字号：72-96pt 主标题 + 32pt 副标题
- 工具：Figma / Canva / Pixelmator / 上面给的 promo 图也是程序化叠字

不加文字直接用纯界面截图也完全可以，简洁更易过审。
