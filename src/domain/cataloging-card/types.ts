export type CardPerson = { role: string; transcribedName: string; authorizedName: string; birthYear?: number | null; birthYearValidated?: boolean; noteLabel?: string | null; position?: number };
export type CardSubject = { labelPt: string; labelEn?: string | null; isPrimary: boolean; position?: number };

export type CatalogingCardSnapshot = {
  institution: { university: string; librarySystem: string; library: string };
  request: {
    protocol: string; title: string; subtitle?: string | null; equivalentTitle?: string | null; includeEquivalentTitle?: boolean;
    otherTitles?: string[]; volumeInformation?: string | null; specialCases?: string[];
    programName: string; programCode?: string; academicLevel: string; workNature?: string;
    programTracing?: string | null; depositYear?: number; defenseYear?: number;
    extentUnit?: "pages" | "volumes"; extentCount?: number; hasIllustrations?: boolean;
    dimensions?: string | null; accompanyingMaterial?: string | null;
    publicationPlace?: string;
  };
  people: CardPerson[];
  subjects: CardSubject[];
  freeNotes?: string[];
  classification: { cdu: string; cutter: string };
  technicalResponsibility: { name: string; crb: string };
  catalogingConventions: {
    electronicResourceLabel: string; physicalDescriptionAbbreviation?: string; tracingsLabel?: string;
    pageAbbreviation?: string; volumeAbbreviation?: string; illustrationAbbreviation?: string;
    statementSeparator?: string; academicNoteSeparator?: string; subdivisionSeparator?: string;
  };
  layoutStatus: string;
};

const withoutFinalPunctuation = (value: string) => value.trim().replace(/[\s.;:]+$/u, "");
const sentence = (value: string) => `${withoutFinalPunctuation(value)}.`;
const freeNoteSentence = (value: string) => /[.!?]$/u.test(value.trim()) ? value.trim() : `${value.trim()}.`;
const lowerInitial = (value: string) => value.replace(/\p{L}/u, (letter) => letter.toLocaleLowerCase("pt-BR"));
export const normalizeCutterCode = (value: string) => value.trim().replace(/^(\p{L}+\d+)\p{L}+$/u, "$1");
const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function catalogedWorkFilename(snapshot: CatalogingCardSnapshot) {
  const author = snapshot.people.find((person) => person.role === "author");
  const authorized = author?.authorizedName.trim() ?? "";
  const [surnamePart, givenPart] = authorized.includes(",") ? authorized.split(/,(.+)/, 2) : [authorized.split(/\s+/).at(-1) ?? "autor", author?.transcribedName.replace(/\s+\S+$/, "") ?? "autor"];
  return [surnamePart, givenPart, snapshot.request.depositYear ?? "ano", snapshot.request.workNature ?? "trabalho"].map((part) => slug(String(part))).filter(Boolean).join("-") + ".pdf";
}
const normalizeSubdivisionSeparator = (value: string, separator: string) =>
  value.replace(/\s+[–—-]\s+/gu, ` ${separator} `);
const roman = (value: number) => {
  const symbols: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = value; let result = "";
  for (const [amount, symbol] of symbols) while (remaining >= amount) { result += symbol; remaining -= amount; }
  return result;
};

export function formatProfessionalRegistration(value: string) {
  const normalized = value.trim().match(/^CRB-?(\d+)\/(\d+)$/i);
  return normalized ? `CRB/${normalized[1]}-${normalized[2]}` : value.trim();
}

export function authorizedNameNeedsReview(value: string) {
  const name = value.trim();
  return name.length >= 3 && !/^[^,]+,\s*\S/u.test(name);
}

export function prefixBeforeFourthAuthorLetter(value: string) {
  let letters = 0;
  let prefix = "";
  for (const character of value.trim()) {
    if (/\p{L}/u.test(character)) letters += 1;
    if (letters > 3) break;
    prefix += character;
  }
  return prefix;
}

export type CardPreviewOptions = { previewPlaceholders?: boolean; invalidSubjectPositions?: number[]; cduDescriptionPending?: boolean };

