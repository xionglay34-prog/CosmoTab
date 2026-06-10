import type { DedupeMode, LastAccessedMap, TabInfo } from './types';

/**
 * 宽松模式下需要剔除的"营销/追踪/会话"类参数。
 * - 完整名单匹配：如 utm_source、fbclid 等
 * - 前缀匹配：以 utm_、_hs 开头的全部剔除
 */
const TRACKING_PARAM_EXACT = new Set<string>([
  // Google / 通用
  'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  // Facebook / Meta
  'fbclid',
  // Microsoft / Bing
  'msclkid',
  // Yandex
  'yclid',
  // Mailchimp
  'mc_cid', 'mc_eid',
  // 其它常见
  'ref', 'ref_src', 'ref_url', 'referrer',
  'igshid', 'icid', 'trk', 'trkCampaign',
  // 中文站常见
  'spm', 'scm', 'from', 'share_token', 'share_from', 'share_source',
  'weibo_id', 'sourceFrom',
]);

const TRACKING_PARAM_PREFIX = ['utm_', '_hs', 'hsa_', 'mkt_', 'pk_'];

function isTrackingParam(name: string): boolean {
  if (TRACKING_PARAM_EXACT.has(name)) return true;
  for (const p of TRACKING_PARAM_PREFIX) {
    if (name.startsWith(p)) return true;
  }
  return false;
}

/** 把 URL 规范化：去 hash、去追踪参数、按 key 排序、去掉末尾多余斜杠（根路径除外）。 */
function normalizeLoose(url: string): string {
  const u = new URL(url);
  // 去 hash
  u.hash = '';
  // 过滤追踪参数
  const keep: [string, string][] = [];
  for (const [k, v] of u.searchParams.entries()) {
    if (!isTrackingParam(k)) keep.push([k, v]);
  }
  // 排序，避免 ?a=1&b=2 与 ?b=2&a=1 被误判为不同
  keep.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const sp = new URLSearchParams();
  for (const [k, v] of keep) sp.append(k, v);
  const qs = sp.toString();
  // pathname 末尾斜杠归一化（只对非根路径）
  let path = u.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return `${u.origin}${path}${qs ? `?${qs}` : ''}`;
}

function keyOf(url: string, mode: DedupeMode): string {
  if (mode === 'strict') return url;
  if (mode === 'domain') {
    // 整域聚合：同 hostname 的 tab 都视为重复（保留最近访问的）
    try {
      return `__host__:${new URL(url).hostname}`;
    } catch {
      return `__host__:${url}`;
    }
  }
  try {
    return normalizeLoose(url);
  } catch {
    return url;
  }
}

/**
 * 去重，返回需要关闭的 tabId 数组。
 * 在重复组中保留 lastAccessed 最大者。
 */
export function dedupe(
  tabs: TabInfo[],
  mode: DedupeMode,
  lastAccessed: LastAccessedMap,
): number[] {
  const buckets = new Map<string, TabInfo[]>();
  for (const t of tabs) {
    const k = keyOf(t.url, mode);
    let arr = buckets.get(k);
    if (!arr) {
      arr = [];
      buckets.set(k, arr);
    }
    arr.push(t);
  }
  const toClose: number[] = [];
  for (const arr of buckets.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => (lastAccessed[b.id] ?? 0) - (lastAccessed[a.id] ?? 0));
    for (let i = 1; i < arr.length; i++) {
      const tab = arr[i];
      if (tab) toClose.push(tab.id);
    }
  }
  return toClose;
}

