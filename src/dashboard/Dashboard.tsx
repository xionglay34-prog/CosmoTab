import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  DedupeMode,
  LastAccessedMap,
  RuntimeMessage,
  RuntimeResponse,
  Settings,
  TabInfo,
  Theme,
} from '../core/types';
import { getSettings, setSettings } from '../core/storage';
import { queryAllTabs } from '../core/tabs';
import Toolbar from './components/Toolbar';
import CardGrid from './components/CardGrid';
import './dashboard.css';

function send<T>(msg: RuntimeMessage): Promise<RuntimeResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp: RuntimeResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(resp);
    });
  });
}

interface UndoState {
  count: number;
  /** Chrome session id list to restore via chrome.sessions.restore */
  sessionIds: string[];
}

export default function Dashboard(): JSX.Element {
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [lastAccessed, setLastAccessed] = useState<LastAccessedMap>({});
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<UndoState | null>(null);

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = async (): Promise<void> => {
    const [s, list, r] = await Promise.all([
      getSettings(),
      queryAllTabs(),
      send<LastAccessedMap>({ type: 'getLastAccessed' }),
    ]);
    setSettingsState(s);
    setTabs(list);
    if (r.ok && r.data) setLastAccessed(r.data);
  };

  useEffect(() => {
    void refresh();
    const handler = (): void => {
      void refresh();
    };
    chrome.tabs.onCreated.addListener(handler);
    chrome.tabs.onRemoved.addListener(handler);
    chrome.tabs.onUpdated.addListener(handler);
    chrome.tabs.onMoved.addListener(handler);
    chrome.tabs.onActivated.addListener(handler);

    // background 写入 lastAccessed → 通过 storage 变化感知，立刻拉新
    const onStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ): void => {
      if (area === 'local' && changes['cosmotab.lastAccessed']) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(onStorageChange);

    // 定时兜底：让相对时间（"5m / 2h"）随时间推进而重渲染
    const tick = setInterval(() => {
      void refresh();
    }, 30_000);

    return () => {
      chrome.tabs.onCreated.removeListener(handler);
      chrome.tabs.onRemoved.removeListener(handler);
      chrome.tabs.onUpdated.removeListener(handler);
      chrome.tabs.onMoved.removeListener(handler);
      chrome.tabs.onActivated.removeListener(handler);
      chrome.storage.onChanged.removeListener(onStorageChange);
      clearInterval(tick);
    };
  }, []);

  // Auto-clear undo toast after 5s.
  useEffect(() => {
    if (!undo) return;
    undoTimerRef.current = setTimeout(() => setUndo(null), 5000);
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [undo]);

  const tabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);
  void tabIds;

  if (!settings) {
    return <div className="cosmo-dash cosmo-dash--loading">加载中…</div>;
  }

  const themeClass = settings.theme === 'dark' ? 'cosmo-dark' : 'cosmo-light';

  const apply = async (patch: Partial<Settings>): Promise<void> => {
    const next = await setSettings(patch);
    setSettingsState(next);
  };

  /** Close tabs with undo support: capture session IDs after Chrome closes them. */
  const closeWithUndo = async (ids: number[]): Promise<void> => {
    if (ids.length === 0) return;
    await chrome.tabs.remove(ids);
    // Sessions API needs a beat to populate.
    await new Promise((r) => setTimeout(r, 60));
    let sessionIds: string[] = [];
    try {
      const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: ids.length });
      sessionIds = sessions
        .map((s) => s.tab?.sessionId)
        .filter((x): x is string => typeof x === 'string')
        .slice(0, ids.length);
    } catch {
      sessionIds = [];
    }
    setUndo({ count: ids.length, sessionIds });
    void refresh();
  };

  const restoreUndo = async (): Promise<void> => {
    if (!undo) return;
    for (const sid of undo.sessionIds) {
      try {
        await chrome.sessions.restore(sid);
      } catch {
        /* ignore individual restore failures */
      }
    }
    setUndo(null);
    void refresh();
  };

  const onOrganize = async (): Promise<void> => {
    setBusy(true);
    setHint('整理中…');
    const r = await send<{ closed: number; grouped: number; groupsCreated: number }>({
      type: 'organizeAll',
      payload: { dedupeMode: settings.dedupeMode, sortScope: settings.sortScope },
    });
    setBusy(false);
    if (r.ok && r.data) {
      setHint(`已关闭重复 ${r.data.closed} 个`);
    } else {
      setHint(`失败：${r.error ?? 'unknown'}`);
    }
    void refresh();
  };

  const onActivate = (tab: TabInfo): void => {
    void chrome.tabs.update(tab.id, { active: true });
    void chrome.windows.update(tab.windowId, { focused: true });
  };

  const onToggleCollapse = (key: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // No more confirm dialog — single source of close action goes straight to undoable close.
  const onClose = (ids: number[]): void => {
    void closeWithUndo(ids);
  };

  const onCloseGroup = (_hostname: string, ids: number[]): void => {
    void closeWithUndo(ids);
  };

  return (
    <div className={`cosmo-dash ${themeClass}`}>
      <Toolbar
        busy={busy}
        hint={hint}
        theme={settings.theme}
        dedupeMode={settings.dedupeMode}
        onTheme={(t: Theme) => void apply({ theme: t })}
        onDedupeMode={(m: DedupeMode) => void apply({ dedupeMode: m })}
        onOrganize={onOrganize}
      />

      <main className="cosmo-dash__main">
        <CardGrid
          tabs={tabs}
          lastAccessed={lastAccessed}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onActivate={onActivate}
          onClose={onClose}
          onCloseGroup={onCloseGroup}
        />
      </main>

      {undo && (
        <div className="cosmo-toast" role="status" aria-live="polite">
          <span className="cosmo-toast__msg">已关闭 {undo.count} 个标签</span>
          {undo.sessionIds.length > 0 && (
            <button className="cosmo-toast__action" onClick={() => void restoreUndo()}>
              撤销
            </button>
          )}
        </div>
      )}
    </div>
  );
}
