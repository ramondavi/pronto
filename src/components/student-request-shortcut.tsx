"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { restoreStudentRequestDraft, studentPreviewDraftKey, studentRequestDraftKey } from "@/domain/student-requests/draft";
import { AppIcon } from "@/components/app-icon";
import { readStudentPreparation, readStudentPreviewPreparation, StudentRequestConfirmations, studentPreparationEvent, studentPreparationKey } from "@/components/student-request-confirmations";
import { isStudentDraftComplete, type Program } from "@/components/student-request-form";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function StudentRequestShortcut({ className, emptyLabel = "Iniciar solicitação", programs, userId, preview = false, previewHref = "/painel/visao-estudante?tela=solicitacao" }: { className?: string; emptyLabel?: string; programs: Program[]; userId: string; preview?: boolean; previewHref?: string }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const draftKey = studentRequestDraftKey(userId);
  const [hasDraft, setHasDraft] = useState(false);
  const [complete, setComplete] = useState(false);
  const [savedAt, setSavedAt] = useState<string>();
  const [prepared, setPrepared] = useState(false);
  useEffect(() => {
    if (preview) {
      setPrepared(readStudentPreviewPreparation().every(Boolean));
      const onChange = (event: Event) => {
        const values = (event as CustomEvent<boolean[]>).detail;
        setPrepared(Array.isArray(values) && values.length === 4 && values.every(Boolean));
      };
      window.addEventListener(studentPreparationEvent, onChange);
      return () => window.removeEventListener(studentPreparationEvent, onChange);
    }
    const load = () => setPrepared(readStudentPreparation(userId).every(Boolean));
    const onChange = (event: Event) => {
      const values = (event as CustomEvent<boolean[]>).detail;
      setPrepared(Array.isArray(values) && values.length === 4 && values.every(Boolean));
    };
    const onStorage = (event: StorageEvent) => { if (event.key === studentPreparationKey(userId)) load(); };
    load();
    window.addEventListener(studentPreparationEvent, onChange);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(studentPreparationEvent, onChange); window.removeEventListener("storage", onStorage); };
  }, [userId, preview]);
  useEffect(() => {
    const loadDraft = () => {
    try {
      const stored = preview ? sessionStorage.getItem(studentPreviewDraftKey) : localStorage.getItem(draftKey);
      setHasDraft(Boolean(stored));
      if (!stored) { setComplete(false); setSavedAt(undefined); return; }
      const parsed = JSON.parse(stored);
      setComplete(isStudentDraftComplete(restoreStudentRequestDraft(parsed?.draft ?? parsed), programs));
      setSavedAt(typeof parsed?.savedAt === "string" && Number.isFinite(Date.parse(parsed.savedAt)) ? parsed.savedAt : undefined);
    } catch { setHasDraft(false); setComplete(false); setSavedAt(undefined); }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === (preview ? studentPreviewDraftKey : draftKey)) loadDraft(); };
    loadDraft();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", loadDraft);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", loadDraft); };
  }, [draftKey, programs, preview]);
  const label = t(complete ? "Revisar e enviar" : hasDraft ? "Continuar preenchimento" : emptyLabel);
  return <div className="student-request-shortcut">{!hasDraft && <StudentRequestConfirmations userId={userId} preview={preview} />}<div className="student-request-shortcut__action">{(hasDraft || prepared) ? <Link className={className} href={preview ? previewHref : complete ? "/painel/solicitacao/nova?revisao=1" : "/painel/solicitacao/nova"}>{label}</Link> : <button className={className} type="button" disabled aria-describedby="student-preparation-pending">{label}</button>}{!hasDraft && !prepared && <span className="student-request-shortcut__pending" id="student-preparation-pending">{t("Marque as quatro confirmações para continuar.")}</span>}{hasDraft && savedAt && <span className="student-request-shortcut__saved"><AppIcon name="check" /><span>{t("Rascunho salvo neste dispositivo")}<time dateTime={savedAt}>{new Date(savedAt).toLocaleString(language === "pt" ? "pt-BR" : language, { dateStyle: "short", timeStyle: "short" })}</time></span></span>}</div></div>;
}
