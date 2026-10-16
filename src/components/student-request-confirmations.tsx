"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export const preparationItems = [
  "Meu trabalho foi apresentado ou defendido e aprovado pela banca.",
  "O arquivo é a versão final e está completo.",
  "O arquivo contém a ata, folha ou página de aprovação datada e assinada.",
  "Tenho um link público que permite visualizar o trabalho completo.",
] as const;

export const studentPreparationEvent = "pronto:student-preparation-changed";
export const studentPreparationKey = (userId: string) => `pronto:student-preparation:${userId}`;
export const studentPreviewPreparationKey = "pronto:student-preview-preparation";

export function readStudentPreviewPreparation(): boolean[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(studentPreviewPreparationKey) ?? "null");
    return Array.isArray(value) && value.length === preparationItems.length ? preparationItems.map((_, index) => value[index] === true) : preparationItems.map(() => false);
  } catch { return preparationItems.map(() => false); }
}

export function readStudentPreparation(userId: string): boolean[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(studentPreparationKey(userId)) ?? "null");
    return Array.isArray(value) && value.length === preparationItems.length ? preparationItems.map((_, index) => value[index] === true) : preparationItems.map(() => false);
  } catch { return preparationItems.map(() => false); }
}

export function StudentRequestConfirmations({ userId, preview = false }: { userId: string; preview?: boolean }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const [checked, setChecked] = useState<boolean[]>(() => preparationItems.map(() => false));
  useEffect(() => {
    if (preview) { setChecked(readStudentPreviewPreparation()); return; }
    const load = () => setChecked(readStudentPreparation(userId));
    load();
    const onStorage = (event: StorageEvent) => { if (event.key === studentPreparationKey(userId)) load(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId, preview]);
  const setItem = (index: number, value: boolean) => {
    const next = checked.map((item, position) => position === index ? value : item);
    setChecked(next);
    try { if (preview) sessionStorage.setItem(studentPreviewPreparationKey, JSON.stringify(next)); else localStorage.setItem(studentPreparationKey(userId), JSON.stringify(next)); } catch { /* A marcação permanece nesta página. */ }
    window.dispatchEvent(new CustomEvent(studentPreparationEvent, { detail: next }));
  };
  return <div className="before-request-panel" aria-labelledby="student-preparation-title">
    <p className="eyebrow" id="student-preparation-title"><AppIcon name="check" /> {t("Confirmações antes de solicitar")}</p>
    <p className="before-request-panel__intro">{t("Marque cada item para liberar o preenchimento da solicitação.")}</p>
    <div className="before-request-panel__checks">{preparationItems.map((item, index) => <label key={item}><input type="checkbox" checked={checked[index]} onChange={(event) => setItem(index, event.target.checked)} /><span>{t(item)}</span></label>)}</div>
    <Link className="before-request-panel__guide" href="/ajuda/artigos/preparar-solicitacao" target="_blank" rel="noopener noreferrer">{t("Leia o guia completo de preparação")} <AppIcon name="arrowRight" /></Link>
  </div>;
}
