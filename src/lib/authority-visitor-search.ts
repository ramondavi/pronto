export type VisitorSearchFilters = { source: string; heading: string; sort: string; language: string; relation: string };
export type VisitorSearch = { query: string; count: number; lastUsed: number; filters?: VisitorSearchFilters };
const key = "pronto-public-authority-searches-v1";

export function readVisitorSearches(): VisitorSearch[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is VisitorSearch => !!item && typeof item === "object" &&
      typeof item.query === "string" && item.query.length <= 200 &&
      Number.isSafeInteger(item.count) && item.count > 0 &&
      typeof item.lastUsed === "number" && Number.isFinite(item.lastUsed) &&
      (!item.filters || (typeof item.filters === "object" &&
        ["source", "heading", "sort", "language", "relation"].every((key) => {
          const value = item.filters?.[key as keyof VisitorSearchFilters];
          return typeof value === "string" && value.length <= 40;
        })))).slice(0, 20);
  } catch { return []; }
}

export function rememberVisitorSearch(query: string, filters?: VisitorSearchFilters): VisitorSearch[] {
  const clean = query.trim().slice(0, 200);
  if (!clean && (!filters || (filters.source === "all" && filters.heading === "all" && filters.language === "all" && filters.relation === "all" && filters.sort === "relevance"))) return readVisitorSearches();
  const searches = readVisitorSearches();
  const sameSearch = (item: VisitorSearch) => item.query.toLocaleLowerCase() === clean.toLocaleLowerCase() && JSON.stringify(item.filters ?? null) === JSON.stringify(filters ?? null);
  const existing = searches.find(sameSearch);
  const next = [{ query: clean, filters, count: (existing?.count ?? 0) + 1, lastUsed: Date.now() },
    ...searches.filter((item) => item !== existing)].slice(0, 20);
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  return next;
}

export function clearVisitorSearches() {
  try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}
