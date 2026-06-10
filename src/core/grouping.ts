import type { DomainGroup, TabInfo } from './types';

/** Chrome 内置 tab group 颜色集合 */
const CHROME_COLORS: chrome.tabGroups.ColorEnum[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
];

/** 字符串 hash，用来稳定地分配颜色 */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorForHostname(hostname: string): chrome.tabGroups.ColorEnum {
  return CHROME_COLORS[hashStr(hostname) % CHROME_COLORS.length] ?? 'grey';
}

export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname || '(local)';
  } catch {
    return '(other)';
  }
}

export function groupByDomain(tabs: TabInfo[]): DomainGroup[] {
  const buckets = new Map<string, TabInfo[]>();
  for (const t of tabs) {
    const host = safeHostname(t.url);
    let arr = buckets.get(host);
    if (!arr) {
      arr = [];
      buckets.set(host, arr);
    }
    arr.push(t);
  }
  return [...buckets.entries()].map(([hostname, ts]) => ({ hostname, tabs: ts }));
}

/**
 * 把同窗口同域名的 tab 合并到一个 tab group。
 * 至少 2 个 tab 才会建组。返回新增 group 数。
 */
export async function applyTabGroups(windowId: number, groups: DomainGroup[]): Promise<number> {
  let created = 0;
  for (const g of groups) {
    if (g.tabs.length < 2) continue;
    const tabIds = g.tabs.map((t) => t.id);
    try {
      const groupId = await chrome.tabs.group({
        tabIds,
        createProperties: { windowId },
      });
      await chrome.tabGroups.update(groupId, {
        title: g.hostname,
        color: colorForHostname(g.hostname),
        collapsed: false,
      });
      created += 1;
    } catch (e) {
      console.warn('[CosmoTab] group failed for', g.hostname, e);
    }
  }
  return created;
}
