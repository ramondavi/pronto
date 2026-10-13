// A forma autorizada depende do uso do nome e da fonte de autoridade.
// AACR2 22.5C/LCRI: https://www.loc.gov/aba/publications/FreeLCRI/LCRI-complete.pdf
// Exemplos de sobrenomes compostos: https://www.loc.gov/catworkshop/courses/nametitleauth/pdf/Name-Title_Instr_Manual.pdf
export function authorizedNameSuggestions(transcribedName: string): string[] {
  const name = transcribedName.trim().replace(/\s+/g, " ");
  if (!name || name.includes(",")) return [];

  const parts = name.split(" ");
  if (parts.length < 2) return [];

  const hasSuffix = /^(filho|neto|júnior|junior|sobrinho)$/i.test(parts.at(-1) ?? "");
  const suffix = hasSuffix ? parts.pop() : null;
  const surnameEnd = parts.pop();
  if (!surnameEnd) return [];
  const ending = suffix ? `${surnameEnd} ${suffix}` : surnameEnd;
  const suggestions = [`${ending}, ${parts.join(" ")}`];

  // Dois sobrenomes podem formar um ponto de acesso composto, especialmente em nomes espanhóis.
  // A sequência de palavras sozinha não permite distinguir sobrenome de prenome.
  const previous = parts.at(-1);
  if (previous && parts.length > 1 && !/^(de|da|do|das|dos|del|la|las|los|y|e)$/i.test(previous)) {
    suggestions.push(`${previous} ${ending}, ${parts.slice(0, -1).join(" ")}`);
  } else if (previous && /^(de|da|do|das|dos|del|la|las|los)$/i.test(previous) && parts.length > 1) {
    const particleStart = parts.at(-2)?.toLocaleLowerCase("pt-BR") === "de" ? -2 : -1;
    const prefix = parts.slice(particleStart).join(" ");
    const given = parts.slice(0, particleStart).join(" ");
    if (given) suggestions.push(`${prefix} ${ending}, ${given}`);
  }
  return suggestions;
}

export function suggestAuthorizedName(transcribedName: string): string {
  const name = transcribedName.trim().replace(/\s+/g, " ");
  if (!name || name.includes(",")) return name;
  const suggestions = authorizedNameSuggestions(name);
  return suggestions.length === 1 ? suggestions[0] : "";
}
