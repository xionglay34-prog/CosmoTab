import { safeHostname } from './grouping';
import type { LastAccessedMap, SortScope, TabInfo } from './types';

export function sortByLastAccessed(
  tabs: TabInfo[],
  lastAccessed: LastAccessedMap,
): TabInfo[] {
  return [...tabs].sort((a, b) => (lastAccessed[b.id] ?? 0) - (lastAccessed[a.id] ?? 0));
}

/**
 * 把同域名的 tab 物理排在一起，同时整体按"最近访问"优先：
 * 1) 按 hostname 分簇
 * 2) 簇之间：按簇内最大 lastAccessed 降序（最近用过的域名排前）
 * 3) 簇之内：按 lastAccessed 降序
 */
export function clusterByDomain(
  tabs: TabInfo[],
  lastAccessed: LastAccessedMap,
): TabInfo[] {
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
  const clusters = [...buckets.values()].map((arr) => sortByLastAccessed(arr, lastAccessed));
  clusters.sort((a, b) => {
    const am = Math.max(...a.map((t) => lastAccessed[t.id] ?? 0));
    const bm = Math.max(...b.map((t) => lastAccessed[t.id] ?? 0));
    return bm - am;
  });
  return clusters.flat();
}

/**
 * 根据 scope 把 tab 移动到正确顺序。
 * - perWindow：每个窗口内独立排序。
 * - merged：所有非 pinned tab 合并按全局顺序排序。
 *
 * 排序结果：同域名 tab 紧贴在一起，整体按最近访问的域名优先。
 */
export async function applySort(
  scope: SortScope,
  tabs: TabInfo[],
  lastAccessed: LastAccessedMap,
): Promise<void> {
  if (scope === 'perWindow') {
    const byWin = new Map<number, TabInfo[]>();
    for (const t of tabs) {
      let arr = byWin.get(t.windowId);
      if (!arr) {
        arr = [];
        byWin.set(t.windowId, arr);
      }
      arr.push(t);
    }
    for (const [, arr] of byWin) {
      const sorted = clusterByDomain(arr, lastAccessed);
      for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        if (!t) continue;
        try {
          await chrome.tabs.move(t.id, { index: i });
        } catch (e) {
          console.warn('[CosmoTab] move failed', t.id, e);
        }
      }
    }
    return;
  }

  // merged: 把所有 tab 合并到第一个窗口，并按全局顺序排列
  const sorted = clusterByDomain(tabs, lastAccessed);
  const firstWin = sorted[0]?.windowId;
  if (firstWin == null) return;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (!t) continue;
    try {
      await chrome.tabs.move(t.id, { windowId: firstWin, index: i });
    } catch (e) {
      console.warn('[CosmoTab] move(merged) failed', t.id, e);
    }
  }
}
