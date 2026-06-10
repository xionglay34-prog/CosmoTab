import type { Settings, Whitelist, LastAccessedMap } from './types';

const SETTINGS_KEY = 'cosmotab.settings';
const WHITELIST_KEY = 'cosmotab.whitelist';
const LAST_ACCESSED_KEY = 'cosmotab.lastAccessed';

const DEFAULT_SETTINGS: Settings = {
  dedupeMode: 'loose',
  sortScope: 'perWindow',
  theme: 'light',
};

const DEFAULT_WHITELIST: Whitelist = { urls: [] };

export async function getSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = res[SETTINGS_KEY] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function getWhitelist(): Promise<Whitelist> {
  const res = await chrome.storage.local.get(WHITELIST_KEY);
  const stored = res[WHITELIST_KEY] as Whitelist | undefined;
  return stored ?? DEFAULT_WHITELIST;
}

export async function setWhitelist(wl: Whitelist): Promise<void> {
  await chrome.storage.local.set({ [WHITELIST_KEY]: wl });
}

export async function getLastAccessedMap(): Promise<LastAccessedMap> {
  const res = await chrome.storage.local.get(LAST_ACCESSED_KEY);
  const stored = res[LAST_ACCESSED_KEY] as LastAccessedMap | undefined;
  return stored ?? {};
}

export async function setLastAccessedMap(map: LastAccessedMap): Promise<void> {
  await chrome.storage.local.set({ [LAST_ACCESSED_KEY]: map });
}

export async function updateLastAccessed(tabId: number, ts: number = Date.now()): Promise<void> {
  const map = await getLastAccessedMap();
  map[tabId] = ts;
  await setLastAccessedMap(map);
}

export async function removeLastAccessed(tabId: number): Promise<void> {
  const map = await getLastAccessedMap();
  delete map[tabId];
  await setLastAccessedMap(map);
}
