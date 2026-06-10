# Serein

闪现笔记 + 猪猪侠催命符 —— 一个像 Excalidraw 般手绘的桌面便签 / Todo。

## 启动

```bash
cd serein-app
npm install
npm run dev   # 同时启动 Vite 与 Electron
```

> better-sqlite3 是原生模块，安装时若 Electron 版本不匹配，请执行：
> `npx electron-rebuild -f -w better-sqlite3`

打包：

```bash
npm run build
npm run start
```

## 核心交互

| 操作 | 说明 |
| --- | --- |
| `Option/Alt + Space` | 全局唤起 / 收起闪现卡片，卡片以光标右下方为锚点出现，靠边自动反弹 |
| `Esc` | 隐藏卡片 |
| 失去焦点 | 卡片自动隐藏 |
| `Ctrl + V` 在笔记区 | 粘贴剪贴板图片，自动本地化保存到 userData/images/ |
| Todo 输入框 | 例：`明天下午3点 开会` 自动识别截止时间 |
| 截止前 30 分钟 | 触发猪猪侠横幅穿屏动画（鼠标穿透） |

## 目录结构

```
serein-app/
├─ electron/                # 主进程（窗口、快捷键、IPC、SQLite）
│  ├─ main.ts
│  ├─ preload.ts
│  ├─ db.ts
│  └─ tsconfig.json
├─ src/
│  ├─ card/                 # 闪现卡片渲染层
│  ├─ overlay/              # 全屏催命符渲染层
│  └─ shared/               # 共享类型 / 中文时间解析
├─ card.html / overlay.html # 渲染层入口 HTML
├─ vite.config.ts
└─ package.json
```

## 设计风格

参考 Excalidraw 手绘风：米白纸张色 (#fdf8ee)、不规则圆角、双层偏移外框、Kalam/Caveat/楷体字体回退、虚线分隔与小胶带。

## 数据存储

- SQLite：`<userData>/serein.db`，含 `notes`（单条主笔记）与 `todos` 表
- 粘贴图片：`<userData>/images/`
