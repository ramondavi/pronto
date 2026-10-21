"use client";

import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { buildCardContent, normalizeCutterCode, prefixBeforeFourthAuthorLetter, type CatalogingCardSnapshot } from "@/domain/cataloging-card/types";

function cardText(value: string, onPlaceholderClick?: (label: string) => void) {
  return value.split(/(\[[^\]]+\])/g).map((part, index) => part.startsWith("[") && part.endsWith("]") && part.toLocaleLowerCase("pt-BR") !== "[recurso eletrônico]" ? onPlaceholderClick ? <button className="cataloging-card__placeholder cataloging-card__placeholder--link" type="button" key={index} onClick={() => onPlaceholderClick(part.slice(1, -1))} title="Ir para o campo pendente">{part}</button> : <span className="cataloging-card__placeholder" key={index}>{part}</span> : part);
}

type DirectSuggestion = { value: string; detail?: string };

export type CardDirectEdit = {
  authorName: (value: string) => void;
  authorSuggestions?: DirectSuggestion[];
  personName: (index: number, value: string) => void;
  personSuggestions: (index: number) => DirectSuggestion[];
  subjectName: (index: number, value: string) => void;
  subjectSuggestions: (index: number) => DirectSuggestion[];
  transcribedPersonName: (index: number, value: string) => void;
  orientationLabel: (role: "advisor" | "coadvisor", value: string) => void;
  publicationPlace: (value: string) => void;
  depositYear: (value: number) => void;
  defenseYear: (value: number) => void;
  hasIllustrations: (value: boolean) => void;
  extentCount: (value: number) => void;
  dimensions: (value: string) => void;
  accompanyingMaterial: (value: string) => void;
  cutter: (value: string) => void;
  cdu: (value: string) => void;
  cutterSuggestions?: DirectSuggestion[];
  cduSuggestions?: DirectSuggestion[];
  onCduSearchOpen?: () => void;
  onCduSearchClose?: () => void;
  onFocus: () => void;
  onBlur: () => void;
};

