export type CutterSuggestion = { prefix: string; code: string };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/gi, "").toLocaleLowerCase("en-US");
}

export function authorSurname(authorizedName: string) {
  return authorizedName.split(",")[0]?.trim() ?? "";
}

export function findCutterSuggestions(table: Record<string, number>, authorizedName: string) {
  const surname = normalize(authorSurname(authorizedName));
  if (surname.length < 2) return [];
  return Object.entries(table)
    .filter(([prefix]) => {
      const normalizedPrefix = normalize(prefix);
      return normalizedPrefix[0] === surname[0] && normalizedPrefix.localeCompare(surname) <= 0;
    })
    .sort(([first], [second]) => normalize(second).localeCompare(normalize(first)))
    .slice(0, 6)
    .map(([prefix, number]) => ({ prefix, code: `${prefix[0]?.toLocaleUpperCase("pt-BR")}${number}` }));
}
