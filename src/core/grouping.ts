import type { DomainGroup, TabInfo } from './types';

/** 彩色组用的淡色系（避开 red/yellow/green 这种高饱和、grey 留给「其他」） */
const CHROME_COLORS: chrome.tabGroups.ColorEnum[] = [
  'blue',
  'cyan',
  'pink',
  'purple',
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

/**
 * 把 hostname 简化成 group 标题用的短名称：
 *   aidp.bytedance.net          → aidp        ← 取首段
 *   neeko-aidp.bytedance.net    → neeko       ← 含连字符时取 '-' 前
 *   meego.larkoffice.com        → meego       ← 取首段
 *   bytedance.larkoffice.com    → lark        ← 首段是租户名时回退到根域，再过别名表
 *   www.notion.so               → notion      ← 跳过 www 同理
 *   github.com                  → github
 *   localhost / (local)         → 原样
 *   IP                          → 原样
 */

/** 首段不是真正业务、需要跳过的"租户/占位"段 */
const TENANT_PREFIXES = new Set(['www', 'bytedance']);

/** 根域别名：当回退到 SLD 时把它映射成更熟悉/更短的名称 */
const DOMAIN_ALIAS: Record<string, string> = {
  larkoffice: 'lark',
};

/** 常见 ccTLD 二级后缀（用来识别 SLD 位置） */
const CC_SECOND = new Set(['co', 'com', 'net', 'org', 'gov', 'edu', 'ac']);

export function shortDomainLabel(hostname: string): string {
  if (!hostname || hostname.startsWith('(')) return hostname;
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return hostname;
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length === 0) return hostname;
  if (parts.length === 1) return parts[0] ?? hostname;

  // 1) 取首段，去掉 '-' 后缀（neeko-aidp → neeko）
  let first = parts[0] ?? '';
  const dashIdx = first.indexOf('-');
  if (dashIdx > 0) first = first.slice(0, dashIdx);

  // 2) 首段是占位/租户名（www / bytedance ...）→ 回退到 SLD
  if (TENANT_PREFIXES.has(first.toLowerCase())) {
    let idx = parts.length - 2;
    if (parts.length >= 3 && CC_SECOND.has(parts[parts.length - 2] ?? '')) {
      idx = parts.length - 3;
    }
    const sld = (parts[idx] ?? hostname).toLowerCase();
    return DOMAIN_ALIAS[sld] ?? sld;
  }

  // 3) 否则用首段；首段也允许走别名表
  const lower = first.toLowerCase();
  return DOMAIN_ALIAS[lower] ?? lower;
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
 * 把同窗口同域名的 tab 合并到一个 tab group：
 * - 同域名 ≥ 2 个：建一个有颜色的 group，标题为 shortDomainLabel(hostname)
 * - 同域名 < 2 个的零散 tab：保持散落（不建「其他」组）
 *
 * 关键：先把本轮所有 tab 从旧 group 中 ungroup，再统一建新组——
 * 否则 chrome.tabs.group() 不带 groupId 时每次都建新组，会出现同名组重复并排。
 *
 * 返回本轮新增的 group 数。
 */
export async function applyTabGroups(windowId: number, groups: DomainGroup[]): Promise<number> {
  // 0) 把本轮参与整理的所有 tab 先 ungroup 干净（旧组会因失去成员被 Chrome 自动销毁）
  const allIds: number[] = [];
  for (const g of groups) {
    for (const t of g.tabs) {
      if (t.groupId !== -1) allIds.push(t.id);
    }
  }
  if (allIds.length > 0) {
    try {
      await chrome.tabs.ungroup(allIds);
    } catch (e) {
      console.warn('[CosmoTab] ungroup before regroup failed', e);
    }
  }

  // 1) 同域名 ≥ 2 个 → 建彩色组；< 2 个保持散落
  let created = 0;
  const multi = groups.filter((g) => g.tabs.length >= 2);
  for (const g of multi) {
    const tabIds = g.tabs.map((t) => t.id);
    try {
      const groupId = await chrome.tabs.group({
        tabIds,
        createProperties: { windowId },
      });
      await chrome.tabGroups.update(groupId, {
        title: shortDomainLabel(g.hostname),
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
