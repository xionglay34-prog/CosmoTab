import { useEffect, useMemo, useState } from 'react';
import type {
  DedupeMode,
  RuntimeMessage,
  RuntimeResponse,
  Settings,
  Theme,
} from '../core/types';
import { getSettings, setSettings } from '../core/storage';

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

interface Stats {
  tabs: number;
  windows: number;
  domains: number;
}

export default function Popup(): JSX.Element {
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats>({ tabs: 0, windows: 0, domains: 0 });
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string>('');

  useEffect(() => {
    void (async () => {
      const s = await getSettings();
      setSettingsState(s);
      const tabs = await chrome.tabs.query({});
      const windows = new Set<number>();
      const domains = new Set<string>();
      for (const t of tabs) {
        if (t.windowId != null) windows.add(t.windowId);
        try {
          if (t.url) domains.add(new URL(t.url).hostname);
        } catch {
          // ignore
        }
      }
      setStats({ tabs: tabs.length, windows: windows.size, domains: domains.size });
    })();
  }, []);

  const apply = async (patch: Partial<Settings>) => {
    const next = await setSettings(patch);
    setSettingsState(next);
  };

  const themeClass = useMemo(
    () => (settings?.theme === 'dark' ? 'cosmo-dark' : 'cosmo-light'),
    [settings?.theme],
  );

  if (!settings) {
    return <div className="cosmo-popup">加载中…</div>;
  }

  const onOrganize = async () => {
    setBusy(true);
    setHint('整理中…');
    const r = await send<{ closed: number; grouped: number; groupsCreated: number }>({
      type: 'organizeAll',
      payload: { dedupeMode: settings.dedupeMode, sortScope: settings.sortScope },
    });
    setBusy(false);
    if (r.ok && r.data) {
      setHint(`关闭 ${r.data.closed} · 归类 ${r.data.grouped} · 新建组 ${r.data.groupsCreated}`);
    } else {
      setHint(`失败：${r.error ?? 'unknown'}`);
    }
  };

  const onDedupe = async () => {
    setBusy(true);
    setHint('去重中…');
    const r = await send<{ closed: number }>({
      type: 'dedupeOnly',
      payload: { dedupeMode: settings.dedupeMode },
    });
    setBusy(false);
    if (r.ok && r.data) setHint(`关闭重复 ${r.data.closed} 个`);
    else setHint(`失败：${r.error ?? 'unknown'}`);
  };

  const onSort = async () => {
    setBusy(true);
    setHint('排序中…');
    const r = await send({
      type: 'sortOnly',
      payload: { sortScope: settings.sortScope },
    });
    setBusy(false);
    setHint(r.ok ? '排序完成' : `失败：${r.error ?? 'unknown'}`);
  };

  const openDashboard = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  };

  return (
    <div className={`cosmo-popup ${themeClass}`}>
      <header className="cosmo-popup__header">
        <h1>CosmoTab</h1>
        <span className="cosmo-popup__sub">把标签页变成宇宙</span>
      </header>

      <section className="cosmo-popup__stats">
        <div><strong>{stats.tabs}</strong><span>标签</span></div>
        <div><strong>{stats.windows}</strong><span>窗口</span></div>
        <div><strong>{stats.domains}</strong><span>域名</span></div>
      </section>

      <section className="cosmo-popup__actions">
        <button disabled={busy} onClick={onOrganize} className="primary">一键整理</button>
        <button disabled={busy} onClick={onDedupe}>去重</button>
        <button disabled={busy} onClick={onSort}>排序</button>
      </section>

      <section className="cosmo-popup__row">
        <label>去重模式</label>
        <select
          value={settings.dedupeMode}
          onChange={(e) => void apply({ dedupeMode: e.target.value as DedupeMode })}
        >
          <option value="strict">严格</option>
          <option value="loose">宽松</option>
        </select>
      </section>

      <section className="cosmo-popup__row">
        <label>主题</label>
        <select
          value={settings.theme}
          onChange={(e) => void apply({ theme: e.target.value as Theme })}
        >
          <option value="light">明亮</option>
          <option value="dark">深空</option>
        </select>
      </section>

      <button className="cosmo-popup__open" onClick={openDashboard}>
        打开宇宙视图 →
      </button>

      {hint && <div className="cosmo-popup__hint">{hint}</div>}
    </div>
  );
}
