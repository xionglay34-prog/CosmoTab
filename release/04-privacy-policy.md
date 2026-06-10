## 04 · 隐私政策正文

> 部署到 GitHub Pages 后即得公开 URL，填到 Dev Console "隐私政策" 字段。  
> 部署步骤见本文末尾。

---

# CosmoTab 隐私政策

**最后更新：2026-06-10**

CosmoTab（"我们"、"本扩展"）尊重并保护所有用户的个人隐私。本隐私政策说明了 CosmoTab 在你使用过程中如何处理数据。

---

## 1. 我们不收集任何数据

CosmoTab 是一个**纯本地运行**的浏览器扩展。我们：

- **不会** 收集你的个人身份信息
- **不会** 收集你的浏览历史、URL、标签标题
- **不会** 上传任何数据到任何服务器
- **不会** 与任何第三方共享数据
- **不会** 使用数据进行广告投放或信用评估

---

## 2. 本地存储的数据

为了让扩展正常工作，以下数据会保存在 `chrome.storage.local`（**仅你本机的 Chrome 配置内**）：

| 数据类型 | 用途 | 是否离开你的设备 |
| --- | --- | --- |
| 白名单 URL 列表 | 防止指定标签被自动关闭 | 否 |
| 主题偏好（浅色/深色） | UI 渲染 | 否 |
| 去重模式（Strict/Loose/Domain） | 整理逻辑 | 否 |
| 各标签最近访问时间戳 | 排序与显示相对时间 | 否 |

你可以随时在 `chrome://extensions/` 卸载 CosmoTab，所有本地数据将被一并清除。

---

## 3. 我们使用的 Chrome 权限

| 权限 | 用途 |
| --- | --- |
| `tabs` | 在本地读取标签 URL/title/favicon 用于分组与去重 |
| `tabGroups` | 把同域标签合并到 Chrome 原生标签组 |
| `sessions` | 实现"撤销关闭"功能 |
| `storage` | 本地保存上述偏好 |
| `sidePanel` | 在侧边栏显示主界面 |
| `favicon` | 拉取站点图标显示在标签卡片上 |

**所有权限仅用于本地标签管理，不涉及任何远程数据传输。**

---

## 4. 网络请求

CosmoTab 不会主动发起任何网络请求。  
（站点 favicon 由 Chrome 内置 `chrome://favicon/` 提供，不经过我们任何服务器。）

---

## 5. 第三方服务

CosmoTab 不集成任何分析、统计、广告或追踪 SDK。

---

## 6. 儿童隐私

CosmoTab 不针对 13 岁以下儿童收集数据。

---

## 7. 政策更新

本政策若有更新，将在 GitHub 仓库与商店详情页同步发布。重大变更时会在扩展内提醒。

---

## 8. 联系我们

- GitHub Issues: https://github.com/xionglay34-prog/CosmoTab/issues
- Email: xionglay34@gmail.com

---

## 部署到 GitHub Pages 步骤

```bash
# 1. 在仓库根创建 docs/ 目录并放入 privacy.md
mkdir -p docs
cp release/04-privacy-policy.md docs/privacy.md

# 2. 提交
git add docs/
git commit -m "docs: add privacy policy"
git push
```

然后到 GitHub 仓库 → **Settings → Pages**：
- **Source**: `Deploy from a branch`
- **Branch**: `main` / 目录选 `/docs`
- 保存后等约 1 分钟

最终 URL（替换成你的用户名/仓库名）：

```
https://leonxlnx.github.io/CosmoTab/privacy
```

把这个 URL 粘到 Dev Console "隐私政策 URL" 字段。
