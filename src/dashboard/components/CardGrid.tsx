import { useMemo } from 'react';
import type { LastAccessedMap, TabInfo } from '../../core/types';
import { groupByDomain, safeHostname } from '../../core/grouping';

interface Props {
  tabs: TabInfo[];
  lastAccessed: LastAccessedMap;
  collapsed: Set<string>;
  onToggleCollapse: (key: string) => void;
  onActivate: (tab: TabInfo) => void;
  onClose: (ids: number[]) => void;
  onCloseGroup: (hostname: string, ids: number[]) => void;
}

function faviconUrl(url: string): string {
  try {
    const u = new URL(chrome.runtime.getURL('/_favicon/'));
    u.searchParams.set('pageUrl', url);
    u.searchParams.set('size', '32');
    return u.toString();
  } catch {
    return '';
  }
}

function formatAgo(ts: number | undefined): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(ts).toISOString().slice(0, 10);
}

function freshness(ts: number | undefined): number {
  if (!ts) return 0;
  const diff = Date.now() - ts;
  if (diff <= 30 * 60_000) return 1;
  if (diff >= 24 * 3_600_000) return 0;
  return 1 - (diff - 30 * 60_000) / (24 * 3_600_000 - 30 * 60_000);
}

/** Stable hash → 0..359 hue, derived from hostname. Same domain → same drift. */
function hueFromHostname(host: string): number {
  let h = 0;
  for (let i = 0; i < host.length; i++) {
    h = (h * 31 + host.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/** Stable saturation jitter — 35..65 — derived from hostname. */
function satFromHostname(host: string): number {
  let h = 0;
  for (let i = 0; i < host.length; i++) {
    h = (h * 17 + host.charCodeAt(i) * 7) >>> 0;
  }
  return 35 + (h % 30);
}

function ChevronDown(): JSX.Element {
  return (
    <svg className="cosmo-section__chevron" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M3 4.5 L6 7.5 L9 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function CloseGlyph(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M3 3 L9 9 M9 3 L3 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A small hand-drawn 4-point sparkle. */
function Sparkle({ className }: { className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 1.5 C8.4 5.2 9.8 6.6 13.5 7 C9.8 7.4 8.4 8.8 8 12.5 C7.6 8.8 6.2 7.4 2.5 7 C6.2 6.6 7.6 5.2 8 1.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** A wavy hand-drawn squiggle — used in the summary row. */
function Squiggle(): JSX.Element {
  return (
    <svg
      className="cosmo-doodle"
      width="36"
      height="6"
      viewBox="0 0 36 6"
      aria-hidden
    >
      <path
        d="M1 3 Q 5 0, 9 3 T 17 3 T 25 3 T 33 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}

/** Friendly empty-state doodle: a sleeping tab. */
function ZzzDoodle(): JSX.Element {
  return (
    <svg
      className="cosmo-empty__doodle"
      width="56"
      height="48"
      viewBox="0 0 64 56"
      aria-hidden
    >
      <path
        d="M8 18 L8 46 L56 46 L56 18 L48 18 L44 12 L20 12 L16 18 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="3 2"
      />
      <path
        d="M40 6 L48 6 L40 14 L48 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M52 2 L58 2 L52 8 L58 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

interface RowProps {
  tab: TabInfo;
  ts: number | undefined;
  active: boolean;
  showHost: boolean;
  onActivate: () => void;
  onClose: () => void;
}

function Row({ tab, ts, active, showHost, onActivate, onClose }: RowProps): JSX.Element {
  const stale = freshness(ts) < 0.05 ? '1' : '0';
  return (
    <div
      className="cosmo-row"
      data-active={active ? '1' : '0'}
      data-stale={stale}
      data-show-host={showHost ? '1' : '0'}
      onClick={onActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onActivate();
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <img className="cosmo-row__fav" src={faviconUrl(tab.url)} alt="" />
      <span className="cosmo-row__title" title={tab.url}>{tab.title || tab.url}</span>
      {showHost && <span className="cosmo-row__host">{safeHostname(tab.url)}</span>}
      <span className="cosmo-row__time">{formatAgo(ts)}</span>
      <button
        className="cosmo-row__close"
        aria-label="关闭此标签页"
        title="关闭此标签页 (Backspace)"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <CloseGlyph />
      </button>
    </div>
  );
}

export default function CardGrid({
  tabs,
  lastAccessed,
  collapsed,
  onToggleCollapse,
  onActivate,
  onClose,
  onCloseGroup,
}: Props): JSX.Element {
  const groups = useMemo(() => {
    return groupByDomain(tabs)
      .map((g) => {
        const sorted = [...g.tabs].sort(
          (a, b) => (lastAccessed[b.id] ?? 0) - (lastAccessed[a.id] ?? 0),
        );
        const hottest = lastAccessed[sorted[0]?.id ?? -1] ?? 0;
        return { ...g, tabs: sorted, hottest };
      })
      .sort((a, b) => b.hottest - a.hottest);
  }, [tabs, lastAccessed]);

  const recent = useMemo(() => {
    return [...tabs]
      .filter((t) => (lastAccessed[t.id] ?? 0) > 0)
      .sort((a, b) => (lastAccessed[b.id] ?? 0) - (lastAccessed[a.id] ?? 0))
      .slice(0, 8);
  }, [tabs, lastAccessed]);

  const totalDomains = groups.length;
  const totalTabs = tabs.length;

  if (tabs.length === 0) {
    return (
      <div className="cosmo-empty">
        <ZzzDoodle />
        <span className="cosmo-empty__title">浏览器很安静</span>
        <span className="cosmo-empty__hint">什么都没打开 — 这一刻属于你 ✿</span>
      </div>
    );
  }

  const recentCollapsed = collapsed.has('__recent__');

  const recentLabel = (() => {
    const top = recent[0];
    if (!top) return '时间倒序';
    const ago = Date.now() - (lastAccessed[top.id] ?? 0);
    if (ago < 60_000) return '你刚刚还在看';
    if (ago < 600_000) return '不久前路过';
    return '最近的足迹';
  })();

  return (
    <div className="cosmo-list">
      <div className="cosmo-list__summary">
        <span>
          {totalTabs} tabs · {totalDomains} domains
        </span>
        <Squiggle />
      </div>

      {recent.length > 0 && (
        <section
          className="cosmo-section cosmo-section--recent"
          data-collapsed={recentCollapsed ? '1' : '0'}
        >
          <div
            className="cosmo-section__head"
            onClick={() => onToggleCollapse('__recent__')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleCollapse('__recent__');
              }
            }}
          >
            <ChevronDown />
            <Sparkle className="cosmo-section__sparkle" />
            <span className="cosmo-section__title">Recent</span>
            <span className="cosmo-section__count">{recent.length}</span>
            <span className="cosmo-section__time">{recentLabel}</span>
          </div>
          {!recentCollapsed && (
            <div className="cosmo-section__body">
              {recent.map((t) => (
                <Row
                  key={`recent-${t.id}`}
                  tab={t}
                  ts={lastAccessed[t.id]}
                  active={false}
                  showHost
                  onActivate={() => onActivate(t)}
                  onClose={() => onClose([t.id])}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {groups.map((g) => {
        const isCollapsed = collapsed.has(g.hostname);
        const top = g.tabs[0];
        const hue = hueFromHostname(g.hostname);
        const sat = satFromHostname(g.hostname);
        const headStyle = {
          ['--section-hue' as string]: String(hue),
          ['--section-sat' as string]: `${sat}%`,
        } as React.CSSProperties;
        return (
          <section
            className="cosmo-section"
            key={g.hostname}
            data-collapsed={isCollapsed ? '1' : '0'}
          >
            <div
              className="cosmo-section__head"
              style={headStyle}
              onClick={() => onToggleCollapse(g.hostname)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleCollapse(g.hostname);
                }
              }}
            >
              <ChevronDown />
              <img className="cosmo-section__fav" src={faviconUrl(top?.url ?? '')} alt="" />
              <span className="cosmo-section__title">{g.hostname}</span>
              <span className="cosmo-section__count">{g.tabs.length}</span>
              <span className="cosmo-section__time">{formatAgo(g.hottest)}</span>
              <div className="cosmo-section__actions">
                <button
                  className="cosmo-section__action"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseGroup(g.hostname, g.tabs.map((t) => t.id));
                  }}
                >
                  关闭整组
                </button>
              </div>
            </div>
            {!isCollapsed && (
              <div className="cosmo-section__body">
                {g.tabs.map((t) => (
                  <Row
                    key={t.id}
                    tab={t}
                    ts={lastAccessed[t.id]}
                    active={false}
                    showHost={false}
                    onActivate={() => onActivate(t)}
                    onClose={() => onClose([t.id])}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