export function buildCardContent(snapshot: CatalogingCardSnapshot, options: CardPreviewOptions = {}) {
  const preview = options.previewPlaceholders === true;
  const required = (value: string | null | undefined, label: string, minLength = 1) => {
    const text = value?.trim() ?? "";
    return text.length >= minLength ? text : preview ? `[${label}]` : text;
  };
  const authors = snapshot.people.filter((person) => person.role === "author").sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const author = authors[0];
  const advisor = snapshot.people.find((person) => person.role === "advisor");
  const coadvisor = snapshot.people.find((person) => person.role === "coadvisor");
  const title = withoutFinalPunctuation(required(snapshot.request.title, "Título do trabalho"));
  const subtitle = snapshot.request.subtitle ? ` : ${lowerInitial(withoutFinalPunctuation(snapshot.request.subtitle))}` : "";
  const equivalentTitle = snapshot.request.includeEquivalentTitle && snapshot.request.equivalentTitle ? ` = ${withoutFinalPunctuation(snapshot.request.equivalentTitle)}` : "";
  const responsibilityNames = authors.length ? authors.slice(0, 3).map((person) => withoutFinalPunctuation(required(person.transcribedName, "Nome do autor no trabalho", 3))) : [required(author?.transcribedName, "Nome do autor no trabalho", 3)];
  const responsibilityName = authors.length > 3 ? `${responsibilityNames[0]} ... [et al.]` : responsibilityNames.filter(Boolean).join(", ");
  const responsibility = responsibilityName ? ` / ${withoutFinalPunctuation(responsibilityName)}.` : ".";
  const place = required(snapshot.request.publicationPlace ?? "Salvador", "Local de publicação", 2);
  const depositYear = snapshot.request.depositYear && snapshot.request.depositYear >= 1900 && snapshot.request.depositYear >= (snapshot.request.defenseYear ?? 0) ? String(snapshot.request.depositYear) : preview ? "[Ano de depósito]" : "";
  const deposit = depositYear ? ` ${snapshot.catalogingConventions.statementSeparator ?? "—"} ${place}, ${depositYear}.` : "";
  const titleStatement = `${title} ${snapshot.catalogingConventions.electronicResourceLabel}${subtitle}${equivalentTitle}${responsibility}${deposit}`;
  const extentAbbreviation = snapshot.request.extentUnit === "volumes"
    ? snapshot.catalogingConventions.volumeAbbreviation ?? "v."
    : snapshot.catalogingConventions.pageAbbreviation ?? snapshot.catalogingConventions.physicalDescriptionAbbreviation ?? "p.";
  const dimensions = snapshot.request.dimensions?.trim().replace(/^[;\s]+|[.;\s]+$/gu, "") ?? "";
  const accompanyingMaterial = snapshot.request.accompanyingMaterial?.trim().replace(/^[+\s]+|[.;\s]+$/gu, "") ?? "";
  const extentCount = snapshot.request.extentCount && snapshot.request.extentCount > 0 ? String(snapshot.request.extentCount) : preview ? `[Quantidade de ${snapshot.request.extentUnit === "volumes" ? "volumes" : "páginas"}]` : "";
  const physicalDescription = extentCount
    ? `${extentCount} ${extentAbbreviation}${snapshot.request.hasIllustrations ? ` : ${snapshot.catalogingConventions.illustrationAbbreviation ?? "il."}` : ""}${dimensions ? ` ; ${dimensions}` : ""}${accompanyingMaterial ? ` + ${accompanyingMaterial}` : ""}${dimensions || accompanyingMaterial ? "." : ""}`
    : "";
  const academicParts = ["Universidade Federal da Bahia", "Faculdade de Arquitetura", snapshot.request.programTracing, required(snapshot.request.programName, "Curso ou programa")]
    .filter((value): value is string => Boolean(value));
  const defenseYear = snapshot.request.defenseYear && snapshot.request.defenseYear >= 1900 && snapshot.request.defenseYear <= (snapshot.request.depositYear ?? 0) ? String(snapshot.request.defenseYear) : preview ? "[Ano de defesa/apresentação]" : "";
  const workNature = required(snapshot.request.workNature, "Natureza do trabalho");
  const academicNote = workNature && defenseYear
    ? `${workNature} ${snapshot.catalogingConventions.academicNoteSeparator ?? "–"} ${academicParts.join(", ")}. ${defenseYear}.`
    : "";
  const notes = [
    advisor || preview ? `${advisor?.noteLabel ?? "Orientador"}: ${sentence(required(advisor?.transcribedName, "Nome do orientador no trabalho", 3))}` : null,
    coadvisor ? `${coadvisor.noteLabel ?? "Coorientador"}: ${sentence(required(coadvisor.transcribedName, "Nome do coorientador no trabalho", 3))}` : null,
    ...(snapshot.freeNotes ?? []).filter((note) => note.trim()).map(freeNoteSentence),
  ].filter((line): line is string => Boolean(line));
  const subdivisionSeparator = snapshot.catalogingConventions.subdivisionSeparator ?? "-";
  const subjects = preview ? Array.from({ length: Math.max(3, snapshot.subjects.length) }, (_, index) => snapshot.subjects[index]) : snapshot.subjects;
  const normalizedSubjects = new Set<string>();
  const hasPrimary = snapshot.subjects.filter((subject) => subject.isPrimary).length === 1;
  const entries = subjects.map((subject, index) => {
    const label = subject?.labelPt.trim() ?? "";
    const normalized = label.toLocaleLowerCase("pt-BR");
    const invalid = label.length < 2 || options.invalidSubjectPositions?.includes(index) || (normalized && normalizedSubjects.has(normalized)) || (preview && !hasPrimary && index === 0);
    if (normalized) normalizedSubjects.add(normalized);
    return `${index + 1}. ${sentence(invalid && preview ? `[${!hasPrimary && index === 0 ? "Assunto principal a definir" : `Assunto controlado ${index + 1}`}]` : normalizeSubdivisionSeparator(label, subdivisionSeparator))}`;
  });
  const secondaryPeople = [...authors.slice(1), advisor ?? (preview ? { role: "advisor", transcribedName: "", authorizedName: "" } : null), coadvisor].filter((person): person is CardPerson => Boolean(person && (preview || person.authorizedName)));
  const tracingEntries: { text: string; kind: "subject" | "person" | "institution" | "title"; personIndex?: number; subjectIndex?: number; name?: string; prefix?: string; suffix?: string; needsReview?: boolean }[] = entries.map((text, subjectIndex) => ({ text, kind: "subject", subjectIndex, name: snapshot.subjects[subjectIndex]?.labelPt, prefix: `${subjectIndex + 1}. `, suffix: "." }));
  secondaryPeople.forEach((person, index) => {
    const rawName = required(person.authorizedName, `Nome autorizado do ${person.role === "author" ? `coautor ${index + 2}` : person.role === "advisor" ? "orientador" : "coorientador"}`, 3);
    const needsReview = preview && authorizedNameNeedsReview(rawName);
    const name = needsReview ? `[Corrigir forma invertida: ${rawName}]` : rawName;
    const prefix = `${roman(index + 1)}. `;
    const suffix = person.role === "author" && person.birthYear && person.birthYearValidated && !name.startsWith("[") ? `, ${person.birthYear}-` : ".";
    const text = `${prefix}${withoutFinalPunctuation(name)}${suffix}`;
    entries.push(text);
    tracingEntries.push({ text, kind: "person", personIndex: snapshot.people.indexOf(person), name, prefix, suffix, needsReview });
  });
  const isPpgau = snapshot.request.programCode === "ppgau-academic-master" || snapshot.request.programCode === "ppgau-doctorate" || (!snapshot.request.programCode && ["Dissertação", "Tese"].includes(snapshot.request.workNature ?? "") && snapshot.request.programTracing?.includes("Programa de Pós-Graduação em Arquitetura e Urbanismo"));
  const programSecondary = isPpgau
    ? "Universidade Federal da Bahia. Faculdade de Arquitetura. Programa de Pós-Graduação em Arquitetura e Urbanismo."
    : "Universidade Federal da Bahia. Faculdade de Arquitetura.";
  const institutionEntry = `${roman(secondaryPeople.length + 1)}. ${programSecondary}`;
  const titleEntry = `${roman(secondaryPeople.length + 2)}. Título.`;
  entries.push(institutionEntry, titleEntry);
  tracingEntries.push({ text: institutionEntry, kind: "institution" }, { text: titleEntry, kind: "title" });
  const rawAuthorName = required(author?.authorizedName, "Nome autorizado do autor", 3);
  const authorName = preview && authorizedNameNeedsReview(rawAuthorName) ? `[Corrigir forma invertida: ${rawAuthorName}]` : rawAuthorName;
  return {
    authorizedAuthor: authorName ? `${withoutFinalPunctuation(authorName)}${author?.birthYear && author.birthYearValidated && author.authorizedName.trim().length >= 3 && !authorizedNameNeedsReview(authorName) ? `, ${author.birthYear}-` : "."}` : "",
    titleStatement,
    responsibility,
    physicalDescription,
    academicNote,
    notes,
    tracings: entries.join(" "),
    tracingEntries,
    technicalResponsibility: `Responsável técnico: ${required(snapshot.technicalResponsibility.name, "Nome profissional")} - ${required(formatProfessionalRegistration(snapshot.technicalResponsibility.crb), "CRB")}`,
  };
}
