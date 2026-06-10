import { app, BrowserWindow, globalShortcut, ipcMain, screen, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { initDB, listTodos, upsertNote, getNote, addTodo, updateTodo, deleteTodo, allUpcomingTodos, markTodoAlerted } from './db';

// 开发环境下避免 macOS 沙箱权限问题
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.setName('Serein');
// 使用项目目录下的 .userdata，避免 macOS 部分目录受 TCC 写保护
const SEREIN_HOME = path.join(__dirname, '..', '.userdata');
try { fs.mkdirSync(SEREIN_HOME, { recursive: true }); } catch {}
app.setPath('userData', SEREIN_HOME);

const isDev = process.env.NODE_ENV === 'development';
const RENDERER_URL = 'http://localhost:5173';

let cardWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
const userDataDir = () => app.getPath('userData');
const imagesDir = () => path.join(userDataDir(), 'images');

function ensureDirs() {
  const dir = imagesDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rendererPage(name: 'card' | 'overlay'): string {
  if (isDev) return `${RENDERER_URL}/${name}.html`;
  return `file://${path.join(__dirname, '..', 'dist', `${name}.html`)}`;
}

function createCardWindow() {
  if (cardWindow) return cardWindow;
  cardWindow = new BrowserWindow({
    width: 420,
    height: 360,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  cardWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  cardWindow.loadURL(rendererPage('card'));

  cardWindow.on('blur', () => {
    if (!cardWindow || cardWindow.webContents.isDevToolsOpened()) return;
    // 鼠标仍在卡片范围内的失焦：极大概率是被系统级 overlay（截图、Spotlight、输入法候选窗等）暂时抢焦，
    // 此时不要隐藏卡片，保留用户上下文。
    const cursor = screen.getCursorScreenPoint();
    const b = cardWindow.getBounds();
    const inside =
      cursor.x >= b.x && cursor.x <= b.x + b.width &&
      cursor.y >= b.y && cursor.y <= b.y + b.height;
    if (inside) return;
    cardWindow.hide();
  });
  cardWindow.on('closed', () => {
    cardWindow = null;
  });
  return cardWindow;
}

function positionCardAtCursor() {
  if (!cardWindow) return;
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { x: dx, y: dy, width: dw, height: dh } = display.workArea;
  const [w, h] = cardWindow.getSize();
  const margin = 12;
  // 默认右下方
  let x = cursor.x + 16;
  let y = cursor.y + 16;
  // 边界反弹
  if (x + w + margin > dx + dw) x = cursor.x - w - 16;
  if (y + h + margin > dy + dh) y = cursor.y - h - 16;
  if (x < dx + margin) x = dx + margin;
  if (y < dy + margin) y = dy + margin;
  cardWindow.setPosition(Math.round(x), Math.round(y), false);
}

function toggleCardWindow() {
  const win = createCardWindow();
  if (win.isVisible()) {
    win.hide();
    return;
  }
  positionCardAtCursor();
  win.showInactive();
  win.focus();
}

function createOverlayWindow() {
  if (overlayWindow) return overlayWindow;
  const primary = screen.getPrimaryDisplay();
  const { x, y, width, height } = primary.bounds;
  overlayWindow = new BrowserWindow({
    x, y, width, height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.loadURL(rendererPage('overlay'));
  overlayWindow.on('closed', () => { overlayWindow = null; });
  return overlayWindow;
}

function showOverlayMessage(text: string, dueAt: number | null = null) {
  const win = createOverlayWindow();
  const send = () => {
    win.showInactive();
    win.webContents.send('overlay:trigger', { text, dueAt, ts: Date.now() });
  };
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', send);
  } else {
    send();
  }
}

function dismissOverlay() {
  if (overlayWindow && overlayWindow.isVisible()) {
    overlayWindow.webContents.send('overlay:dismiss');
    overlayWindow.hide();
  }
}

// 30 分钟前调度提醒
let scheduleTimer: NodeJS.Timeout | null = null;
function checkAndAlert() {
  try {
    const now = Date.now();
    const todos = allUpcomingTodos();
    for (const t of todos) {
      if (!t.dueAt) continue;
      const remain = t.dueAt - now;
      if (remain <= 30 * 60 * 1000 && remain > 0 && !t.alerted) {
        showOverlayMessage(t.text, t.dueAt);
        markTodoAlerted(t.id);
      }
    }
  } catch (e) {
    console.error('[scheduler]', e);
  }
}
function startScheduler() {
  scheduleTimer = setInterval(checkAndAlert, 30 * 1000);
  checkAndAlert();
}

app.whenReady().then(() => {
  ensureDirs();
  initDB(path.join(userDataDir(), 'serein.db'));

  // 注册全局快捷键 Option/Alt + Space
  const ok = globalShortcut.register('Alt+Space', () => {
    toggleCardWindow();
  });
  if (!ok) console.warn('全局快捷键 Alt+Space 注册失败');

  // Esc 在卡片聚焦时由渲染层处理；这里再加一个全局退出快捷
  globalShortcut.register('Escape', () => {
    // 优先关闭催促效果
    if (overlayWindow && overlayWindow.isVisible()) {
      dismissOverlay();
      return;
    }
    if (cardWindow && cardWindow.isVisible() && cardWindow.isFocused()) cardWindow.hide();
  });

  // 预创建窗口（隐藏）
  createCardWindow();
  createOverlayWindow();
  startScheduler();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createCardWindow();
  });
});

// macOS 保持后台运行：不在所有窗口关闭时退出
app.on('window-all-closed', () => {
  // no-op
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (scheduleTimer) clearInterval(scheduleTimer);
});

// ------- IPC -------
ipcMain.handle('card:hide', () => { cardWindow?.hide(); });
ipcMain.handle('card:resize', (_e, w: number, h: number) => {
  if (!cardWindow) return;
  cardWindow.setSize(Math.round(w), Math.round(h));
  positionCardAtCursor();
});

ipcMain.handle('note:get', () => getNote());
ipcMain.handle('note:save', (_e, content: string) => upsertNote(content));

ipcMain.handle('todo:list', () => listTodos());
ipcMain.handle('todo:add', (_e, payload: { text: string; dueAt: number | null }) => {
  const row = addTodo(payload.text, payload.dueAt);
  // 新增 todo 后立即检查一次：避免 30s 轮询 + 窗口冷启动时序问题导致漏触发
  setTimeout(checkAndAlert, 100);
  return row;
});
ipcMain.handle('todo:update', (_e, id: number, patch: any) => {
  updateTodo(id, patch);
  setTimeout(checkAndAlert, 100);
});
ipcMain.handle('todo:delete', (_e, id: number) => deleteTodo(id));

ipcMain.handle('image:saveFromDataURL', (_e, dataUrl: string) => {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('invalid data url');
  const mime = m[1];
  const ext = mime.split('/')[1].replace('jpeg', 'jpg').split('+')[0];
  const buf = Buffer.from(m[2], 'base64');
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filepath = path.join(imagesDir(), name);
  fs.writeFileSync(filepath, buf);
  return `file://${filepath}`;
});

ipcMain.handle('overlay:dismiss', () => { overlayWindow?.hide(); });

// 调试：手动触发催命符
ipcMain.handle('overlay:test', (_e, text: string) => {
  // 测试时模拟一个 25 分钟后到期的 Todo
  const dueAt = Date.now() + 25 * 60 * 1000;
  showOverlayMessage(text || '完成项目周报', dueAt);
});
