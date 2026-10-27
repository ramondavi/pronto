"use client";

import { CduEditionSelect, defaultCduEdition } from "./cdu-edition-select";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dismissPanelChange, showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { createPortal } from "react-dom";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import { createClient } from "@/lib/supabase/client";
import { CatalogingCardPreview, type CardDirectEdit } from "@/components/cataloging-card-preview";
import { CatalogingCardHomologation } from "@/components/cataloging-card-homologation";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { ModalCloseButton } from "@/components/modal-close-button";
import { AuthorBirthYearValidation } from "@/components/author-birth-year-validation";
import { authorizedNameNeedsReview, normalizeCutterCode, type CatalogingCardSnapshot } from "@/domain/cataloging-card/types";
import { A4_PAGE, drawCatalogingCard } from "@/domain/cataloging-card/pdf";
import { authorSurname, findCutterSuggestions } from "@/domain/cutter-suggestions";
import { authorizedNameSuggestions, suggestAuthorizedName } from "@/domain/cataloging-card/suggest-authorized-name";
import { academicWorkCitation } from "@/domain/citation/academic-work";
import cutterTableJson from "@/data/cutter-sanborn-table.json";

type Authority = { id: string; authorized_name: string };
type ControlledTerm = { id: string; preferred_label_pt: string; preferred_label_en: string | null };
type PersonEntry = { authorityId: string; role: string; transcribedName: string; authorizedName: string; position?: number; birthYear?: number | null; birthYearValidated?: boolean };
type TermEntry = { termId: string; labelPt: string; labelEn: string; isPrimary: boolean; sourceCode: string };
type SubmittedKeyword = { language: string; term: string; position: number };
type Suggestion = { cdu_code: string; score: number; primary_count: number; secondary_count: number; sheet_count: number };
type CduCatalogSuggestion = { cdu_code: string; description: string; validated: boolean };
export type CardDetailsEntry = { depositYear: number; defenseYear: number; depositDate: string; defenseDate: string; publicationPlace: string; extentUnit: "pages" | "volumes"; extentCount: number; hasIllustrations: boolean; dimensions: string; accompanyingMaterial: string; advisorNoteLabel: string; coadvisorNoteLabel: string };
type CatalogingDraft = { people: PersonEntry[]; terms: TermEntry[]; cduCode: string; cutterCode: string; cardDetails: CardDetailsEntry; cduDescription: string; freeNotes?: string[] };
const withMinimumTerms = (entries: TermEntry[]) => [...entries, ...Array.from({ length: Math.max(0, 3 - entries.length) }, (): TermEntry => ({ termId: "", labelPt: "", labelEn: "", sourceCode: "", isPrimary: false }))];

const roleLabels: Record<string, string> = {
  author: "Autor", advisor: "Orientador", coadvisor: "Coorientador",
  committee_member: "Membro de banca",
};
const cutterTable = cutterTableJson as Record<string, number>;
const similarity = (source: string, candidate: string) => {
  const words = new Set(source.toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/).filter((word) => word.length > 2));
  return candidate.toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/).filter((word) => words.has(word)).length;
};

function AuthorizedNameChoices({ id, person, onChoose, onIgnore }: { id: string; person: PersonEntry; onChoose: (name: string) => void; onIgnore: () => void }) {
  const suggestions = authorizedNameSuggestions(person.transcribedName);
  if (suggestions.length < 2) return null;
  return <div id={id} className="cataloging-name-choices" role="group" aria-label="Sugestões para o nome autorizado"><strong>Escolha a forma autorizada</strong><p>Confira a forma usada pela pessoa ou no catálogo de autoridades.</p><div>{suggestions.map((name) => <button type="button" key={name} aria-pressed={person.authorizedName === name} onClick={() => onChoose(name)}>{name}</button>)}</div><button className="cataloging-name-choices__ignore" type="button" onClick={onIgnore}><AppIcon name="edit" />Digitar manualmente</button></div>;
}
const nameWords = (name: string) => name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).sort().join(" ");
function CatalogingFieldLabel({ icon, children }: { icon: AppIconName; children: ReactNode }) {
  return <span className="cataloging-field-label"><AppIcon name={icon} />{children}</span>;
}

