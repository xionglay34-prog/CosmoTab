// 核心类型定义

export interface TabInfo {
  id: number;
  windowId: number;
  url: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
  groupId: number;
  index: number;
}

export interface DomainGroup {
  hostname: string;
  tabs: TabInfo[];
}

export type SortMode = 'lastAccessed' | 'domain';
export type SortScope = 'perWindow' | 'merged';
export type DedupeMode = 'strict' | 'loose' | 'domain';
export type Theme = 'light' | 'dark';

export interface Settings {
  dedupeMode: DedupeMode;
  sortScope: SortScope;
  theme: Theme;
}

export interface Whitelist {
  /** 用户手动锁定不参与整理的 url 列表 */
  urls: string[];
}

export interface OrganizeSummary {
  closed: number;
  grouped: number;
  groupsCreated: number;
}

export type LastAccessedMap = Record<number, number>;

export type RuntimeMessage =
  | { type: 'getLastAccessed' }
  | { type: 'organizeAll'; payload: { dedupeMode: DedupeMode; sortScope: SortScope } }
  | { type: 'dedupeOnly'; payload: { dedupeMode: DedupeMode } }
  | { type: 'sortOnly'; payload: { sortScope: SortScope } }
  | { type: 'groupOnly' };

export interface RuntimeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
