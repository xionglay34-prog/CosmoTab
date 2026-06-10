import type { LastAccessedMap, SortScope, TabInfo } from './types';

export function sortByLastAccessed(
  tabs: TabInfo[],
  lastAccessed: LastAccessedMap,
): TabInfo[] {
  return [...tabs].sort((a, b) => (lastAccessed[b.id] ?? 0) - (lastAccessed[a.id] ?? 0));
}

/**
 * 根据 scope 把 tab 移动到正确顺序。
 * - perWindow：每个窗口内独立排序。
 * - merged：所有非 pinned tab 合并按全局顺序排序。
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
      const sorted = sortByLastAccessed(arr, lastAccessed);
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
  const sorted = sortByLastAccessed(tabs, lastAccessed);
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
