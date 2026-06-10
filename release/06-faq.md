## 06 · 审核被拒常见问题 + 答复模板

按 Google 审核团队真实回复整理。被拒后**不要慌**，对照修复后回复邮件即可。

---

### Top 5 高频拒因

#### 1. **Purpose · Single Purpose 不明确**

> "Your product does not have a single purpose."

**修复**：
- 在 manifest description 与 Dev Console "单一用途" 框统一表述为：
  > "本扩展唯一用途是帮助用户整理浏览器标签页（按域名分组、去重、按最近访问排序）。"
- 移除任何"附加功能"措辞，专注一句话讲清核心。

---

#### 2. **Permissions · 申请权限超出实际功能**

> "Use of permissions is not adequately justified."

**最容易踩雷**：
- `<all_urls>` host_permission（CosmoTab 不需要，**确认 manifest 里没有**）
- `history` / `cookies` / `webRequest`（用不到不要加）
- `tabs` 申请了但描述里说"仅整理标签"，需要补一句"读取 URL/title 用于分组与去重"

**修复**：照搬 `03-permissions.md` 中每个权限的解释。

---

#### 3. **Privacy Policy · 隐私政策链接 404 / 内容空泛**

> "Your developer page does not include a privacy policy."

**修复**：
- 确保 GitHub Pages 已部署，URL 在浏览器中能正常访问
- 政策里必须明确说"我们收集什么 / 不收集什么 / 数据是否离开设备"
- 直接用 `04-privacy-policy.md` 内容部署即可

---

#### 4. **Misleading metadata · 截图与功能不符**

> "Your extension's screenshots do not match its functionality."

**修复**：
- 截图必须真实展示扩展界面，**不允许 mock-up 假数据但展示效果**
- 不允许在截图里出现"AI 智能整理"等扩展实际不具备的卖点
- 截图分辨率必须严格 1280×800 或 640×400，不允许压缩 / 拉伸

---

#### 5. **Quality Guideline · 功能过于简单 / 已存在大量同类**

> "Your product does not provide sufficient functionality."

CosmoTab 不会触发这条，因为：
- 三种去重模式 + 撤销 + 白名单 + 侧边栏属于**集成度较高**的整理方案
- 中文描述里强调"按最近访问排序" + "撤销关闭" + "Domain 模式" 三大差异化卖点

如真被命中，回复模板见下文 § 申诉模板。

---

### 申诉模板（被拒后回邮件）

```
Hi Chrome Web Store team,

Thanks for the review. I'd like to clarify the points raised:

1. [被拒条款编号 / 引用] —— We have updated [item] in version [v] to [fix details].
2. [其他点同上]

Specifically:
- The "tabs" permission is used to read tab.url / tab.title for local grouping
  and deduplication only. No data leaves the user's device.
- A privacy policy is now publicly available at:
  https://leonxlnx.github.io/CosmoTab/privacy
- Screenshots have been replaced with genuine UI captures (1280×800).

The new package has been resubmitted as version [v]. Please re-review at your
convenience. Thank you!

Best,
[你的名字]
```

把 `[]` 内填上具体内容即可。

---

### 二次提交前自检清单

- [ ] manifest description 与 Dev Console 单一用途一致
- [ ] 每个 permission 都有用途说明
- [ ] 隐私政策 URL 可访问，HTTPS，无 404
- [ ] 截图全部为真实 UI、1280×800、无内部信息
- [ ] 数据使用披露 13 项全部勾选完毕
- [ ] version 已递增（不递增会被拒"已存在该版本"）
- [ ] 测试一遍：临时安装 ZIP 到干净 Chrome，核心流程跑通

---

### 通过后

恭喜上线！记得：
- 把商店 URL 写到 GitHub README 顶部
- 不要刷虚假评价（违反 ToS，会下架）
- 后续更新只改 metadata（描述、截图）不需重审；改源码必须 bump version 重审
