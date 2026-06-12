import { dedupe } from './dedupe';
import { applyTabGroups, groupByDomain } from './grouping';
import { applySort } from './sort';
import { getLastAccessedMap, getWhitelist } from './storage';
import type {
  DedupeMode,
  OrganizeSummary,
  SortScope,
  TabInfo,
} from './types';

/** 把 chrome.tabs.Tab 转成内部 TabInfo */
export function toTabInfo(t: chrome.tabs.Tab): TabInfo | null {
  if (t.id == null || t.url == null || t.windowId == null) return null;
  return {
    id: t.id,
    windowId: t.windowId,
    url: t.url,
    title: t.title ?? '',
    favIconUrl: t.favIconUrl,
    pinned: t.pinned ?? false,
    groupId: t.groupId ?? -1,
    index: t.index,
  };
}

export async function queryAllTabs(): Promise<TabInfo[]> {
  const all = await chrome.tabs.query({});
  const list: TabInfo[] = [];
  for (const t of all) {
    const info = toTabInfo(t);
    if (info) list.push(info);
  }
  return list;
}

/** 跳过 pinned 与白名单 url */
function filterEligible(tabs: TabInfo[], whitelistUrls: Set<string>): TabInfo[] {
  return tabs.filter((t) => !t.pinned && !whitelistUrls.has(t.url));
}

export async function organizeAll(opts: {
  dedupeMode: DedupeMode;
  sortScope: SortScope;
}): Promise<OrganizeSummary> {
  const [allTabs, lastAccessed, wl] = await Promise.all([
    queryAllTabs(),
    getLastAccessedMap(),
    getWhitelist(),
  ]);
  const wlSet = new Set(wl.urls);
  const eligible = filterEligible(allTabs, wlSet);

  // 1) dedupe
  const toClose = dedupe(eligible, opts.dedupeMode, lastAccessed);
  if (toClose.length > 0) {
    try {
      await chrome.tabs.remove(toClose);
    } catch (e) {
      console.warn('[CosmoTab] remove failed', e);
    }
  }

  // 2) refresh tabs after dedupe
  const remainingAll = await queryAllTabs();
  const remaining = filterEligible(remainingAll, wlSet);

  // 3) sort first — by lastAccessed. Doing this before grouping avoids
  //    chrome.tabs.move() inserting an unrelated tab between two same-domain
  //    tabs that already share a group (which Chrome would auto-add to that
  //    group). After sort, grouping pulls same-domain tabs adjacent without
  //    contaminating other tabs.
  await applySort(opts.sortScope, remaining, lastAccessed);

  // 4) group within each window (re-query because sort moved things around)
  const refreshed = await queryAllTabs();
  const refreshedEligible = filterEligible(refreshed, wlSet);
  let groupsCreated = 0;
  let grouped = 0;
  const byWin = new Map<number, TabInfo[]>();
  for (const t of refreshedEligible) {
    let arr = byWin.get(t.windowId);
    if (!arr) {
      arr = [];
      byWin.set(t.windowId, arr);
    }
    arr.push(t);
  }
  for (const [winId, arr] of byWin) {
    const groups = groupByDomain(arr);
    grouped += groups
      .filter((g) => g.tabs.length >= 2)
      .reduce((acc, g) => acc + g.tabs.length, 0);
    groupsCreated += await applyTabGroups(winId, groups);
  }

  return {
    closed: toClose.length,
    grouped,
    groupsCreated,
  };
}

export async function dedupeOnly(mode: DedupeMode): Promise<number> {
  const [allTabs, lastAccessed, wl] = await Promise.all([
    queryAllTabs(),
    getLastAccessedMap(),
    getWhitelist(),
  ]);
  const wlSet = new Set(wl.urls);
  const eligible = filterEligible(allTabs, wlSet);
  const toClose = dedupe(eligible, mode, lastAccessed);
  if (toClose.length > 0) {
    try {
      await chrome.tabs.remove(toClose);
    } catch (e) {
      console.warn('[CosmoTab] remove failed', e);
    }
  }
  return toClose.length;
}

export async function sortOnly(scope: SortScope): Promise<void> {
  const [allTabs, lastAccessed, wl] = await Promise.all([
    queryAllTabs(),
    getLastAccessedMap(),
    getWhitelist(),
  ]);
  const wlSet = new Set(wl.urls);
  await applySort(scope, filterEligible(allTabs, wlSet), lastAccessed);
}

export async function groupOnly(): Promise<number> {
  const [allTabs, wl] = await Promise.all([queryAllTabs(), getWhitelist()]);
  const wlSet = new Set(wl.urls);
  const eligible = filterEligible(allTabs, wlSet);
  const byWin = new Map<number, TabInfo[]>();
  for (const t of eligible) {
    let arr = byWin.get(t.windowId);
    if (!arr) {
      arr = [];
      byWin.set(t.windowId, arr);
    }
    arr.push(t);
  }
  let created = 0;
  for (const [winId, arr] of byWin) {
    const groups = groupByDomain(arr);
    created += await applyTabGroups(winId, groups);
  }
  return created;
}
