export function studentRequestDraftKey(userId: string) {
  return `pronto:student-request-draft:v3:${userId}`;
}

export type RequestLanguage = "pt" | "en" | "es" | "de" | "fr" | "it";

export function requiredEquivalentLanguages(original: RequestLanguage): RequestLanguage[] {
  return original === "pt" ? ["en"] : original === "en" ? ["pt"] : ["pt", "en"];
}

export type StudentRequestDraft = {
  academicProgramId: string;
  registrationNumber: string;
  title: string;
  subtitle: string;
  equivalentTitle: string;
  originalLanguage: RequestLanguage;
  originalLanguageSelected: boolean;
  equivalentTitles: { language: "" | RequestLanguage; title: string }[];
  otherTitles: string[];
  publicWorkUrl: string;
  people: { author: string; additionalAuthors: string[]; committeeMembers: string[]; birthYearAcknowledged: boolean; birthYearAuthorIndex: number | null; advisor: string; advisorNoteLabel: string; coadvisor: string; coadvisorNoteLabel: string };
  keywordsPt: string[];
  keywordsEn: string[];
  keywordsOriginal: string[];
  keywordsAdditional: string[];
  specialCases: string[];
  volumeInformation: string;
  depositDate: string;
  defenseDate: string;
  extentUnit: "pages" | "volumes";
  extentCount: string;
  hasIllustrations: "" | "yes" | "no";
  libraryNote: string;
  defendedAndApproved: boolean;
  finalFileConfirmed: boolean;
  approvalPageConfirmed: boolean;
  sharedFileUnchangedConfirmed: boolean;
  cancellationAcknowledged: boolean;
};

export function additionalEquivalentLanguage(draft: Pick<StudentRequestDraft, "originalLanguage" | "equivalentTitles">): RequestLanguage | "" {
  const required = requiredEquivalentLanguages(draft.originalLanguage);
  const item = draft.equivalentTitles.find((title) => title.language !== "" && title.language !== draft.originalLanguage && !required.includes(title.language));
  return item?.language ?? "";
}

export const emptyStudentRequestDraft: StudentRequestDraft = {
  academicProgramId: "",
  registrationNumber: "",
  title: "",
  subtitle: "",
  equivalentTitle: "",
  originalLanguage: "pt",
  originalLanguageSelected: false,
  equivalentTitles: [],
  otherTitles: [],
  publicWorkUrl: "",
  people: { author: "", additionalAuthors: [], committeeMembers: [], birthYearAcknowledged: false, birthYearAuthorIndex: null, advisor: "", advisorNoteLabel: "Orientador", coadvisor: "", coadvisorNoteLabel: "Coorientador" },
  keywordsPt: ["", "", ""],
  keywordsEn: ["", "", ""],
  keywordsOriginal: ["", "", ""],
  keywordsAdditional: ["", "", ""],
  specialCases: [],
  volumeInformation: "",
  depositDate: "",
  defenseDate: "",
  extentUnit: "pages",
  extentCount: "",
  hasIllustrations: "",
  libraryNote: "",
  defendedAndApproved: false,
  finalFileConfirmed: false,
  approvalPageConfirmed: false,
  sharedFileUnchangedConfirmed: false,
  cancellationAcknowledged: false,
};

export function compactDraft(draft: StudentRequestDraft) {
  const compact = (values: string[]) => values.map((value) => value.trim()).filter(Boolean);
  const additionalLanguage = additionalEquivalentLanguage(draft);
  return {
    ...draft,
    registrationNumber: draft.registrationNumber.trim(),
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim(),
    equivalentTitle: draft.equivalentTitle.trim(),
    equivalentTitles: draft.equivalentTitles.map((item) => ({ ...item, title: item.title.trim() })).filter((item) => item.language && item.title),
    publicWorkUrl: draft.publicWorkUrl.trim(),
    otherTitles: compact(draft.otherTitles),
    keywordsPt: compact(draft.keywordsPt),
    keywordsEn: compact(draft.keywordsEn),
    keywordsOriginal: compact(draft.keywordsOriginal),
    additionalLanguage,
    additionalKeywords: additionalLanguage ? compact(draft.keywordsAdditional) : [],
    people: {
      author: draft.people.author.trim(),
      additionalAuthors: compact(draft.people.additionalAuthors),
      committeeMembers: compact(draft.people.committeeMembers),
      birthYearAcknowledged: draft.people.birthYearAcknowledged,
      birthYearAuthorIndex: draft.people.additionalAuthors.length > 0 ? draft.people.birthYearAuthorIndex : 0,
      advisor: draft.people.advisor.trim(),
      advisorNoteLabel: "Orientador",
      coadvisor: draft.people.coadvisor.trim(),
      coadvisorNoteLabel: draft.people.coadvisor ? "Coorientador" : "",
    },
    depositDate: draft.depositDate,
    defenseDate: draft.defenseDate,
    depositYear: Number(draft.depositDate.slice(0, 4)),
    defenseYear: Number(draft.defenseDate.slice(0, 4)),
    extentCount: Number(draft.extentCount),
    hasIllustrations: draft.hasIllustrations === "yes",
    volumeInformation: draft.volumeInformation.trim(),
    libraryNote: draft.libraryNote.trim(),
  };
}

