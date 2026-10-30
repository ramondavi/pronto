export type AuthorityQueryGroup = { include: string[]; exclude: string[] };

/** AND binds within each OR group. Quotes keep a phrase together; NOT excludes the next term. */
export function parseAuthorityQuery(input: string): AuthorityQueryGroup[] {
  const tokens = input.slice(0, 200).match(/"[^"]+"|\b(?:AND|OR|NOT)\b|[^\s"]+/gi) ?? [];
  if (!tokens.length) return [];
  const groups: AuthorityQueryGroup[] = [{ include: [], exclude: [] }];
  let negate = false;
  for (const token of tokens.slice(0, 24)) {
    const upper = token.toUpperCase();
    if (upper === "AND") continue;
    if (upper === "OR") {
      if (groups.length < 8 && (groups.at(-1)!.include.length || groups.at(-1)!.exclude.length)) groups.push({ include: [], exclude: [] });
      negate = false;
      continue;
    }
    if (upper === "NOT") { negate = true; continue; }
    const value = token.replace(/^"|"$/g, "").trim();
    if (!value) continue;
    const group = groups.at(-1)!;
    (negate ? group.exclude : group.include).push(value.slice(0, 80));
    negate = false;
  }
  return groups.filter((group) => group.include.length || group.exclude.length);
}

export const authoritySources = ["all", "bn", "aat", "ufba", "pergamum", "loc", "pronto"] as const;
export const authorityHeadingTypes = ["all", "topic", "geographic", "personal", "corporate", "title"] as const;
export const authoritySorts = ["relevance", "az", "za", "recent", "source"] as const;
export const authorityLanguages = ["all", "pt", "en", "es", "de", "fr", "it"] as const;
export const authorityRelations = ["all", "broader", "narrower", "related"] as const;

export function authoritySearchOption<T extends readonly string[]>(value: string | undefined, allowed: T, fallback: T[number]): T[number] {
  return value && allowed.includes(value) ? value : fallback;
}