export function AssistedCatalogingWorkspace({ requestId, editable, homologationAllowed, homologatedAt, homologationSnapshot, initialCitationReady, metadataComplete, nadaConstaApproved, isRaue, authorities, controlledTerms, initialPeople, initialTerms, initialDraft, initialCdu, initialCutter, initialCardDetails, initialFreeNotes, previewBase, submittedKeywords = [] }: {
  requestId: string; editable: boolean; authorities: Authority[]; controlledTerms: ControlledTerm[];
  homologationAllowed: boolean; homologatedAt: string | null; homologationSnapshot: CatalogingCardSnapshot | null; initialCitationReady: boolean; metadataComplete: boolean; nadaConstaApproved: boolean;
  isRaue: boolean;
  initialPeople: PersonEntry[]; initialTerms: TermEntry[]; initialDraft: unknown; initialCdu: string; initialCutter: string; initialCardDetails: CardDetailsEntry; initialFreeNotes: string[];
  previewBase: CatalogingCardSnapshot;
  submittedKeywords: SubmittedKeyword[];
}) {
  const [people, setPeople] = useState(() => initialPeople.map((person) => {
    if (person.authorityId) return person;
    const closest = [...authorities].sort((a, b) => similarity(person.transcribedName, b.authorized_name) - similarity(person.transcribedName, a.authorized_name))[0];
    return closest && nameWords(person.transcribedName) === nameWords(closest.authorized_name) ? { ...person, authorityId: closest.id, authorizedName: closest.authorized_name } : person;
  }));
  const [terms, setTerms] = useState(() => {
    const existing = initialTerms.map((term) => {
      if (term.termId) return term;
      const closest = [...controlledTerms].sort((a, b) => similarity(term.labelPt, b.preferred_label_pt) - similarity(term.labelPt, a.preferred_label_pt))[0];
      return closest && similarity(term.labelPt, closest.preferred_label_pt) > 0 ? { ...term, termId: closest.id, labelPt: closest.preferred_label_pt, labelEn: closest.preferred_label_en ?? term.labelEn } : term;
    });
    return withMinimumTerms(existing);
  });
  const [cduCode, setCduCode] = useState(initialCdu);
  const [cduCatalogSuggestions, setCduCatalogSuggestions] = useState<CduCatalogSuggestion[]>([]);
  const [cduCatalogOpen, setCduCatalogOpen] = useState(false);
  const [cduDescription, setCduDescription] = useState("");
  const [cduEdition, setCduEdition] = useState(defaultCduEdition);
  const [cduDescriptionKnown, setCduDescriptionKnown] = useState(false);
  const [cduLookupPending, setCduLookupPending] = useState(false);
  const [cduMergedTarget, setCduMergedTarget] = useState<string | null>(null);
  const [cduLookupFailed, setCduLookupFailed] = useState(false);
  const [cduDescriptionSaved, setCduDescriptionSaved] = useState(false);
  const [cduDescriptionReadyToSave, setCduDescriptionReadyToSave] = useState("");
  const [cutterCode, setCutterCode] = useState(initialCutter);
  const [cardDetails, setCardDetails] = useState(initialCardDetails);
  const citationSourceKey = `${cardDetails.depositYear}|${cardDetails.defenseYear}|${cardDetails.publicationPlace}`;
  const lastCitationSourceKey = useRef(citationSourceKey);
  const [freeNotes, setFreeNotes] = useState(initialFreeNotes);
  const [ready, setReady] = useState(false);
  const [draftStored, setDraftStored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "incomplete">("idle");
  const [savedCatalogingSnapshot, setSavedCatalogingSnapshot] = useState<string | null>(null);
  const lastSavedCataloging = useRef<string | null>(null);
  const catalogingFieldEdit = useRef<{ target: EventTarget; previous: string } | null>(null);
  const freeNoteEditStart = useRef<string | null>(null);
  const lastPersistedNotes = useRef(JSON.stringify(initialFreeNotes.map((note) => note.trim())));
  const notesSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingCatalogingNotice = useRef<{ previous: string; saved: string } | null>(null);
  const pendingDraftNotice = useRef<{ previous: string; saved: string } | null>(null);
  const draftSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const lastQueuedDraft = useRef<string | null>(null);
  const lastSavedDraft = useRef<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [availableSuggestionCount, setAvailableSuggestionCount] = useState(0);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [highlightPendingFields, setHighlightPendingFields] = useState(false);
  const [suggestionFeedback, setSuggestionFeedback] = useState<{ kind: "empty" | "error"; title: string; detail: string } | null>(null);
  const [primaryHistory, setPrimaryHistory] = useState<"none" | "checking" | "available" | "unused" | "error">("none");
  const [draggedTerm, setDraggedTerm] = useState<number | null>(null);
  const [draggedPerson, setDraggedPerson] = useState<number | null>(null);
  const [activeAutocomplete, setActiveAutocomplete] = useState<string | null>(null);
  const [openNameSuggestions, setOpenNameSuggestions] = useState<string | null>(null);
  const [cutterSuggestionsOpen, setCutterSuggestionsOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<Element | null>(null);
  const [pendingTarget, setPendingTarget] = useState<Element | null>(null);
  const [openingPreviewPdf, setOpeningPreviewPdf] = useState(false);
  const [includeEquivalentTitle, setIncludeEquivalentTitle] = useState(Boolean(previewBase.request.includeEquivalentTitle));
  const [equivalentTitleError, setEquivalentTitleError] = useState("");
  const [savingEquivalentTitle, setSavingEquivalentTitle] = useState(false);
  const [citationReady, setCitationReady] = useState(initialCitationReady);
  useEffect(() => setCitationReady(initialCitationReady), [initialCitationReady]);
  useEffect(() => {
    if (lastCitationSourceKey.current === citationSourceKey) return;
    lastCitationSourceKey.current = citationSourceKey;
    setCitationReady(false);
    const suggested = academicWorkCitation({ programCode: previewBase.request.programCode ?? "", authors: people.filter((person) => person.role === "author").map((person) => person.transcribedName), title: previewBase.request.title, subtitle: previewBase.request.subtitle, depositYear: cardDetails.depositYear, defenseYear: cardDetails.defenseYear, place: cardDetails.publicationPlace });
    window.dispatchEvent(new CustomEvent("request-analysis:citation-source-changed", { detail: { suggested } }));
  }, [citationSourceKey, cardDetails.depositYear, cardDetails.defenseYear, cardDetails.publicationPlace, people, previewBase.request.programCode, previewBase.request.title, previewBase.request.subtitle]);
  useEffect(() => { const update = (event: Event) => setCitationReady(Boolean((event as CustomEvent<{ ready: boolean }>).detail?.ready)); window.addEventListener("request-analysis:citation-status", update); return () => window.removeEventListener("request-analysis:citation-status", update); }, []);
  const isEmptyExtraPerson = (person: PersonEntry) => person.role === "committee_member" && !person.transcribedName.trim() && !person.authorizedName.trim() && !person.authorityId;
  const isEmptyTerm = (term: TermEntry) => !term.labelPt.trim() && !term.labelEn.trim() && !term.sourceCode && !term.termId && !term.isPrimary;
  const catalogingPeople = people.filter((person) => !isEmptyExtraPerson(person));
  const catalogingTerms = terms.filter((term) => !isEmptyTerm(term));

  const previewSnapshot = useMemo<CatalogingCardSnapshot>(() => ({
    ...previewBase,
    request: { ...previewBase.request, includeEquivalentTitle, depositYear: cardDetails.depositYear, defenseYear: cardDetails.defenseYear, publicationPlace: cardDetails.publicationPlace, extentUnit: cardDetails.extentUnit, extentCount: cardDetails.extentCount, hasIllustrations: cardDetails.hasIllustrations, dimensions: cardDetails.dimensions, accompanyingMaterial: cardDetails.accompanyingMaterial },
    people: catalogingPeople.map((person, position) => ({ ...person, noteLabel: person.role === "advisor" ? cardDetails.advisorNoteLabel : person.role === "coadvisor" ? cardDetails.coadvisorNoteLabel : null, position })),
    subjects: catalogingTerms.map((term, position) => ({ labelPt: term.labelPt, labelEn: term.labelEn, isPrimary: term.isPrimary, position })),
    classification: { cdu: cduCode, cutter: normalizeCutterCode(cutterCode) },
    freeNotes,
  }), [previewBase, cardDetails, people, terms, cduCode, cutterCode, includeEquivalentTitle, freeNotes]);
  const shownSnapshot = homologationSnapshot ?? previewSnapshot;
  const cduDescriptionPending = Boolean(editable && cduCode.trim() && (cduLookupPending || cduLookupFailed || Boolean(cduMergedTarget) || (!cduDescriptionKnown && !cduDescriptionSaved)));
  const previewOptions = {
    previewPlaceholders: !homologatedAt,
    invalidSubjectPositions: catalogingTerms.flatMap((term, index) => term.sourceCode && term.labelPt.trim().length >= 2 ? [] : [index]),
    cduDescriptionPending,
  };
  useEffect(() => {
    const timer = window.setTimeout(() => window.dispatchEvent(new CustomEvent("request-analysis:cdu-description-pending", { detail: { pending: cduDescriptionPending } })), 0);
    return () => window.clearTimeout(timer);
  }, [cduDescriptionPending]);

  const valid = useMemo(() => catalogingPeople.length > 0
    && catalogingPeople.every((person) => person.transcribedName.trim().length >= 3 && person.authorizedName.trim().length >= 3)
    && catalogingTerms.length >= 3 && catalogingTerms.every((term) => term.labelPt.trim().length >= 2 && Boolean(term.sourceCode))
    && new Set(catalogingTerms.map((term) => term.labelPt.trim().toLocaleLowerCase("pt-BR"))).size === catalogingTerms.length
    && catalogingTerms.filter((term) => term.isPrimary).length === 1
    && cardDetails.depositYear >= cardDetails.defenseYear
    && (!cardDetails.depositDate || !cardDetails.defenseDate || cardDetails.defenseDate <= cardDetails.depositDate)
    && cardDetails.defenseYear >= 1900 && cardDetails.extentCount > 0
    && cardDetails.publicationPlace.trim().length >= 2 && cardDetails.publicationPlace.trim().length <= 120
    && cardDetails.dimensions.length <= 120 && cardDetails.accompanyingMaterial.length <= 240
    && freeNotes.every((note) => note.trim().length >= 3 && note.trim().length <= 500), [catalogingPeople, catalogingTerms, cardDetails, freeNotes]);
  const catalogingSnapshot = JSON.stringify({ people, terms, cduCode, cutterCode, cardDetails, cduDescription, freeNotes });
  const currentCataloging = useRef(catalogingSnapshot);
  useEffect(() => { currentCataloging.current = catalogingSnapshot; }, [catalogingSnapshot]);
  function notifyCatalogingSaved(previous: string, saved: string) {
    const prior = previous ? JSON.parse(previous) as CatalogingDraft : null;
    const canUndo = prior && prior.cduDescription === cduDescription;
    showPanelChange("Dados da ficha salvos", canUndo ? async () => {
      if (currentCataloging.current !== saved) throw new Error("Os dados mudaram após este salvamento.");
      const [{ error: peopleError }, { error: cardError }, { error: notesError }] = await Promise.all([
        createClient().rpc("save_assisted_cataloging_v2", { target_request_id: requestId, payload: { people: prior.people.filter((person) => !isEmptyExtraPerson(person)), terms: prior.terms.filter((term) => !isEmptyTerm(term)), cduCode: prior.cduCode, cutterCode: prior.cutterCode } }),
        createClient().rpc("save_request_card_details", { target_request_id: requestId, payload: prior.cardDetails }),
        createClient().rpc("save_request_card_notes", { target_request_id: requestId, notes_value: prior.freeNotes ?? [] }),
      ]);
      if (peopleError || cardError || notesError) throw peopleError ?? cardError ?? notesError;
      lastSavedCataloging.current = previous;
      setSavedCatalogingSnapshot(previous);
      setPeople(prior.people); setTerms(withMinimumTerms(prior.terms)); setCduCode(prior.cduCode); setCutterCode(prior.cutterCode); setCardDetails(prior.cardDetails); setFreeNotes(prior.freeNotes ?? []);
    } : undefined);
  }
  function finishFreeNoteEdit() {
    const previous = freeNoteEditStart.current;
    freeNoteEditStart.current = null;
    if (!previous || previous === catalogingSnapshot) return;
    if (valid) {
      if (lastSavedCataloging.current === catalogingSnapshot) notifyCatalogingSaved(previous, catalogingSnapshot);
      else pendingCatalogingNotice.current = { previous, saved: catalogingSnapshot };
    } else confirmDraftField(previous, catalogingSnapshot);
  }
  function saveNotes(notes: string[]) {
    notesSaveQueue.current = notesSaveQueue.current.catch(() => undefined).then(async () => {
      const { error } = await createClient().rpc("save_request_card_notes", { target_request_id: requestId, notes_value: notes });
      if (error) throw error;
      lastPersistedNotes.current = JSON.stringify(notes);
    });
    return notesSaveQueue.current;
  }
  async function confirmFreeNote(index: number) {
    const note = freeNotes[index]?.trim() ?? "";
    if (note.length < 3 || note.length > 500) return false;
    const completeNotes = freeNotes.map((item) => item.trim()).filter((item) => item.length >= 3 && item.length <= 500);
    try { await saveNotes(completeNotes); }
    catch { showPanelChangeError("Nota não salva", "Confira a conexão e tente novamente."); return false; }
    showPanelChange("Redação da nota confirmada");
    return true;
  }
  useEffect(() => { if (ready) dismissPanelChange(); }, [catalogingSnapshot, ready]);
  const reviewPendingFields = [
    ...(!previewSnapshot.request.title?.trim() ? [{ tab: "metadata", field: "Título do trabalho", fieldId: "review-field-title" }] : []),
    ...(people.length === 0 ? [{ tab: "cataloging", field: "Pessoas relacionadas (autor e orientador)", fieldId: "cataloging-people" }] : []),
    ...people.flatMap((person, index) => isEmptyExtraPerson(person) ? [] : [
      ...(person.transcribedName.trim().length >= 3 ? [] : [{ tab: "cataloging", field: `${person.role === "committee_member" ? "Nome na aprovação" : "Nome como aparece no trabalho"} — ${roleLabels[person.role] ?? "Pessoa relacionada"}`, fieldId: `cataloging-person-${index}` }]),
      ...(person.authorizedName.trim().length >= 3 ? [] : [{ tab: "cataloging", field: `Nome autorizado para a ficha — ${roleLabels[person.role] ?? "Pessoa relacionada"}`, fieldId: `cataloging-person-${index}` }]),
      ...(!authorizedNameNeedsReview(person.authorizedName) ? [] : [{ tab: "cataloging", field: `Conferir forma invertida — ${roleLabels[person.role] ?? "Pessoa relacionada"}`, fieldId: `cataloging-person-${index}` }]),
    ]),
    ...(catalogingTerms.length < 3 ? [{ tab: "cataloging", field: "Ao menos três assuntos em português", fieldId: "cataloging-terms" }] : []),
    ...terms.flatMap((term, index) => (isEmptyTerm(term) && catalogingTerms.length >= 3) || term.labelPt.trim().length >= 2 ? [] : [{ tab: "cataloging", field: `Assunto em português — termo ${index + 1}`, fieldId: `cataloging-term-${index}` }]),
    ...terms.flatMap((term, index) => (isEmptyTerm(term) && catalogingTerms.length >= 3) || term.sourceCode ? [] : [{ tab: "cataloging", field: `Fonte do termo ${index + 1}`, fieldId: `cataloging-term-${index}` }]),
    ...(new Set(catalogingTerms.filter((term) => term.labelPt.trim()).map((term) => term.labelPt.trim().toLocaleLowerCase("pt-BR"))).size !== catalogingTerms.filter((term) => term.labelPt.trim()).length ? [{ tab: "cataloging", field: "Remover assuntos repetidos", fieldId: "cataloging-terms" }] : []),
    ...(catalogingTerms.length > 0 && catalogingTerms.filter((term) => term.isPrimary).length !== 1 ? [{ tab: "cataloging", field: "Definição de um único assunto principal", fieldId: "cataloging-terms" }] : []),
    ...(!cduCode.trim() ? [{ tab: "cataloging", field: "CDU escolhida para este trabalho", fieldId: "cataloging-classification" }] : []),
    ...(cduDescriptionPending && !cduLookupPending ? [{ tab: "cataloging", field: "Descrição da CDU escolhida", fieldId: "cataloging-cdu-description" }] : []),
    ...(!normalizeCutterCode(cutterCode) ? [{ tab: "cataloging", field: "Cutter do autor", fieldId: "cataloging-classification" }] : []),
    ...(cardDetails.depositYear < 1900 ? [{ tab: "cataloging", field: "Ano de depósito", fieldId: "cataloging-details" }] : []),
    ...(cardDetails.defenseYear < 1900 ? [{ tab: "cataloging", field: "Ano de defesa", fieldId: "cataloging-details" }] : []),
    ...(cardDetails.depositYear > 0 && cardDetails.defenseYear > cardDetails.depositYear ? [{ tab: "cataloging", field: "Ano de defesa (não pode ser posterior ao depósito)", fieldId: "cataloging-details" }] : []),
    ...(cardDetails.extentCount <= 0 ? [{ tab: "cataloging", field: cardDetails.extentUnit === "volumes" ? "Quantidade de volumes" : "Quantidade de páginas", fieldId: "cataloging-details" }] : []),
    ...(cardDetails.publicationPlace.trim().length < 2 ? [{ tab: "review", field: "Local de publicação da ficha", fieldId: "request-cataloging-preview-end" }] : []),
  ];
  const draftKey = `pronto:cataloging-draft:${requestId}`;
  useEffect(() => {
    if (editable) {
      try {
        const draft = initialDraft as Partial<CatalogingDraft> | null;
        if (draft) {
          if (Array.isArray(draft.people) && Array.isArray(draft.terms) && draft.cardDetails) {
            setPeople(draft.people); setTerms(withMinimumTerms(draft.terms));
            setCduCode(draft.cduCode ?? ""); setCutterCode(draft.cutterCode ?? "");
            setCardDetails({ ...initialCardDetails, ...draft.cardDetails });
            setFreeNotes(Array.isArray(draft.freeNotes) ? draft.freeNotes : initialFreeNotes);
          }
        }
      } catch { /* A ficha validada continua disponível se o rascunho estiver inválido. */ }
    }
    setReady(true);
  }, [draftKey, editable, initialDraft, initialFreeNotes]);
  function persistDraft(snapshot: string) {
    if (lastQueuedDraft.current === snapshot) return;
    lastQueuedDraft.current = snapshot;
    draftSaveQueue.current = draftSaveQueue.current.catch(() => undefined).then(async () => {
      const { error } = await createClient().rpc("save_cataloging_draft", { target_request_id: requestId, draft_payload: JSON.parse(snapshot) });
      if (error) {
        lastQueuedDraft.current = null;
        setSaveState("error");
        showPanelChangeError("Campo não salvo", "Não foi possível salvar no sistema. Confira a conexão e tente novamente.");
        return;
      }
      lastSavedDraft.current = snapshot;
      if (currentCataloging.current === snapshot) {
        setDraftStored(false);
        const notice = pendingDraftNotice.current;
        if (notice?.saved === snapshot) {
          pendingDraftNotice.current = null;
          showPanelChange("Campo salvo", async () => {
            if (currentCataloging.current !== snapshot) throw new Error("O campo mudou após este salvamento.");
            const prior = JSON.parse(notice.previous) as CatalogingDraft;
            const { error: undoError } = await createClient().rpc("save_cataloging_draft", { target_request_id: requestId, draft_payload: prior });
            if (undoError) throw undoError;
            lastQueuedDraft.current = notice.previous;
            setPeople(prior.people); setTerms(withMinimumTerms(prior.terms)); setCduCode(prior.cduCode);
            setCutterCode(prior.cutterCode); setCardDetails(prior.cardDetails);
            setCduDescription(prior.cduDescription);
            setFreeNotes(prior.freeNotes ?? []);
          });
        }
      }
    });
  }
  function confirmDraftField(previous: string, saved: string) {
    pendingDraftNotice.current = { previous, saved };
    if (lastSavedDraft.current === saved) {
      lastSavedDraft.current = null;
      lastQueuedDraft.current = null;
    }
    persistDraft(saved);
  }
  useEffect(() => {
    if (!ready || !editable) return;
    try {
      window.localStorage.setItem(draftKey, catalogingSnapshot);
      setDraftStored(true);
    } catch {
      /* A cópia local é opcional; o banco segue como fonte do rascunho. */
    }
  }, [catalogingSnapshot, draftKey, editable, ready]);
  useEffect(() => {
    if (!ready || !editable) return;
    const timer = window.setTimeout(() => persistDraft(catalogingSnapshot), 500);
    return () => window.clearTimeout(timer);
  }, [catalogingSnapshot, editable, ready]);
  useEffect(() => {
    if (!ready || !editable || freeNotes.some((note) => note.trim().length < 3 || note.trim().length > 500)) return;
    const notes = freeNotes.map((note) => note.trim());
    if (lastPersistedNotes.current === JSON.stringify(notes)) return;
    const timer = window.setTimeout(async () => {
      try { await saveNotes(notes); }
      catch { showPanelChangeError("Nota não salva", "Confira a conexão e tente novamente."); }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [freeNotes, ready, editable, requestId]);
  useEffect(() => {
    let active = true;
    const code = cduCode.trim();
    if (!code) { setCduEdition(defaultCduEdition); setCduMergedTarget(null); setCduDescription(""); setCduDescriptionKnown(false); setCduDescriptionSaved(false); setCduDescriptionReadyToSave(""); setCduLookupPending(false); setCduLookupFailed(false); return; }
    setCduMergedTarget(null);
    setCduLookupPending(true);
    setCduLookupFailed(false);
    setCduDescriptionSaved(false);
    setCduDescriptionReadyToSave("");
    createClient().from("cdu_code_descriptions").select("description,merged_into_code,source_reference").eq("cdu_code", code).maybeSingle().then(async (response) => {
      let data = response.data;
      let error = response.error;
      if (response.error?.code === "42703" || response.error?.code === "PGRST204") {
        const legacy = await createClient().from("cdu_code_descriptions").select("description,source_reference").eq("cdu_code", code).maybeSingle();
        data = legacy.data ? { ...legacy.data, merged_into_code: null } : null;
        error = legacy.error;
      }
      if (active) setCduMergedTarget(data?.merged_into_code ?? null);
      if (!active) return;
      if (!error) { setCduDescription(data?.description ?? ""); setCduEdition(data ? data.source_reference ?? "" : defaultCduEdition); }
      setCduDescriptionKnown(Boolean(data));
      setCduDescriptionSaved(Boolean(data));
      setCduLookupFailed(Boolean(error));
      setCduLookupPending(false);
    });
    return () => { active = false; };
  }, [cduCode]);
  useEffect(() => {
    const code = cduCode.trim();
    const description = cduDescription.trim();
    if (!ready || !editable || !code || cduMergedTarget || cduLookupPending || cduDescriptionKnown || cduDescriptionSaved || description.length < 3 || cduDescriptionReadyToSave !== cduDescription) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      const { error } = await createClient().rpc("save_cdu_code_description", { cdu_code_value: code, description_value: description, source_reference_value: cduEdition });
      if (!active) return;
      if (error) { setCduDescriptionReadyToSave(""); showPanelChangeError("Descrição da CDU não salva", "Confira a conexão e tente novamente."); return; }
      const stored = await createClient().from("cdu_code_descriptions").select("description,source_reference").eq("cdu_code", code).single();
      if (!active) return;
      if (stored.error || !stored.data) { setCduDescriptionReadyToSave(""); showPanelChangeError("Descrição da CDU não confirmada", "Confira a conexão e tente novamente."); return; }
      setCduDescription(stored.data.description);
      setCduEdition(stored.data.source_reference ?? "");
      setCduDescriptionSaved(true);
      setCduDescriptionKnown(true);
    }, 500);
    return () => { active = false; window.clearTimeout(timer); };
  }, [cduCode, cduDescription, cduEdition, cduDescriptionReadyToSave, cduDescriptionKnown, cduDescriptionSaved, cduLookupPending, cduMergedTarget, editable, ready]);
  useEffect(() => {
    const prefix = cduCode.trim();
    if (!cduCatalogOpen || !prefix) { setCduCatalogSuggestions([]); return; }
    let active = true;
    const timer = window.setTimeout(() => {
      createClient().from("cdu_code_descriptions").select("cdu_code,description,validated")
        .is("merged_into_code", null).gte("cdu_code", prefix).lt("cdu_code", `${prefix}\uffff`).order("cdu_code").limit(7)
        .then(async (response) => {
          if (response.error?.code === "42703" || response.error?.code === "PGRST204") response = await createClient().from("cdu_code_descriptions").select("cdu_code,description,validated").gte("cdu_code", prefix).lt("cdu_code", `${prefix}\uffff`).order("cdu_code").limit(7);
          if (active) setCduCatalogSuggestions(response.error ? [] : response.data ?? []);
        });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [cduCode, cduCatalogOpen]);
  useEffect(() => setPreviewTarget(document.getElementById("request-cataloging-preview-end")), []);
  useEffect(() => setPendingTarget(document.getElementById("request-analysis-pending-end")), []);
  useEffect(() => {
    const fieldsets = document.querySelectorAll<HTMLFieldSetElement>(".assisted-cataloging fieldset");
    const targets = ["cataloging-people", "cataloging-terms", "cataloging-classification", "cataloging-details"];
    fieldsets.forEach((fieldset, index) => { fieldset.id = targets[index] ?? fieldset.id; fieldset.tabIndex = -1; });
    fieldsets[0]?.querySelectorAll<HTMLElement>(".cataloging-person").forEach((row, index) => { row.id = `cataloging-person-${index}`; row.tabIndex = -1; });
    fieldsets[1]?.querySelectorAll<HTMLElement>(".cataloging-row").forEach((row, index) => { row.id = `cataloging-term-${index}`; row.tabIndex = -1; });
  }, [people, terms]);
  useEffect(() => {
    if (!ready || !editable) return;
    if (!valid) { setSaveState("incomplete"); return; }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const [{ error }, { error: detailsError }] = await Promise.all([
        supabase.rpc("save_assisted_cataloging_v2", { target_request_id: requestId, payload: { people: catalogingPeople, terms: catalogingTerms, cduCode, cutterCode } }),
        supabase.rpc("save_request_card_details", { target_request_id: requestId, payload: cardDetails }),
      ]);
      if (error || detailsError) { setSaveState("error"); showPanelChangeError("Dados da ficha não salvos", "Confira os campos obrigatórios e a conexão; depois tente novamente."); return; }
      const completeNotes = freeNotes.map((note) => note.trim());
      if (lastPersistedNotes.current !== JSON.stringify(completeNotes)) {
        try { await saveNotes(completeNotes); }
        catch { setSaveState("error"); showPanelChangeError("Nota não salva", "Confira a conexão e tente novamente."); return; }
      }
      setSaveState("saved");
      const previous = lastSavedCataloging.current;
      lastSavedCataloging.current = catalogingSnapshot;
      setSavedCatalogingSnapshot(catalogingSnapshot);
      if (previous === catalogingSnapshot) return;
      if (currentCataloging.current !== catalogingSnapshot) return;
      const notice = pendingCatalogingNotice.current;
      if (!notice || notice.saved !== catalogingSnapshot) return;
      pendingCatalogingNotice.current = null;
      notifyCatalogingSaved(notice.previous, catalogingSnapshot);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [people, terms, cduCode, cduDescription, cduDescriptionReadyToSave, cutterCode, cardDetails, freeNotes, requestId, editable, ready, valid, catalogingSnapshot, draftKey]);

  function updatePerson(index: number, patch: Partial<PersonEntry>) {
    setPeople((current) => current.map((entry, position) => position === index ? { ...entry, ...patch } : entry));
  }
  function selectAuthority(index: number, authorizedName: string) {
    const match = authorities.find((item) => item.authorized_name.toLocaleLowerCase("pt-BR") === authorizedName.trim().toLocaleLowerCase("pt-BR"));
    updatePerson(index, { authorizedName, authorityId: match?.id ?? "" });
  }
  function updateTerm(index: number, patch: Partial<TermEntry>) {
    setTerms((current) => current.map((entry, position) => {
      if (position !== index) return entry;
      const isManualEnglishEdit = Boolean(entry.termId) && patch.termId === entry.termId && "labelEn" in patch && !("labelPt" in patch);
      return isManualEnglishEdit ? entry : { ...entry, ...patch };
    }));
  }
  function moveTerm(from: number, to: number) {
    if (from === to) return;
    setTerms((current) => { const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; });
  }
  const isFixedPerson = (person: PersonEntry) => ["author", "advisor", "coadvisor"].includes(person.role);
  const canDragPerson = (person: PersonEntry) => editable && (person.role === "author" ? isRaue && people.filter((item) => item.role === "author").length > 1 : !isFixedPerson(person));
  const nameSuggestionKey = (person: PersonEntry, index: number) => `${index}:${person.role}:${person.transcribedName}`;
  const hasNameSuggestions = (person: PersonEntry) => editable && authorizedNameSuggestions(person.transcribedName).length >= 2;
  const showNameSuggestions = (person: PersonEntry, index: number) => hasNameSuggestions(person) && openNameSuggestions === nameSuggestionKey(person, index);
  function movePerson(from: number, to: number) {
    if (from === to) return;
    const source = people[from]; const target = people[to];
    const withinAuthors = source?.role === "author" && target?.role === "author" && isRaue;
    const withinMovablePeople = source && target && !isFixedPerson(source) && !isFixedPerson(target);
    if (!withinAuthors && !withinMovablePeople) return;
    setPeople((current) => { const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; });
  }
  const authorityMatches = (value: string) => value.trim().length < 1 ? [] : authorities.filter((item) => item.authorized_name.toLocaleLowerCase("pt-BR").includes(value.toLocaleLowerCase("pt-BR"))).slice(0, 6);
  const termMatches = (value: string) => value.trim().length < 1 ? [] : controlledTerms.filter((item) => item.preferred_label_pt.toLocaleLowerCase("pt-BR").includes(value.toLocaleLowerCase("pt-BR"))).slice(0, 6);
  const cutterSuggestions = useMemo(() => findCutterSuggestions(cutterTable, people.find((person) => person.role === "author")?.authorizedName ?? ""), [people]);
  const cutterSurname = authorSurname(people.find((person) => person.role === "author")?.authorizedName ?? "");
  const firstAuthorEntry = people.find((person) => person.role === "author")?.authorizedName.trim() ?? "";
  function openPreviewPendingField(label: string) {
    const authorIndex = people.findIndex((person) => person.role === "author");
    const advisorIndex = people.findIndex((person) => person.role === "advisor");
    const coadvisorIndex = people.findIndex((person) => person.role === "coadvisor");
    const coauthorNumber = Number(label.match(/coautor (\d+)/)?.[1] ?? 0);
    const coauthor = coauthorNumber ? people.filter((person) => person.role === "author")[coauthorNumber - 1] : undefined;
    const coauthorIndex = coauthor ? people.indexOf(coauthor) : -1;
    const subjectNumber = Number(label.match(/Assunto controlado (\d+)/)?.[1] ?? 0);
    let tab: "metadata" | "cataloging" | "review" = "cataloging";
    let fieldId = "cataloging-details";
    if (label.includes("Título do trabalho")) { tab = "metadata"; fieldId = "review-field-title"; }
    else if (label.includes("Curso ou programa")) { tab = "metadata"; fieldId = "review-field-academic_program_id"; }
    else if (label.includes("coautor") && coauthorIndex >= 0) fieldId = `cataloging-person-${coauthorIndex}`;
    else if (label.includes("coorientador") && coadvisorIndex >= 0) fieldId = `cataloging-person-${coadvisorIndex}`;
    else if (label.includes("orientador") && advisorIndex >= 0) fieldId = `cataloging-person-${advisorIndex}`;
    else if (label.includes("autor") && authorIndex >= 0 && !label.includes("Cutter")) fieldId = `cataloging-person-${authorIndex}`;
    else if (subjectNumber > 0) fieldId = `cataloging-term-${subjectNumber - 1}`;
    else if (label.includes("Assunto principal")) fieldId = "cataloging-terms";
    else if (label.includes("Descrição pendente")) fieldId = "cataloging-cdu-description";
    else if (label.includes("Local de publicação")) { tab = "review"; fieldId = "request-cataloging-preview-end"; }
    else if (label.includes("CDU")) fieldId = "cataloging-cdu-input";
    else if (label.includes("Cutter")) fieldId = "cataloging-cutter-input";
    else if (label.includes("Nome profissional") || label.includes("CRB")) { window.location.assign("/painel/conta"); return; }
    setHighlightPendingFields(true);
    window.dispatchEvent(new CustomEvent("request-analysis:navigate", { detail: { tab, fieldId } }));
  }
  const primaryTerm = terms.find((term) => term.isPrimary);
  const cduSuggestionHelp = primaryHistory === "available" ? null
    : primaryHistory === "checking" ? "O Pronto! está consultando o histórico de fichas para este assunto principal."
    : primaryHistory === "error" ? "Não foi possível consultar o histórico agora. Clique para tentar novamente."
    : primaryHistory === "unused" ? `Ainda não há fichas anteriores com “${primaryTerm?.labelPt.trim() || "este assunto"}” como assunto principal. As sugestões de CDU dependem desse histórico.`
    : primaryTerm ? "Preencha o assunto marcado como principal para buscar códigos usados em fichas anteriores."
    : terms.some((term) => term.labelPt.trim()) ? "Marque um dos assuntos preenchidos como principal para buscar códigos usados em fichas anteriores."
    : "Preencha um assunto e marque-o como principal para buscar sugestões de CDU.";
  useEffect(() => {
    const markPending = (event: Event) => {
      if ((event as CustomEvent<{ tab?: string }>).detail?.tab === "cataloging") setHighlightPendingFields(true);
    };
    window.addEventListener("request-analysis:navigate", markPending);
    return () => window.removeEventListener("request-analysis:navigate", markPending);
  }, []);
  useEffect(() => {
    const label = primaryTerm?.labelPt.trim();
    setAvailableSuggestionCount(0);
    if (!label) { setPrimaryHistory("none"); return; }
    let active = true;
    setPrimaryHistory("checking");
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      let termId = primaryTerm?.termId ?? "";
      if (!termId) {
        const { data, error } = await supabase.from("controlled_terms").select("id").eq("normalized_label_pt", label.toLocaleLowerCase("pt-BR")).maybeSingle();
        if (!active) return;
      if (error) { setPrimaryHistory("error"); return; }
        termId = data?.id ?? "";
      }
      if (!termId) { setPrimaryHistory("unused"); return; }
      const { data, error } = await supabase.rpc("suggest_cdu", { primary_term_id: termId, secondary_term_ids: [] });
      if (!active) return;
      const available = error ? [] : ((data ?? []) as Suggestion[]).filter((item) => Number(item.primary_count) > 0);
      setAvailableSuggestionCount(available.length);
      setPrimaryHistory(error ? "error" : available.length ? "available" : "unused");
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [primaryTerm?.termId, primaryTerm?.labelPt]);
  useEffect(() => { setSuggestions([]); setSuggestionFeedback(null); }, [terms]);
  function selectTerm(index: number, labelPt: string) {
    const match = controlledTerms.find((item) => item.preferred_label_pt.toLocaleLowerCase("pt-BR") === labelPt.trim().toLocaleLowerCase("pt-BR"));
    updateTerm(index, { labelPt, labelEn: match?.preferred_label_en ?? terms[index].labelEn, termId: match?.id ?? "" });
  }
  async function suggestCdu() {
    setSuggestionDialogOpen(true);
    setSuggestionLoading(true);
    setSuggestions([]);
    setSuggestionFeedback(null);
    if (!primaryTerm?.labelPt.trim()) { setSuggestionLoading(false); return; }
    const supabase = createClient();
    const missingLabels = terms.filter((term) => !term.termId && term.labelPt.trim()).map((term) => term.labelPt.trim().toLocaleLowerCase("pt-BR"));
    const { data: existingTerms, error: lookupError } = missingLabels.length
      ? await supabase.from("controlled_terms").select("id,normalized_label_pt").in("normalized_label_pt", missingLabels)
      : { data: [], error: null };
    if (lookupError) { setSuggestionFeedback({ kind: "error", title: "Busca indisponível", detail: "Não foi possível consultar os assuntos. Confira a conexão e tente novamente." }); setSuggestionLoading(false); return; }
    const termIds = new Map((existingTerms ?? []).map((term) => [term.normalized_label_pt, term.id]));
    const idFor = (term: TermEntry) => term.termId || termIds.get(term.labelPt.trim().toLocaleLowerCase("pt-BR")) || "";
    const primaryId = idFor(primaryTerm);
    if (!primaryId) {
      setSuggestionFeedback({ kind: "empty", title: "Sem sugestões para este assunto", detail: `O assunto principal “${primaryTerm.labelPt.trim()}” ainda não consta no histórico de fichas. Consulte a CDU e informe o código manualmente.` });
      setSuggestionLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("suggest_cdu", {
      primary_term_id: primaryId,
      secondary_term_ids: terms.filter((term) => !term.isPrimary).map(idFor).filter(Boolean),
    });
    if (error) { setSuggestionFeedback({ kind: "error", title: "Busca indisponível", detail: "Não foi possível consultar o histórico de fichas. Confira a conexão e tente novamente." }); setSuggestionLoading(false); return; }
    setSuggestions((data as Suggestion[] | null) ?? []);
    setAvailableSuggestionCount(data?.length ?? 0);
    if (!data?.length) setSuggestionFeedback({ kind: "empty", title: "Nenhuma CDU sugerida", detail: "Não há fichas homologadas com esses assuntos para sugerir um código. Consulte a CDU e informe o código manualmente." });
    setSuggestionLoading(false);
  }
  async function openPreviewPdf(download = false) {
    setOpeningPreviewPdf(true);
    try {
      const document = await PDFDocument.create();
      const page = document.addPage(A4_PAGE);
      const regular = await document.embedFont(StandardFonts.Helvetica);
      const bold = await document.embedFont(StandardFonts.HelveticaBold);
      // O PDF de conferência da equipe nunca é a via entregue ao estudante.
      const watermarkStyle = { size: 26, font: bold, rotate: degrees(35), opacity: 0.045 };
      for (const [row, y] of [-130, 50, 230, 410, 590, 770].entries()) {
        for (const [column, x] of [-280, 40, 360].entries()) {
          const label = (row + column) % 2 === 0 ? "APENAS VISUALIZAÇÃO" : "NÃO ENVIAR AO ESTUDANTE";
          page.drawText(label, { x, y, ...watermarkStyle });
        }
      }
      drawCatalogingCard(page, shownSnapshot, { regular, bold }, previewOptions);
      const bytes = await document.save();
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const anchor = window.document.createElement("a");
      anchor.href = url; if (download) anchor.download = `ficha-${shownSnapshot.request.protocol}.pdf`; else { anchor.target = "_blank"; anchor.rel = "noopener"; } anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { showPanelChangeError("Prévia em PDF indisponível", error instanceof Error ? error.message : "Revise o conteúdo da ficha e tente novamente."); }
    finally { setOpeningPreviewPdf(false); }
  }

  async function decideEquivalentTitle(includeTitle: boolean) {
    setSavingEquivalentTitle(true);
    setEquivalentTitleError("");
    const { error } = await createClient().rpc("set_card_equivalent_title", { target_request_id: requestId, include_title: includeTitle });
    if (error) setEquivalentTitleError("Não foi possível salvar essa decisão. Tente novamente.");
    else setIncludeEquivalentTitle(includeTitle);
    setSavingEquivalentTitle(false);
  }

  const pendingGroups = [
    { label: "Metadados", items: reviewPendingFields.filter((item) => item.tab === "metadata") },
    { label: "Pessoas relacionadas", items: reviewPendingFields.filter((item) => item.fieldId === "cataloging-people" || item.fieldId.startsWith("cataloging-person-")) },
    { label: "Assuntos controlados", items: reviewPendingFields.filter((item) => item.fieldId === "cataloging-terms" || item.fieldId.startsWith("cataloging-term-")) },
    { label: "Classificação", items: reviewPendingFields.filter((item) => item.fieldId === "cataloging-classification" || item.fieldId === "cataloging-cdu-description") },
    { label: "Descrição da ficha", items: reviewPendingFields.filter((item) => item.fieldId === "cataloging-details" || item.field === "Local de publicação da ficha") },
  ].filter((group) => group.items.length > 0);
  const catalogingSaved = saveState === "saved" && savedCatalogingSnapshot === catalogingSnapshot;
  const canHomologate = Boolean(!homologatedAt && homologationAllowed && metadataComplete && citationReady && valid && reviewPendingFields.length === 0 && !cduDescriptionPending && !cduLookupPending && (cduDescriptionKnown || cduDescriptionSaved) && catalogingSaved && !savingEquivalentTitle && previewBase.technicalResponsibility.name && previewBase.technicalResponsibility.crb && catalogingPeople.some((person) => person.role === "author") && catalogingPeople.some((person) => person.role === "advisor"));
  const homologationPendingReason = homologatedAt ? null
    : !homologationAllowed ? "A homologação fica disponível ao responsável quando o atendimento está em análise."
    : !metadataComplete ? "Valide os metadados antes de homologar."
    : cduDescriptionPending || cduLookupPending || (!cduDescriptionKnown && !cduDescriptionSaved) ? "Cadastre a descrição da CDU antes de homologar."
    : !catalogingPeople.some((person) => person.role === "author") || !catalogingPeople.some((person) => person.role === "advisor") ? "Complete o autor e o orientador antes de homologar."
    : reviewPendingFields.length > 0 || !valid ? "Complete os campos pendentes antes de homologar."
    : !citationReady ? "Valide a referência do trabalho antes de homologar."
    : !previewBase.technicalResponsibility.name || !previewBase.technicalResponsibility.crb ? "Complete a identificação profissional antes de homologar."
    : !catalogingSaved || savingEquivalentTitle ? "Aguarde o salvamento dos dados da ficha." : null;
  const reviewSummary = <section className="review-cataloging-summary" aria-label="Conferência dos dados da ficha">
    <div className={`review-cataloging-summary__heading${reviewPendingFields.length === 0 ? " is-ready" : ""}`}><AppIcon name={reviewPendingFields.length === 0 ? "check" : "review"} /><div><h2>Conferência dos dados</h2><p>{reviewPendingFields.length === 0 ? "Campos prontos para conferir na prévia." : "Acesse cada campo pendente para completá-lo."}</p></div><span className={`review-cataloging-summary__count${reviewPendingFields.length === 0 ? " is-ready" : ""}`}>{reviewPendingFields.length === 0 ? "Sem pendências" : `${reviewPendingFields.length} ${reviewPendingFields.length === 1 ? "pendência" : "pendências"}`}</span></div>
    {pendingGroups.length > 0 && <div className="review-cataloging-summary__groups">{pendingGroups.map((group) => <section key={group.label}><h4>{group.label}</h4><ul className="review-cataloging-summary__fields">{group.items.map((item) => <li key={`${item.tab}-${item.fieldId}-${item.field}`}><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("request-analysis:navigate", { detail: item }))}><span>{item.field}</span><AppIcon name="arrowRight" /></button></li>)}</ul></section>)}</div>}
  </section>;

  function changeYear(field: "deposit" | "defense", year: number) {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) return;
    setCardDetails((current) => {
      const dateKey = field === "deposit" ? "depositDate" : "defenseDate";
      const yearKey = field === "deposit" ? "depositYear" : "defenseYear";
      const existingDate = current[dateKey];
      const proposedDate = existingDate ? `${year}${existingDate.slice(4)}` : "";
      const validDate = proposedDate && !Number.isNaN(Date.parse(`${proposedDate}T12:00:00Z`)) && new Date(`${proposedDate}T12:00:00Z`).toISOString().slice(0, 10) === proposedDate ? proposedDate : "";
      return { ...current, [yearKey]: year, [dateKey]: validDate };
    });
  }

  const previewDirectEdit: CardDirectEdit | undefined = editable ? {
    authorName: (value) => { const index = people.findIndex((person) => person.role === "author"); if (index >= 0) selectAuthority(index, value); },
    authorSuggestions: (() => { const person = people.find((item) => item.role === "author"); return person ? [...new Set([...authorizedNameSuggestions(person.transcribedName), ...authorityMatches(person.authorizedName).map((item) => item.authorized_name)])].map((value) => ({ value })) : []; })(),
    personName: (index, value) => { const sourceIndex = people.findIndex((person) => person === catalogingPeople[index]); if (sourceIndex >= 0) selectAuthority(sourceIndex, value); },
    personSuggestions: (index) => { const person = catalogingPeople[index]; return person ? [...new Set([...authorizedNameSuggestions(person.transcribedName), ...authorityMatches(person.authorizedName).map((item) => item.authorized_name)])].map((value) => ({ value })) : []; },
    subjectName: (index, value) => { const sourceIndex = terms.findIndex((term) => term === catalogingTerms[index]); if (sourceIndex >= 0) selectTerm(sourceIndex, value); },
    subjectSuggestions: (index) => { const term = catalogingTerms[index]; return term?.sourceCode ? termMatches(term.labelPt).map((item) => ({ value: item.preferred_label_pt, detail: item.preferred_label_en ?? undefined })) : []; },
    transcribedPersonName: (index, value) => { const sourceIndex = people.findIndex((person) => person === catalogingPeople[index]); if (sourceIndex >= 0) updatePerson(sourceIndex, { transcribedName: value, authorizedName: suggestAuthorizedName(value), authorityId: "" }); },
    orientationLabel: (role, value) => setCardDetails((current) => ({ ...current, [role === "advisor" ? "advisorNoteLabel" : "coadvisorNoteLabel"]: value.slice(0, 60) })),
    publicationPlace: (value) => setCardDetails((current) => ({ ...current, publicationPlace: value.slice(0, 120) })),
    depositYear: (value) => changeYear("deposit", value),
    defenseYear: (value) => changeYear("defense", value),
    hasIllustrations: (value) => setCardDetails((current) => ({ ...current, hasIllustrations: value })),
    extentCount: (value) => setCardDetails((current) => ({ ...current, extentCount: value })),
    dimensions: (value) => setCardDetails((current) => ({ ...current, dimensions: value.slice(0, 120) })),
    accompanyingMaterial: (value) => setCardDetails((current) => ({ ...current, accompanyingMaterial: value.slice(0, 240) })),
    cutter: (value) => setCutterCode(normalizeCutterCode(value)),
    cdu: (value) => { setCduCode(value); setCduCatalogOpen(true); setCduDescription(""); setCduDescriptionKnown(false); setCduDescriptionSaved(false); },
    cutterSuggestions: cutterSuggestions.map((item) => ({ value: item.code, detail: `Prefixo da tabela: ${item.prefix}` })),
    cduSuggestions: cduCatalogSuggestions.map((item) => ({ value: item.cdu_code, detail: item.description })),
    onCduSearchOpen: () => setCduCatalogOpen(true),
    onCduSearchClose: () => setCduCatalogOpen(false),
    onFocus: () => { freeNoteEditStart.current = lastSavedCataloging.current ?? catalogingSnapshot; },
    onBlur: finishFreeNoteEdit,
  } : undefined;
  return <><section className="panel assisted-cataloging" data-review-pending={highlightPendingFields ? "true" : undefined} onKeyDownCapture={(event) => { if (event.key !== "Enter" || event.ctrlKey || event.metaKey || event.altKey || !event.target || !(event.target instanceof HTMLInputElement) || ["checkbox", "radio", "date"].includes(event.target.type)) return; event.preventDefault(); const inputs = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:not([type='checkbox']):not([type='radio']), textarea, select")).filter((item) => !item.disabled && item.getClientRects().length > 0); const next = inputs[inputs.indexOf(event.target) + 1]; if (next) next.focus(); else event.target.blur(); }} onFocusCapture={(event) => { if (event.target.matches("input, textarea, select")) catalogingFieldEdit.current = { target: event.target, previous: lastSavedCataloging.current ?? catalogingSnapshot }; }} onBlurCapture={(event) => { const edit = catalogingFieldEdit.current; if (!edit || edit.target !== event.target) return; catalogingFieldEdit.current = null; if (edit.previous === catalogingSnapshot) return; if (valid) { if (lastSavedCataloging.current === catalogingSnapshot) notifyCatalogingSaved(edit.previous, catalogingSnapshot); else pendingCatalogingNotice.current = { previous: edit.previous, saved: catalogingSnapshot }; } else { confirmDraftField(edit.previous, catalogingSnapshot); } }}>
    <div className="assisted-cataloging__heading"><div><h2>Dados da ficha</h2><p>Confira os nomes, defina os assuntos e complete a classificação antes de revisar a ficha.</p></div>{saveState === "error" && <span className="analysis-workspace__status" role="alert">Falha ao salvar</span>}{saveState === "incomplete" && draftStored && <span className="analysis-workspace__status">Salvando rascunho…</span>}</div>

    <fieldset id="cataloging-people" className="cataloging-people"><legend>Pessoas relacionadas</legend><p className="field-help">A forma do trabalho e a forma autorizada têm usos diferentes na ficha. Confira ambas antes de continuar.</p>
      <div className="cataloging-list">{people.map((person, index) => <Fragment key={`${person.role}-${index}`}>{index === 0 && <div className="cataloging-people__group-heading"><AppIcon name="person" /><strong>{people.filter((item) => item.role === "author").length > 1 ? "Autores" : "Autor"}</strong></div>}{person.role !== "author" && people[index - 1]?.role === "author" && <div className="cataloging-people__group-heading cataloging-people__group-heading--board"><AppIcon name="person" /><strong>Membros da banca</strong></div>}<article className="cataloging-person" draggable={canDragPerson(person)} onDragStart={() => setDraggedPerson(index)} onDragOver={(event) => { if (draggedPerson !== null) event.preventDefault(); }} onDrop={() => { if (draggedPerson !== null) movePerson(draggedPerson, index); setDraggedPerson(null); }}>
        <header className="cataloging-person__header"><span className="cataloging-person__identity">{canDragPerson(person) ? <span className="drag-handle" aria-hidden="true">⋮⋮</span> : <AppIcon name="person" />}<strong>{roleLabels[person.role] ?? "Pessoa relacionada"}{person.role === "advisor" ? " · 1º membro da banca" : person.role === "coadvisor" ? " · 2º membro da banca" : person.role === "committee_member" ? ` · ${people.some((item) => item.role === "coadvisor") ? 3 + people.slice(0, index).filter((item) => item.role === "committee_member").length : 2 + people.slice(0, index).filter((item) => item.role === "committee_member").length}º membro da banca` : ""}{person.role === "author" && isRaue ? ` ${people.slice(0, index + 1).filter((item) => item.role === "author").length}` : ""}</strong></span><div className="cataloging-person__controls">{canDragPerson(person) && <><button type="button" aria-label={`Mover ${roleLabels[person.role]} para cima`} disabled={index === 0 || !((person.role === "author" && people[index - 1]?.role === "author") || (person.role === "committee_member" && people[index - 1]?.role === "committee_member"))} onClick={() => movePerson(index, index - 1)}>↑</button><button type="button" aria-label={`Mover ${roleLabels[person.role]} para baixo`} disabled={index === people.length - 1 || !((person.role === "author" && people[index + 1]?.role === "author") || (person.role === "committee_member" && people[index + 1]?.role === "committee_member"))} onClick={() => movePerson(index, index + 1)}>↓</button></>}{editable && !isFixedPerson(person) && <button className="text-action" type="button" onClick={() => setPeople((current) => current.filter((_, position) => position !== index))}><AppIcon name="close" />Remover</button>}</div></header>
        <div className="cataloging-person__fields">
          <label><CatalogingFieldLabel icon="document">{person.role === "committee_member" ? "Nome na aprovação do trabalho" : "Nome como aparece no trabalho"}</CatalogingFieldLabel><input aria-invalid={highlightPendingFields && !isEmptyExtraPerson(person) && person.transcribedName.trim().length < 3} value={person.transcribedName} disabled={!editable} maxLength={300} placeholder={person.role === "committee_member" ? "Transcreva da folha, página ou ata de aprovação" : "Transcreva da folha de rosto"} onChange={(event) => updatePerson(index, { transcribedName: event.target.value, authorizedName: suggestAuthorizedName(event.target.value), authorityId: "" })} /></label>
          <div className="cataloging-person__authorized"><label htmlFor={`cataloging-authorized-name-${index}`}><CatalogingFieldLabel icon="idCard">Nome autorizado para a ficha</CatalogingFieldLabel></label><div className="cataloging-person__authorized-control"><input id={`cataloging-authorized-name-${index}`} aria-invalid={highlightPendingFields && !isEmptyExtraPerson(person) && (person.authorizedName.trim().length < 3 || authorizedNameNeedsReview(person.authorizedName))} value={person.authorizedName} disabled={!editable} maxLength={300} placeholder="Selecione ou informe a forma autorizada" autoComplete="off" onFocus={() => setActiveAutocomplete(`authority-${index}`)} onBlur={() => window.setTimeout(() => setActiveAutocomplete(null), 120)} onChange={(event) => { setActiveAutocomplete(`authority-${index}`); selectAuthority(index, event.target.value); }} />{hasNameSuggestions(person) && <button className="cataloging-person__suggestions-trigger" type="button" aria-expanded={showNameSuggestions(person, index)} aria-controls={`cataloging-name-choices-${index}`} onClick={() => { setActiveAutocomplete(null); setOpenNameSuggestions(showNameSuggestions(person, index) ? null : nameSuggestionKey(person, index)); }}><AppIcon name="sparkles" />Ver {authorizedNameSuggestions(person.transcribedName).length} sugestões</button>}{editable && !showNameSuggestions(person, index) && activeAutocomplete === `authority-${index}` && authorityMatches(person.authorizedName).length > 0 && <span className="cataloging-autocomplete">{authorityMatches(person.authorizedName).map((item) => <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { updatePerson(index, { authorizedName: item.authorized_name, authorityId: item.id }); setActiveAutocomplete(null); }}>{item.authorized_name}</button>)}</span>}{showNameSuggestions(person, index) && <AuthorizedNameChoices id={`cataloging-name-choices-${index}`} person={person} onChoose={(name) => { selectAuthority(index, name); setOpenNameSuggestions(null); }} onIgnore={() => { setOpenNameSuggestions(null); window.requestAnimationFrame(() => document.getElementById(`cataloging-authorized-name-${index}`)?.focus()); }} />}</div></div>
        </div>
        {person.role === "author" && person.birthYear && !people.slice(0, index).some((item) => item.role === "author" && item.birthYear) && <AuthorBirthYearValidation requestId={requestId} year={person.birthYear} validated={person.birthYearValidated} editable={editable} onValidated={(validated) => setPeople((current) => current.map((item, position) => position === index ? { ...item, birthYearValidated: validated } : item))} />}
      </article></Fragment>)}</div>{editable && <button className="button button--secondary button--small" type="button" onClick={() => setPeople((current) => [...current, { authorityId: "", role: "committee_member", transcribedName: "", authorizedName: "" }])}><AppIcon name="person" />Adicionar membro da banca</button>}</fieldset>

    <fieldset id="cataloging-terms" data-primary-pending={highlightPendingFields && catalogingTerms.filter((term) => term.isPrimary).length !== 1 ? "true" : undefined} data-count-pending={highlightPendingFields && catalogingTerms.length < 3 ? "true" : undefined}><legend>Assuntos controlados</legend><p className="field-help">Informe ao menos três assuntos em português e marque um como principal. Selecione a fonte antes de preencher cada assunto. O equivalente em inglês é opcional: informe-o apenas quando confirmar a forma na fonte consultada.</p><details className="cataloging-vocabulary-notice" open><summary><AppIcon name="help" />Fontes e critérios dos assuntos</summary><div><p>Use as fontes abaixo para controlar os assuntos que serão inseridos na ficha. Consulte a fonte escolhida e registre cada assunto na forma autorizada por ela.</p><div className="cataloging-vocabulary-notice__links"><a href="https://acervo.bn.gov.br/sophia_web/autoridade" target="_blank" rel="noopener noreferrer">Biblioteca Nacional <AppIcon name="external" /></a><a href="https://www.getty.edu/research/tools/vocabularies/aat/" target="_blank" rel="noopener noreferrer">Tesauro de Arte e Arquitetura <AppIcon name="external" /></a><a href="https://pergamumweb.ufba.br" target="_blank" rel="noopener noreferrer">Pergamum UFBA <AppIcon name="external" /></a><a href="https://pergamumweb.ufba.br" target="_blank" rel="noopener noreferrer">Rede Pergamum <AppIcon name="external" /></a><a href="https://id.loc.gov/authorities/subjects.html" target="_blank" rel="noopener noreferrer">Library of Congress Authorities <AppIcon name="external" /></a></div></div></details>{submittedKeywords.length > 0 && <details className="submitted-keywords"><summary>Palavras-chave do estudante <span>Auxiliam na escolha, mas não substituem os assuntos controlados.</span></summary><div>{[...new Set(submittedKeywords.map((item) => item.language))].map((language) => <p key={language}><strong>{language.toUpperCase()}:</strong> {submittedKeywords.filter((item) => item.language === language).sort((a, b) => a.position - b.position).map((item) => item.term).join("; ")}</p>)}</div></details>}<div className="cataloging-list cataloging-term-list">{terms.map((term, index) =>
  <article className="cataloging-row cataloging-row--term" key={`${term.termId}-${index}`} draggable={editable} onDragStart={() => setDraggedTerm(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedTerm !== null) moveTerm(draggedTerm, index); setDraggedTerm(null); }}>
    <div className="cataloging-term__header">
      <div className="cataloging-term__identity"><span className="drag-handle" aria-hidden="true">⋮⋮</span><strong>Assunto {index + 1}</strong></div>
      <div className="cataloging-term__controls">{editable && <><button type="button" aria-label={`Mover assunto ${index + 1} para cima`} disabled={index === 0} onClick={() => moveTerm(index, index - 1)}>↑</button><button type="button" aria-label={`Mover assunto ${index + 1} para baixo`} disabled={index === terms.length - 1} onClick={() => moveTerm(index, index + 1)}>↓</button></>}<label className="radio-choice"><input type="radio" name="primary-term" checked={term.isPrimary} disabled={!editable} onChange={() => setTerms((current) => current.map((entry, position) => ({ ...entry, isPrimary: position === index })))} /><span className="analysis-help-label">Termo principal<span className="analysis-help-mount" /></span></label>{editable && terms.length > 3 && <button className="text-action" type="button" onClick={() => setTerms((current) => { if (current.length <= 3) return current; const next = current.filter((_, position) => position !== index); if (term.isPrimary && next[0]) next[0] = { ...next[0], isPrimary: true }; return next; })}><AppIcon name="close" />Remover</button>}</div>
    </div>
    <div className="cataloging-term__fields">
      <label className="cataloging-term-source"><CatalogingFieldLabel icon="book">Fonte</CatalogingFieldLabel><select aria-invalid={highlightPendingFields && (!isEmptyTerm(term) || catalogingTerms.length < 3) && !term.sourceCode} value={term.sourceCode} disabled={!editable} onChange={(event) => updateTerm(index, { sourceCode: event.target.value })}><option value="">Selecione</option><option value="bn">Biblioteca Nacional</option><option value="aat">Tesauro de Arte e Arquitetura</option><option value="ufba">Pergamum UFBA</option><option value="pergamum">Rede Pergamum</option><option value="loc">Library of Congress</option></select></label>
      <label className="autocomplete-field"><CatalogingFieldLabel icon="tag">Termo preferido — português</CatalogingFieldLabel><input aria-invalid={highlightPendingFields && (!isEmptyTerm(term) || catalogingTerms.length < 3) && (term.labelPt.trim().length < 2 || terms.filter((entry) => entry.labelPt.trim() && entry.labelPt.trim().toLocaleLowerCase("pt-BR") === term.labelPt.trim().toLocaleLowerCase("pt-BR")).length > 1)} value={term.labelPt} disabled={!editable || !term.sourceCode} placeholder={term.sourceCode ? "Assunto conforme a fonte" : "Selecione a fonte primeiro"} maxLength={120} autoComplete="off" onFocus={() => setActiveAutocomplete(`term-${index}`)} onBlur={() => window.setTimeout(() => setActiveAutocomplete(null), 120)} onChange={(event) => { setActiveAutocomplete(`term-${index}`); selectTerm(index, event.target.value); }} />{editable && activeAutocomplete === `term-${index}` && termMatches(term.labelPt).length > 0 && <span className="cataloging-autocomplete">{termMatches(term.labelPt).map((item) => <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { updateTerm(index, { termId: item.id, labelPt: item.preferred_label_pt, labelEn: item.preferred_label_en ?? "", sourceCode: term.sourceCode }); setActiveAutocomplete(null); }}>{item.preferred_label_pt}{item.preferred_label_en ? ` — ${item.preferred_label_en}` : ""}</button>)}</span>}</label>
      <label><CatalogingFieldLabel icon="globe">Equivalente — inglês (opcional)</CatalogingFieldLabel><input value={term.labelEn} disabled={!editable || !term.sourceCode} placeholder={term.sourceCode ? "Somente se verificado na fonte" : "Selecione a fonte primeiro"} maxLength={120} onChange={(event) => updateTerm(index, { labelEn: event.target.value, termId: term.termId })} /></label>
    </div>
  </article>
)}</div>{editable && <button className="button button--secondary button--small" type="button" onClick={() => setTerms((current) => [...current, { termId: "", labelPt: "", labelEn: "", sourceCode: "", isPrimary: current.length === 0 }])}><AppIcon name="tag" />Adicionar termo</button>}</fieldset>

    <fieldset id="cataloging-classification" className="cataloging-classification"><legend>Classificação</legend>
      <div className="cataloging-classification__main">
        <div className="cataloging-classification__left">
          <div className="cataloging-classification__code"><label className="autocomplete-field"><CatalogingFieldLabel icon="hierarchy">CDU</CatalogingFieldLabel><input id="cataloging-cdu-input" aria-invalid={highlightPendingFields && !cduCode.trim()} value={cduCode} disabled={!editable} maxLength={80} onFocus={() => setCduCatalogOpen(true)} onBlur={() => window.setTimeout(() => setCduCatalogOpen(false), 120)} onChange={(event) => { setCduCode(event.target.value); setCduCatalogOpen(true); }} placeholder="Informe ou busque o código CDU" role="combobox" aria-autocomplete="list" aria-expanded={cduCatalogOpen && cduCatalogSuggestions.length > 0} aria-controls="cataloging-cdu-suggestions" />{editable && cduCatalogOpen && cduCatalogSuggestions.length > 0 && <span id="cataloging-cdu-suggestions" className="cataloging-autocomplete cdu-code-suggestions" role="listbox" aria-label="Códigos CDU cadastrados"><small>Códigos cadastrados</small>{cduCatalogSuggestions.map((entry) => <button type="button" role="option" aria-selected={false} key={entry.cdu_code} onMouseDown={(event) => event.preventDefault()} onClick={() => { setCduCode(entry.cdu_code); setCduCatalogOpen(false); }}><strong>{entry.cdu_code}</strong><span>{entry.description}</span></button>)}</span>}</label></div>
          {editable && <div className="cataloging-classification__suggest"><span className="cataloging-classification__suggest-wrap" tabIndex={primaryHistory === "checking" || primaryHistory === "unused" ? 0 : -1} aria-describedby={cduSuggestionHelp ? "cataloging-cdu-suggest-help" : undefined}><button className={`button button--secondary button--small cataloging-classification__suggest-button${primaryHistory === "available" ? " is-available" : ""}`} type="button" onClick={suggestCdu} disabled={primaryHistory !== "available" && primaryHistory !== "error"} aria-describedby={cduSuggestionHelp ? "cataloging-cdu-suggest-help" : undefined}><span className="cataloging-classification__suggest-label"><AppIcon name="sparkles" />Ver sugestões de CDU</span>{primaryHistory === "available" && <small>{availableSuggestionCount} {availableSuggestionCount === 1 ? "sugestão" : "sugestões"}</small>}{primaryHistory !== "available" && primaryHistory !== "error" && primaryHistory !== "none" && <small>{primaryHistory === "checking" ? "Consultando histórico…" : `“${primaryTerm?.labelPt.trim() || "Assunto principal"}” ainda sem fichas`}</small>}</button>{primaryHistory === "none" && <button className="cataloging-classification__guidance-action" type="button" aria-describedby="cataloging-cdu-suggest-help" onClick={() => { const target = document.getElementById("cataloging-terms"); target?.scrollIntoView({ behavior: "smooth", block: "start" }); target?.focus({ preventScroll: true }); setHighlightPendingFields(true); }}>{terms.some((term) => term.labelPt.trim()) ? "Marque um assunto principal" : "Preencha um assunto principal"}</button>}{cduSuggestionHelp && <span id="cataloging-cdu-suggest-help" className="cataloging-classification__suggest-help" role="tooltip">{cduSuggestionHelp}</span>}</span></div>}
          <div className="cataloging-classification__cutter"><label className="autocomplete-field"><CatalogingFieldLabel icon="tag">Cutter do autor</CatalogingFieldLabel><span className="cutter-input-row"><input id="cataloging-cutter-input" aria-invalid={highlightPendingFields && !normalizeCutterCode(cutterCode)} value={cutterCode} disabled={!editable} maxLength={40} onFocus={() => setCutterSuggestionsOpen(true)} onBlur={() => window.setTimeout(() => setCutterSuggestionsOpen(false), 120)} onChange={(event) => { setCutterCode(normalizeCutterCode(event.target.value)); setCutterSuggestionsOpen(true); }} placeholder="Ex.: S237" role="combobox" aria-autocomplete="list" aria-expanded={cutterSuggestionsOpen && cutterSuggestions.length > 0} aria-controls="cutter-suggestions" />{firstAuthorEntry && <span className="cutter-author-entry"><span>1º autor</span><strong>{firstAuthorEntry}</strong></span>}</span>{editable && cutterSuggestionsOpen && cutterSuggestions.length > 0 && <span id="cutter-suggestions" className="cataloging-autocomplete cutter-suggestions" aria-label="Sugestões de Cutter"><small>Para {cutterSurname}</small>{cutterSuggestions.map((suggestion) => <button type="button" key={`${suggestion.prefix}-${suggestion.code}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { setCutterCode(suggestion.code); setCutterSuggestionsOpen(false); }}><strong>{suggestion.code}</strong><span>Prefixo da tabela: {suggestion.prefix}</span></button>)}</span>}</label></div>
        </div>
        <section className="classification-description"><label>Edição da CDU<CduEditionSelect value={cduEdition} disabled={!editable || !cduCode.trim() || cduDescriptionKnown || cduLookupPending} onChange={(event) => setCduEdition(event.target.value)} /></label><label><CatalogingFieldLabel icon="document">Descrição da CDU</CatalogingFieldLabel><textarea id="cataloging-cdu-description" aria-invalid={highlightPendingFields && cduDescriptionPending && !cduLookupPending} value={cduDescription} disabled={!editable || !cduCode.trim() || cduDescriptionKnown} minLength={3} maxLength={1000} rows={2} onChange={(event) => { setCduDescription(event.target.value); setCduDescriptionReadyToSave(""); setCduDescriptionSaved(false); }} onBlur={() => { if (cduDescription.trim().length >= 3) setCduDescriptionReadyToSave(cduDescription); }} placeholder={cduCode ? "Descrição conforme a CDU, 2ª edição" : "Informe primeiro o código CDU"} /></label>{Boolean(cduCode.trim()) && !cduDescriptionKnown && !cduLookupPending && <div className="classification-description__notice"><AppIcon name="book" /><span><strong>Primeiro uso deste código</strong><span>Confira a edição selecionada e informe a descrição. Nos próximos usos, descrição e edição serão recuperadas do catálogo.</span></span></div>}</section>
      </div>
      {suggestionDialogOpen && createPortal(<div className="cdu-suggestion-modal pronto-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSuggestionDialogOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setSuggestionDialogOpen(false); }}><section className="cdu-suggestion-modal__surface pronto-modal-surface" role="dialog" aria-modal="true" aria-labelledby="cdu-suggestion-modal-title"><ModalCloseButton onClick={() => setSuggestionDialogOpen(false)} /><header className="cdu-suggestion-modal__heading"><span className="timeline-dialog__icon" aria-hidden="true"><AppIcon name="sparkles" /></span><div><p className="eyebrow">Classificação</p><h2 id="cdu-suggestion-modal-title">Sugestões de CDU</h2></div></header><p className="cdu-suggestion-modal__intro">Códigos usados em fichas anteriores para o assunto principal. Confira a classificação antes de escolher.</p>{suggestionLoading && <p className="cdu-suggestion-modal__loading" role="status">Consultando sugestões…</p>}{suggestions.length > 0 && <div className="cdu-suggestions" aria-label="Sugestões de CDU"><div className="cdu-suggestions__heading"><strong>Sugestões encontradas</strong><span>Escolha uma CDU e confira a classificação.</span></div>{suggestions.map((suggestion) => <button className="cdu-suggestions__item" type="button" key={suggestion.cdu_code} onClick={() => { setCduCode(suggestion.cdu_code); setSuggestionDialogOpen(false); }} aria-label={`Usar a CDU ${suggestion.cdu_code}`}><span className="cdu-suggestions__code"><small>Código CDU</small><strong>{suggestion.cdu_code}</strong></span><span className="cdu-suggestions__evidence"><span><b>{suggestion.primary_count}</b> {suggestion.primary_count === 1 ? "ficha com este assunto principal" : "fichas com este assunto principal"}</span><span><b>{suggestion.secondary_count}</b> {suggestion.secondary_count === 1 ? "coincidência com assunto complementar" : "coincidências com assuntos complementares"}</span></span><span className="cdu-suggestions__action">Usar código <span aria-hidden="true">→</span></span></button>)}</div>}{suggestionFeedback && <div className={`cataloging-cdu-feedback${suggestionFeedback.kind === "error" ? " is-error" : ""}`} role={suggestionFeedback.kind === "error" ? "alert" : "status"}><span className="cataloging-cdu-feedback__icon"><AppIcon name={suggestionFeedback.kind === "error" ? "help" : "search"} /></span><div><strong>{suggestionFeedback.title}</strong><p>{suggestionFeedback.detail}</p></div><button className="button button--secondary button--small" type="button" onClick={suggestionFeedback.kind === "error" ? suggestCdu : () => { setSuggestionDialogOpen(false); window.setTimeout(() => document.getElementById("cataloging-cdu-input")?.focus(), 0); }}>{suggestionFeedback.kind === "error" ? "Tentar novamente" : "Informar CDU"}</button></div>}<footer className="cdu-suggestion-modal__footer"><button className="button button--secondary" type="button" onClick={() => setSuggestionDialogOpen(false)}><AppIcon name="close" />Fechar</button></footer></section></div>, document.body)}
    </fieldset>



    <fieldset id="cataloging-details" className="cataloging-card-details"><legend>Descrição da ficha</legend>
      {previewBase.request.equivalentTitle && <div className="card-equivalent-decision"><div><strong>Título equivalente</strong><p>Inclua somente se aparecer na folha ou página de rosto.</p></div><label className="check"><input type="checkbox" disabled={!editable || savingEquivalentTitle} checked={includeEquivalentTitle} onChange={(event) => void decideEquivalentTitle(event.target.checked)} /> Exibir na ficha</label>{equivalentTitleError && <p className="form-error" role="alert">{equivalentTitleError}</p>}</div>}
      <div className="classification-grid"><label><CatalogingFieldLabel icon="calendar">{cardDetails.depositDate ? "Data de depósito do trabalho" : "Ano de depósito"}</CatalogingFieldLabel>{cardDetails.depositDate ? <input type="date" min="1900-01-01" aria-invalid={highlightPendingFields && cardDetails.depositYear < 1900} disabled={!editable} value={cardDetails.depositDate} onChange={(event) => { if (event.target.value) setCardDetails((current) => ({ ...current, depositDate: event.target.value, depositYear: Number(event.target.value.slice(0, 4)) })); }} /> : <input type="number" min="1900" max="9999" aria-invalid={highlightPendingFields && cardDetails.depositYear < 1900} disabled={!editable} value={cardDetails.depositYear} onChange={(event) => setCardDetails((current) => ({ ...current, depositYear: Number(event.target.value) }))} />}</label><label><CatalogingFieldLabel icon="calendar">{cardDetails.defenseDate ? "Data de defesa ou apresentação" : "Ano de defesa ou apresentação"}</CatalogingFieldLabel>{cardDetails.defenseDate ? <input type="date" min="1900-01-01" max={cardDetails.depositDate || undefined} aria-invalid={highlightPendingFields && (cardDetails.defenseYear < 1900 || cardDetails.defenseYear > cardDetails.depositYear)} disabled={!editable} value={cardDetails.defenseDate} onChange={(event) => { if (event.target.value) setCardDetails((current) => ({ ...current, defenseDate: event.target.value, defenseYear: Number(event.target.value.slice(0, 4)) })); }} /> : <input type="number" min="1900" max={cardDetails.depositYear} aria-invalid={highlightPendingFields && (cardDetails.defenseYear < 1900 || cardDetails.defenseYear > cardDetails.depositYear)} disabled={!editable} value={cardDetails.defenseYear} onChange={(event) => setCardDetails((current) => ({ ...current, defenseYear: Number(event.target.value) }))} />}</label><label><CatalogingFieldLabel icon="document">{cardDetails.extentUnit === "volumes" ? "Quantidade de volumes" : "Quantidade de páginas"}</CatalogingFieldLabel><input type="number" min={cardDetails.extentUnit === "volumes" ? 2 : 1} max={cardDetails.extentUnit === "volumes" ? 3 : 99999} aria-invalid={highlightPendingFields && cardDetails.extentCount <= 0} disabled={!editable} value={cardDetails.extentCount} onChange={(event) => setCardDetails((current) => ({ ...current, extentCount: Number(event.target.value) }))} /></label><label><CatalogingFieldLabel icon="eye">Ilustrações</CatalogingFieldLabel><select disabled={!editable} value={cardDetails.hasIllustrations ? "yes" : "no"} onChange={(event) => setCardDetails((current) => ({ ...current, hasIllustrations: event.target.value === "yes" }))}><option value="yes">Sim</option><option value="no">Não</option></select></label></div>
      <div className="cataloging-card-details__notes"><label><CatalogingFieldLabel icon="person">Designação da orientação</CatalogingFieldLabel><input disabled={!editable} minLength={3} maxLength={60} value={cardDetails.advisorNoteLabel} onChange={(event) => setCardDetails((current) => ({ ...current, advisorNoteLabel: event.target.value }))} /></label>{people.some((person) => person.role === "coadvisor") && <label><CatalogingFieldLabel icon="person">Designação da coorientação</CatalogingFieldLabel><input disabled={!editable} minLength={3} maxLength={60} value={cardDetails.coadvisorNoteLabel} onChange={(event) => setCardDetails((current) => ({ ...current, coadvisorNoteLabel: event.target.value }))} /></label>}</div>
    </fieldset>

  </section>{pendingTarget && createPortal(reviewSummary, pendingTarget)}{previewTarget && createPortal(<><section className="review-cataloging-preview"><div className="review-cataloging-preview__header"><div className="review-cataloging-preview__header-copy"><div className="review-cataloging-preview__title"><AppIcon name="document" /><h2>Prévia da ficha</h2></div><p>Edite os trechos na tela e confira no PDF a versão para impressão.</p></div><button className="button button--secondary button--small" type="button" disabled={openingPreviewPdf} onClick={() => void openPreviewPdf(Boolean(homologatedAt))}><AppIcon name={homologatedAt ? "document" : "external"} />{openingPreviewPdf ? "Gerando PDF…" : homologatedAt ? "Baixar PDF da ficha" : "Conferir PDF da ficha"}</button></div><section className="review-cataloging-preview__sheet"><div className="review-cataloging-preview__sheet-heading"><div><strong>Como ficará no PDF do estudante</strong><span>{homologatedAt ? "Ficha homologada" : "Prévia para conferência — ainda não homologada"}</span></div>{editable && <span className="review-cataloging-preview__edit-hint"><AppIcon name="edit" />Clique nos trechos pontilhados para editar. A alteração também atualiza o campo correspondente na análise.</span>}</div><div className="review-cataloging-preview__canvas"><CatalogingCardPreview snapshot={shownSnapshot} previewPlaceholders={previewOptions.previewPlaceholders} invalidSubjectPositions={previewOptions.invalidSubjectPositions} onPlaceholderClick={editable ? openPreviewPendingField : undefined} cduDescriptionPending={cduDescriptionPending && !cduLookupPending} onFreeNotesChange={editable ? setFreeNotes : undefined} onConfirmFreeNote={editable ? confirmFreeNote : undefined} onFreeNoteFocus={() => { freeNoteEditStart.current = lastSavedCataloging.current ?? catalogingSnapshot; }} onFreeNoteBlur={finishFreeNoteEdit} directEdit={previewDirectEdit} /></div>{editable && cduDescriptionPending && !cduLookupPending && !cduMergedTarget && <div className="cataloging-cdu-preview-notice" role="status"><AppIcon name="help" /><div><strong>{cduLookupFailed ? "Não foi possível consultar o cadastro da CDU" : "CDU sem descrição cadastrada"}</strong><p>{cduLookupFailed ? "Confira a conexão e a descrição antes de homologar." : "Confira a CDU, 2ª edição impressa, e registre a descrição desse código."}</p></div><button className="button button--secondary button--small" type="button" onClick={() => { const field = document.getElementById("cataloging-cdu-description") as HTMLTextAreaElement | null; field?.scrollIntoView({ behavior: "smooth", block: "center" }); field?.focus({ preventScroll: true }); }}><AppIcon name="arrowRight" />Ir para a descrição</button></div>}{editable && cduMergedTarget && <div className="notice" role="status"><p>Este código foi mesclado no cadastro CDU {cduMergedTarget}. As fichas anteriores permanecem intactas; para este atendimento, escolha o cadastro atual.</p><button type="button" className="button button--secondary button--small" onClick={() => setCduCode(cduMergedTarget)}>Escolher CDU {cduMergedTarget}</button></div>}</section><CatalogingCardHomologation requestId={requestId} snapshot={shownSnapshot} homologatedAt={homologatedAt} canHomologate={canHomologate} pendingReason={homologationPendingReason} nadaConstaApproved={nadaConstaApproved} /></section></>, previewTarget)}</>;
}