/** Accept older local drafts without letting malformed browser data break the form. */
export function restoreStudentRequestDraft(value: unknown): StudentRequestDraft {
  const record = (item: unknown): Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
  const source = record(value);
  const people = record(source.people);
  const restored = structuredClone(emptyStudentRequestDraft);
  for (const key of Object.keys(restored) as (keyof StudentRequestDraft)[]) {
    if (typeof restored[key] === "string" && typeof source[key] === "string") {
      Object.assign(restored, { [key]: source[key] });
    }
  }
  const legacyDraft = source.originalLanguageSelected === undefined;
  const legacyHasWork = Boolean(String(source.title ?? "").trim()) || Boolean(String(source.registrationNumber ?? "").trim()) || (Array.isArray(source.equivalentTitles) && source.equivalentTitles.some((item) => Boolean(String(record(item).title ?? "").trim())));
  restored.originalLanguageSelected = source.originalLanguageSelected === true || (legacyDraft && typeof source.originalLanguage === "string" && legacyHasWork);
  // Rascunhos antigos guardavam só o ano; a data completa deve ser informada pelo estudante.
  const strings = (item: unknown) => Array.isArray(item) ? item.filter((entry): entry is string => typeof entry === "string") : [];
  for (const key of ["author", "advisor", "coadvisor", "advisorNoteLabel", "coadvisorNoteLabel"] as const) {
    if (typeof people[key] === "string") restored.people[key] = people[key];
  }
  restored.people.birthYearAcknowledged = people.birthYear === undefined && people.birthYearAcknowledged === true;
  restored.people.birthYearAuthorIndex = Number.isInteger(people.birthYearAuthorIndex) && (people.birthYearAuthorIndex as number) >= 0 ? people.birthYearAuthorIndex as number : null;
  restored.people.additionalAuthors = strings(people.additionalAuthors);
  restored.people.committeeMembers = strings(people.committeeMembers);
  const pairedStrings = (item: unknown) => Array.isArray(item) ? item.map((entry) => typeof entry === "string" ? entry : "") : [];
  restored.keywordsPt = pairedStrings(source.keywordsPt);
  restored.keywordsEn = pairedStrings(source.keywordsEn);
  restored.keywordsOriginal = pairedStrings(source.keywordsOriginal);
  restored.keywordsAdditional = pairedStrings(source.keywordsAdditional);
  if (source.keywordsOriginal === undefined && !["pt", "en"].includes(restored.originalLanguage)) {
    restored.keywordsOriginal = restored.keywordsEn;
    restored.keywordsEn = [];
  }
  const pairCount = Math.max(3, restored.keywordsPt.length, restored.keywordsEn.length, restored.keywordsOriginal.length, restored.keywordsAdditional.length);
  restored.keywordsPt = Array.from({ length: pairCount }, (_, index) => restored.keywordsPt[index] ?? "");
  restored.keywordsEn = Array.from({ length: pairCount }, (_, index) => restored.keywordsEn[index] ?? "");
  restored.keywordsOriginal = Array.from({ length: pairCount }, (_, index) => restored.keywordsOriginal[index] ?? "");
  restored.keywordsAdditional = Array.from({ length: pairCount }, (_, index) => restored.keywordsAdditional[index] ?? "");
  restored.otherTitles = strings(source.otherTitles);
  restored.specialCases = strings(source.specialCases).filter((item) => ["cotutelle", "double_degree"].includes(item));
  for (const key of ["defendedAndApproved", "finalFileConfirmed", "approvalPageConfirmed", "sharedFileUnchangedConfirmed", "cancellationAcknowledged"] as const) restored[key] = source[key] === true;
  const languages = ["pt", "en", "es", "de", "fr", "it"];
  if (!languages.includes(restored.originalLanguage)) restored.originalLanguage = "pt";
  restored.hasIllustrations = source.hasIllustrations === true || source.hasIllustrations === "yes" ? "yes" : source.hasIllustrations === false || source.hasIllustrations === "no" ? "no" : "";
  restored.extentUnit = source.extentUnit === "volumes" ? "volumes" : "pages";
  const titles = Array.isArray(source.equivalentTitles) ? source.equivalentTitles.map(record) : [];
  const seen = new Set<string>();
  const existingTitles: StudentRequestDraft["equivalentTitles"] = titles.flatMap((item): StudentRequestDraft["equivalentTitles"] => {
    if (item.language === "") return [{ language: "" as const, title: typeof item.title === "string" ? item.title : "" }];
    if (legacyDraft && !legacyHasWork && item.language === "en" && !String(item.title ?? "").trim()) return [{ language: "" as const, title: "" }];
    if (typeof item.language !== "string" || !languages.includes(item.language) || item.language === restored.originalLanguage || seen.has(item.language)) return [];
    seen.add(item.language);
    return [{ language: item.language as StudentRequestDraft["originalLanguage"], title: typeof item.title === "string" ? item.title : "" }];
  });
  const requiredLanguages = requiredEquivalentLanguages(restored.originalLanguage);
  const additional = existingTitles.find((item) => item.language !== "" && !requiredLanguages.includes(item.language));
  restored.equivalentTitles = restored.originalLanguageSelected ? [
    ...requiredLanguages.map((language) => ({ language, title: existingTitles.find((item) => item.language === language)?.title ?? "" })),
    ...(additional ? [additional] : []),
  ] : [];
  return restored;
}