function EditableCardText({ label, display, value, onChange, onFocus, onBlur, inputMode, suggestions, onSearchOpen, onSearchClose }: { label: string; display: string; value: string; onChange: (value: string) => void; onFocus: () => void; onBlur: () => void; inputMode?: "numeric"; suggestions?: DirectSuggestion[]; onSearchOpen?: () => void; onSearchClose?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  return editing ? <span className="cataloging-card__direct-editor"><input ref={input} className="cataloging-card__direct-input" aria-label={label} aria-invalid={display.includes("[Corrigir forma invertida:")} value={draft} inputMode={inputMode} role={suggestions ? "combobox" : undefined} aria-autocomplete={suggestions ? "list" : undefined} aria-expanded={suggestions ? suggestions.length > 0 : undefined} onChange={(event) => { const next = event.target.value; if (inputMode === "numeric" && !/^\d*$/.test(next)) return; setDraft(next); if (inputMode !== "numeric" || next) onChange(next); }} onFocus={() => { onFocus(); onSearchOpen?.(); }} onBlur={() => { setEditing(false); onSearchClose?.(); onBlur(); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />{suggestions && suggestions.length > 0 && <span className="cataloging-card__direct-suggestions" role="listbox" aria-label={`Sugestões para ${label}`}>{suggestions.map((suggestion) => <button type="button" role="option" aria-selected={false} key={suggestion.value} onMouseDown={(event) => event.preventDefault()} onClick={() => { setDraft(suggestion.value); onChange(suggestion.value); input.current?.blur(); }}><strong>{suggestion.value}</strong>{suggestion.detail && <small>{suggestion.detail}</small>}</button>)}</span>}</span>
    : <button type="button" className={`cataloging-card__direct-field${display.includes("[Corrigir forma invertida:") ? " cataloging-card__direct-field--invalid" : ""}`} title={`Editar ${label.toLocaleLowerCase("pt-BR")}`} aria-label={`Editar ${label}: ${display}`} onClick={() => { setDraft(value); setEditing(true); }}>{cardText(display)}</button>;
}

function EditableCardChoice({ value, onChange, onFocus, onBlur }: { value: boolean; onChange: (value: boolean) => void; onFocus: () => void; onBlur: () => void }) {
  const [editing, setEditing] = useState(false);
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => { if (editing) select.current?.focus(); }, [editing]);
  return editing ? <select ref={select} className="cataloging-card__direct-choice" aria-label="O trabalho tem ilustrações?" value={value ? "yes" : "no"} onFocus={onFocus} onBlur={() => { setEditing(false); onBlur(); }} onChange={(event) => { onChange(event.target.value === "yes"); event.currentTarget.blur(); }}><option value="yes">Sim, il.</option><option value="no">Não</option></select>
    : <button type="button" className={`cataloging-card__direct-field${value ? "" : " cataloging-card__direct-optional"}`} title="Alterar indicação de ilustrações" onClick={() => setEditing(true)}>{value ? " : il." : " · il.?"}</button>;
}

export function CatalogingCardPreview({ snapshot, live = false, onFreeNotesChange, onConfirmFreeNote, onFreeNoteFocus, onFreeNoteBlur, directEdit, cduDescriptionPending = false, previewPlaceholders = false, invalidSubjectPositions = [], onPlaceholderClick }: { snapshot: CatalogingCardSnapshot; live?: boolean; onFreeNotesChange?: (notes: string[]) => void; onConfirmFreeNote?: (index: number) => Promise<boolean>; onFreeNoteFocus?: () => void; onFreeNoteBlur?: () => void; directEdit?: CardDirectEdit; cduDescriptionPending?: boolean; previewPlaceholders?: boolean; invalidSubjectPositions?: number[]; onPlaceholderClick?: (label: string) => void }) {
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [confirmingNote, setConfirmingNote] = useState<number | null>(null);
  const [confirmedValues, setConfirmedValues] = useState<Record<number, string>>({});
  const [noteTop, setNoteTop] = useState(0);
  const [noteConnectorLength, setNoteConnectorLength] = useState(23);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const noteAreaRef = useRef<HTMLDivElement>(null);
  const noteToolsRef = useRef<HTMLElement>(null);
  const content = buildCardContent(snapshot, { previewPlaceholders, invalidSubjectPositions, cduDescriptionPending });
  const freeNotes = snapshot.freeNotes ?? [];
  const standardNotes = onFreeNotesChange ? content.notes.slice(0, content.notes.length - freeNotes.filter((note) => note.trim()).length) : content.notes;
  const firstAuthor = snapshot.people.filter((person) => person.role === "author").sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
  const anchor = prefixBeforeFourthAuthorLetter(firstAuthor?.authorizedName ?? "");
  const editEvents = directEdit ? { onFocus: directEdit.onFocus, onBlur: directEdit.onBlur } : null;
  const hanging = (value: string, className?: string, key?: string) => <p key={key ?? value} className={className}><span aria-hidden="true" className="cataloging-card__hanging-anchor">{anchor}</span>{cardText(value, onPlaceholderClick)}</p>;

  useEffect(() => { if (editingNote !== null) noteInput.current?.focus(); }, [editingNote]);
  useEffect(() => {
    if (!onFreeNotesChange) return;
    const update = () => {
      if (!previewRef.current || !noteAreaRef.current || !noteToolsRef.current) return;
      const preview = previewRef.current.getBoundingClientRect();
      const noteArea = noteAreaRef.current.getBoundingClientRect();
      const tools = noteToolsRef.current.getBoundingClientRect();
      const nextTop = Math.round(Math.max(0, noteArea.top - preview.top - 22));
      const nextLength = Math.round(Math.max(0, tools.left - noteArea.right));
      setNoteTop((current) => current === nextTop ? current : nextTop);
      setNoteConnectorLength((current) => current === nextLength ? current : nextLength);
    };
    update();
    const observer = new ResizeObserver(update);
    if (previewRef.current) observer.observe(previewRef.current);
    if (noteAreaRef.current) observer.observe(noteAreaRef.current);
    return () => observer.disconnect();
  }, [onFreeNotesChange, freeNotes.length, editingNote]);
  const changeNote = (index: number, value: string) => onFreeNotesChange?.(freeNotes.map((note, position) => position === index ? value : note));
  const moveNote = (index: number, destination: number) => {
    const next = [...freeNotes];
    [next[index], next[destination]] = [next[destination], next[index]];
    onFreeNotesChange?.(next);
    setEditingNote(null);
    setConfirmedValues({});
  };
  async function confirmNote(index: number) {
    if (!onConfirmFreeNote || confirmingNote !== null) return;
    setConfirmingNote(index);
    const confirmed = await onConfirmFreeNote(index);
    setConfirmingNote(null);
    if (confirmed) { setEditingNote(null); setConfirmedValues((current) => ({ ...current, [index]: freeNotes[index].trim() })); }
  }

  const place = snapshot.request.publicationPlace?.trim() || (snapshot.request.publicationPlace === "" && previewPlaceholders ? "[Local de publicação]" : "Salvador");
  const depositYear = snapshot.request.depositYear && snapshot.request.depositYear >= 1900 && snapshot.request.depositYear >= (snapshot.request.defenseYear ?? 0) ? String(snapshot.request.depositYear) : previewPlaceholders ? "[Ano de depósito]" : "";
  const depositSuffix = depositYear ? ` ${snapshot.catalogingConventions.statementSeparator ?? "—"} ${place}, ${depositYear}.` : "";
  const titleBeforeDeposit = depositSuffix && content.titleStatement.endsWith(depositSuffix) ? content.titleStatement.slice(0, -depositSuffix.length) : content.titleStatement;
  const electronicLabel = snapshot.catalogingConventions.electronicResourceLabel;
  const transcribedAuthor = firstAuthor?.transcribedName.trim().replace(/[\s.;:]+$/u, "") ?? "";
  const responsibilitySuffix = transcribedAuthor ? ` / ${transcribedAuthor}.` : "";
  const titleWithoutResponsibility = responsibilitySuffix && titleBeforeDeposit.endsWith(responsibilitySuffix) ? titleBeforeDeposit.slice(0, -responsibilitySuffix.length) : titleBeforeDeposit;
  const canEditResponsibility = Boolean(responsibilitySuffix && titleBeforeDeposit.endsWith(responsibilitySuffix) && firstAuthor && directEdit && editEvents);
  const electronicPosition = titleWithoutResponsibility.indexOf(electronicLabel);
  const advisor = snapshot.people.find((person) => person.role === "advisor");
  const coadvisor = snapshot.people.find((person) => person.role === "coadvisor");
  const orientationPeople = [advisor, coadvisor];
  const defenseYear = snapshot.request.defenseYear && snapshot.request.defenseYear >= 1900 && snapshot.request.defenseYear <= (snapshot.request.depositYear ?? 0) ? String(snapshot.request.defenseYear) : previewPlaceholders ? "[Ano de defesa/apresentação]" : "";
  const academicYearSuffix = defenseYear ? `${defenseYear}.` : "";
  const academicBeforeYear = academicYearSuffix && content.academicNote.endsWith(academicYearSuffix) ? content.academicNote.slice(0, -academicYearSuffix.length) : content.academicNote;

  const titleLine = <p><span aria-hidden="true" className="cataloging-card__hanging-anchor">{anchor}</span>{electronicPosition < 0 ? cardText(titleWithoutResponsibility, onPlaceholderClick) : <>{cardText(titleWithoutResponsibility.slice(0, electronicPosition), onPlaceholderClick)}{electronicLabel}{cardText(titleWithoutResponsibility.slice(electronicPosition + electronicLabel.length), onPlaceholderClick)}</>}{canEditResponsibility && <> / <EditableCardText label="Nome do autor no trabalho" display={transcribedAuthor} value={firstAuthor!.transcribedName} onChange={(value) => directEdit!.transcribedPersonName(snapshot.people.indexOf(firstAuthor!), value)} {...editEvents!} />.</>}{depositSuffix && <> {snapshot.catalogingConventions.statementSeparator ?? "—"} {directEdit && editEvents ? <EditableCardText label="Local de publicação" display={place} value={snapshot.request.publicationPlace ?? ""} onChange={directEdit.publicationPlace} {...editEvents} /> : cardText(place, onPlaceholderClick)}, {directEdit && editEvents && snapshot.request.depositYear ? <EditableCardText label="Ano de depósito" display={depositYear} value={String(snapshot.request.depositYear)} inputMode="numeric" onChange={(value) => directEdit.depositYear(Number(value))} {...editEvents} /> : cardText(depositYear, onPlaceholderClick)}.</>}</p>;

  const tracingLine = <p><span aria-hidden="true" className="cataloging-card__hanging-anchor">{anchor}</span>{content.tracingEntries.map((entry, index) => <span key={`${entry.kind}-${index}`}>{index > 0 ? " " : ""}{entry.kind === "person" && entry.personIndex !== undefined && entry.personIndex >= 0 && directEdit && editEvents ? <>{entry.prefix}<EditableCardText label="Nome autorizado da pessoa relacionada" display={entry.name ?? ""} value={snapshot.people[entry.personIndex].authorizedName} suggestions={directEdit.personSuggestions(entry.personIndex)} onChange={(value) => directEdit.personName(entry.personIndex!, value)} {...editEvents} />{entry.suffix}</> : entry.kind === "subject" && entry.subjectIndex !== undefined && snapshot.subjects[entry.subjectIndex]?.labelPt && !entry.text.includes("[") && directEdit && editEvents ? <>{entry.prefix}<EditableCardText label={`Assunto controlado ${entry.subjectIndex + 1}`} display={entry.name ?? ""} value={snapshot.subjects[entry.subjectIndex].labelPt} suggestions={directEdit.subjectSuggestions(entry.subjectIndex)} onChange={(value) => directEdit.subjectName(entry.subjectIndex!, value)} {...editEvents} />{entry.suffix}</> : cardText(entry.text, onPlaceholderClick)}</span>)}</p>;

  const standardNoteLine = (note: string, index: number) => {
    const person = orientationPeople[index];
    const role = person?.role === "coadvisor" ? "coadvisor" : "advisor";
    const label = person?.noteLabel ?? (role === "advisor" ? "Orientador" : "Coorientador");
    const personIndex = person ? snapshot.people.indexOf(person) : -1;
    return !person || !directEdit || !editEvents ? hanging(note, undefined, `note-${index}`) : <p key={`note-${index}`}><span aria-hidden="true" className="cataloging-card__hanging-anchor">{anchor}</span><EditableCardText label="Designação da orientação" display={label} value={label} onChange={(value) => directEdit.orientationLabel(role, value)} {...editEvents} />: <EditableCardText label={`Nome de ${label.toLocaleLowerCase("pt-BR")} no trabalho`} display={person.transcribedName} value={person.transcribedName} onChange={(value) => directEdit.transcribedPersonName(personIndex, value)} {...editEvents} />.</p>;
  };

  return <section ref={previewRef} className={`cataloging-card-preview${onFreeNotesChange ? " cataloging-card-preview--editable" : ""}`} aria-live={live ? "polite" : undefined}>
    {live && <div className="cataloging-card-preview__label"><strong>Prévia em tempo real</strong><span>Atualizada durante a edição</span></div>}
    <article className="cataloging-card" aria-label="Prévia da ficha catalográfica">
      <header><strong>Dados Internacionais de Catalogação na Publicação (CIP)</strong><strong>{snapshot.institution.university}</strong><strong>{snapshot.institution.librarySystem}</strong><strong>{snapshot.institution.library}</strong></header>
      <div className="cataloging-card__body"><span className="cataloging-card__cutter">{directEdit && editEvents && snapshot.classification.cutter.trim() ? <EditableCardText label="Cutter" suggestions={directEdit.cutterSuggestions} display={normalizeCutterCode(snapshot.classification.cutter) || (previewPlaceholders ? "[Cutter do autor]" : "")} value={snapshot.classification.cutter} onChange={directEdit.cutter} {...editEvents} /> : cardText(normalizeCutterCode(snapshot.classification.cutter) || (previewPlaceholders ? "[Cutter do autor]" : ""), onPlaceholderClick)}</span><div className="cataloging-card__content">
        <p className="cataloging-card__authorized">{directEdit && editEvents && firstAuthor ? <EditableCardText label="Nome autorizado do primeiro autor" display={content.authorizedAuthor} value={firstAuthor.authorizedName} suggestions={directEdit.authorSuggestions} onChange={directEdit.authorName} {...editEvents} /> : cardText(content.authorizedAuthor, onPlaceholderClick)}</p>
        {directEdit && editEvents ? titleLine : hanging(content.titleStatement)}
        {content.physicalDescription && (directEdit && editEvents && snapshot.request.extentCount ? <p><span aria-hidden="true" className="cataloging-card__hanging-anchor">{anchor}</span><EditableCardText label={snapshot.request.extentUnit === "volumes" ? "Quantidade de volumes" : "Quantidade de páginas"} display={String(snapshot.request.extentCount)} value={String(snapshot.request.extentCount)} inputMode="numeric" onChange={(value) => directEdit.extentCount(Number(value))} {...editEvents} /> {snapshot.request.extentUnit === "volumes" ? snapshot.catalogingConventions.volumeAbbreviation ?? "v." : snapshot.catalogingConventions.pageAbbreviation ?? "p."}<EditableCardChoice value={Boolean(snapshot.request.hasIllustrations)} onChange={directEdit.hasIllustrations} {...editEvents} />{snapshot.request.dimensions?.trim() ? " ; " : " "}<EditableCardText label="Dimensões" display={snapshot.request.dimensions?.trim() || "Adicionar dimensões"} value={snapshot.request.dimensions ?? ""} onChange={directEdit.dimensions} {...editEvents} />{snapshot.request.accompanyingMaterial?.trim() ? " + " : " "}<EditableCardText label="Material acompanhante" display={snapshot.request.accompanyingMaterial?.trim() || "Adicionar material acompanhante"} value={snapshot.request.accompanyingMaterial ?? ""} onChange={directEdit.accompanyingMaterial} {...editEvents} /></p> : hanging(content.physicalDescription))}
        {content.academicNote && <><div className="cataloging-card__blank-line" aria-hidden="true" />{directEdit && editEvents ? <p><span aria-hidden="true" className="cataloging-card__hanging-anchor">{anchor}</span>{cardText(academicBeforeYear, onPlaceholderClick)}{snapshot.request.defenseYear ? <EditableCardText label="Ano de defesa ou apresentação" display={defenseYear} value={String(snapshot.request.defenseYear)} inputMode="numeric" onChange={(value) => directEdit.defenseYear(Number(value))} {...editEvents} /> : cardText(defenseYear, onPlaceholderClick)}.</p> : hanging(content.academicNote)}</>}
        {standardNotes.map(standardNoteLine)}
        {onFreeNotesChange && <div ref={noteAreaRef} className="cataloging-card__free-notes" aria-label="Notas adicionais da ficha">
          {freeNotes.map((note, index) => <div className={`cataloging-card__free-note${editingNote === index ? " is-editing" : ""}`} key={index}>
            {index === 0 && <div className="cataloging-card__blank-line" aria-hidden="true" />}
            {editingNote === index ? <label data-no-field-help><span>Nota {index + 1}</span><textarea ref={noteInput} rows={2} maxLength={500} value={note} onFocus={onFreeNoteFocus} onBlur={() => { setEditingNote(null); onFreeNoteBlur?.(); }} onChange={(event) => changeNote(index, event.target.value)} /></label>
              : <button className="cataloging-card__note-text" type="button" onClick={() => setEditingNote(index)} aria-label={`Editar nota ${index + 1}: ${note || "vazia"}`}><span aria-hidden="true" className="cataloging-card__hanging-anchor">{anchor}</span>{note || "Escrever nota…"}</button>}
          </div>)}
        </div>}
        <div className="cataloging-card__blank-line" aria-hidden="true" />{directEdit && editEvents ? tracingLine : hanging(content.tracings)}<div className="cataloging-card__blank-line" aria-hidden="true" /><p className={`cataloging-card__cdu${cduDescriptionPending ? " cataloging-card__cdu--pending" : ""}`}>CDU: {directEdit && editEvents && snapshot.classification.cdu.trim() ? <EditableCardText label="Código da CDU" suggestions={directEdit.cduSuggestions} onSearchOpen={directEdit.onCduSearchOpen} onSearchClose={directEdit.onCduSearchClose} display={snapshot.classification.cdu || (previewPlaceholders ? "[Código CDU]" : "")} value={snapshot.classification.cdu} onChange={directEdit.cdu} {...editEvents} /> : cardText(snapshot.classification.cdu || (previewPlaceholders ? "[Código CDU]" : ""), onPlaceholderClick)}{cduDescriptionPending && (onPlaceholderClick ? <button className="cataloging-card__cdu-pending-label" type="button" onClick={() => onPlaceholderClick("Descrição pendente")}>Descrição pendente</button> : <span className="cataloging-card__cdu-pending-label" role="status">Descrição pendente</span>)}</p>
      </div></div>
      <footer>{cardText(content.technicalResponsibility, onPlaceholderClick)}</footer>
      <p className="cataloging-card__issuance"><AppIcon name="check" /><span>Ficha validada por bibliotecário(a) e emitida eletronicamente pelo <em>Pronto!</em>.</span></p>
    </article>
    {onFreeNotesChange && <aside ref={noteToolsRef} className="cataloging-card__note-tools" style={{ marginTop: noteTop, "--note-connector-length": `${noteConnectorLength}px` } as React.CSSProperties} aria-label="Edição das notas da ficha"><strong>Notas da ficha · opcionais</strong><p>Se incluir notas, confira a redação conforme a AACR2 e confirme cada uma ao terminar. O rascunho é salvo automaticamente.</p>{freeNotes.map((note, index) => <div className="cataloging-card__note-tool" key={index}><button type="button" className="cataloging-card__note-tool-title" onClick={() => setEditingNote(index)}>Editar nota {index + 1}</button><span className="cataloging-card__note-tool-actions"><button type="button" disabled={index === 0} onClick={() => moveNote(index, index - 1)} aria-label={`Subir nota ${index + 1}`}>↑</button><button type="button" disabled={index === freeNotes.length - 1} onClick={() => moveNote(index, index + 1)} aria-label={`Descer nota ${index + 1}`}>↓</button><button type="button" onClick={() => { onFreeNotesChange(freeNotes.filter((_, position) => position !== index)); setEditingNote(null); setConfirmedValues({}); }} aria-label={`Remover nota ${index + 1}`}>Remover</button></span>{onConfirmFreeNote && <button className="cataloging-card__confirm-note" type="button" disabled={confirmingNote !== null || note.trim().length < 3 || confirmedValues[index] === note.trim()} onClick={() => void confirmNote(index)}>{confirmingNote === index ? "Confirmando…" : confirmedValues[index] === note.trim() ? "✓ Redação confirmada" : "Confirmar redação"}</button>}</div>)}{freeNotes.length < 12 && <button className="cataloging-card__add-note" type="button" onClick={() => { setEditingNote(freeNotes.length); onFreeNotesChange([...freeNotes, ""]); }}>+ Adicionar nota</button>}</aside>}
  </section>;
}
