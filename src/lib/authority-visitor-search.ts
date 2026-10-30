export type VisitorSearch = { query: string; count: number; lastUsed: number };
const key = "pronto-public-authority-searches-v1";

export function readVisitorSearches(): VisitorSearch[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is VisitorSearch => !!item && typeof item === "object" &&
      typeof item.query === "string" && item.query.length <= 200 &&
      Number.isSafeInteger(item.count) && item.count > 0 &&
      typeof item.lastUsed === "number" && Number.isFinite(item.lastUsed)).slice(0, 20);
  } catch { return []; }
}

export function rememberVisitorSearch(query: string): VisitorSearch[] {
  const clean = query.trim().slice(0, 200);
  if (!clean) return readVisitorSearches();
  const searches = readVisitorSearches();
  const existing = searches.find((item) => item.query.toLocaleLowerCase() === clean.toLocaleLowerCase());
  const next = [{ query: clean, count: (existing?.count ?? 0) + 1, lastUsed: Date.now() },
    ...searches.filter((item) => item !== existing)].slice(0, 20);
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  return next;
}

export function clearVisitorSearches() {
  try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}
