import {
  dedupeOnly,
  groupOnly,
  organizeAll,
  sortOnly,
} from '../core/tabs';
import {
  getLastAccessedMap,
  removeLastAccessed,
  setLastAccessedMap,
  updateLastAccessed,
} from '../core/storage';
import type { RuntimeMessage, RuntimeResponse } from '../core/types';

// 维护 lastAccessed
chrome.tabs.onActivated.addListener(({ tabId }) => {
  void updateLastAccessed(tabId);
});

// 让点击插件图标 = 打开侧边栏（不再弹 popup）
chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id != null) void updateLastAccessed(tab.id);
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  // 只在用户真正激活/导航时更新；纯 status:complete 不更新（避免自动刷新页面被算成"刚刚访问"）
  if (info.url) {
    void updateLastAccessed(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void removeLastAccessed(tabId);
});

/**
 * 仅为缺失时间戳的 tab 兜底：
 * - 优先使用 Chrome 121+ 提供的 tab.lastAccessed（毫秒精度的真实时间）
 * - 否则按 tab 索引错开兜底（避免全部并列"刚刚"）
 * - 已有时间戳的 tab 一律保留，不覆盖
 */
async function bootstrapLastAccessed(): Promise<void> {
  const [tabs, existing] = await Promise.all([
    chrome.tabs.query({}),
    getLastAccessedMap(),
  ]);
  const next = { ...existing };
  const now = Date.now();
  let touched = false;
  // 按 index 倒序：越靠右假设越"旧"（仅为兜底，体感上比统一 now 更合理）
  const ordered = [...tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  ordered.forEach((t, i) => {
    if (t.id == null) return;
    if (next[t.id]) return; // 保留已有
    const real = (t as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed;
    if (typeof real === 'number' && real > 0) {
      next[t.id] = real;
    } else {
      // 错开 1 秒，避免被一锅端识别为"刚刚"
      next[t.id] = now - i * 1000;
    }
    touched = true;
  });
  if (touched) await setLastAccessedMap(next);
}

chrome.runtime.onStartup.addListener(() => {
  void bootstrapLastAccessed();
});

chrome.runtime.onInstalled.addListener(() => {
  void bootstrapLastAccessed();
});

// 消息桥
chrome.runtime.onMessage.addListener(
  (msg: RuntimeMessage, _sender, sendResponse: (r: RuntimeResponse) => void) => {
    (async () => {
      try {
        switch (msg.type) {
          case 'getLastAccessed': {
            const map = await getLastAccessedMap();
            sendResponse({ ok: true, data: map });
            return;
          }
          case 'organizeAll': {
            const summary = await organizeAll(msg.payload);
            sendResponse({ ok: true, data: summary });
            return;
          }
          case 'dedupeOnly': {
            const n = await dedupeOnly(msg.payload.dedupeMode);
            sendResponse({ ok: true, data: { closed: n } });
            return;
          }
          case 'sortOnly': {
            await sortOnly(msg.payload.sortScope);
            sendResponse({ ok: true });
            return;
          }
          case 'groupOnly': {
            const n = await groupOnly();
            sendResponse({ ok: true, data: { groupsCreated: n } });
            return;
          }
          default: {
            sendResponse({ ok: false, error: 'unknown message' });
          }
        }
      } catch (e) {
        sendResponse({ ok: false, error: (e as Error).message });
      }
    })();
    return true; // 异步响应
  },
);
