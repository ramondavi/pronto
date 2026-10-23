"use client";

import { createContext, useCallback, useContext, useImperativeHandle, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode, type FormEvent } from "react";
import { AppIcon } from "./app-icon";

type SaveState = "saved" | "dirty" | "saving" | "error";
type Snapshot = Record<string, string[]>;
const SaveContext = createContext<SaveState>("saved");

function snapshot(form: HTMLFormElement): Snapshot {
  const values: Snapshot = {};
  for (const [name, value] of new FormData(form)) {
    (values[name] ??= []).push(typeof value === "string" ? value : value.name);
  }
  return values;
}

function sameValues(left: string[] = [], right: string[] = []) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function SavedForm({ onSave, children, className = "", initiallySaved = true, ref: externalRef, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit" | "onChange" | "onInput"> & {
  onSave: (data: FormData) => Promise<boolean>;
  children: ReactNode;
  initiallySaved?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = useRef<Snapshot | null>(null);
  const saving = useRef(false);
  const hasSaved = useRef(initiallySaved);
  const [hasBeenSaved, setHasBeenSaved] = useState(initiallySaved);
  const [state, setState] = useState<SaveState>(initiallySaved ? "saved" : "dirty");
  useImperativeHandle(externalRef, () => formRef.current!, []);

  const refresh = useCallback(() => {
    const form = formRef.current;
    if (!form || !baseline.current) return false;
    const current = snapshot(form);
    const names = new Set([...Object.keys(current), ...Object.keys(baseline.current)]);
    const changed = new Set([...names].filter((name) => !sameValues(current[name], baseline.current![name])));
    for (const field of form.querySelectorAll<HTMLElement>("input,select,textarea,[data-save-name]")) {
      const name = field.dataset.saveName || (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement ? field.name : "");
      if (name) field.dataset.saveState = changed.has(name) || !hasSaved.current ? "dirty" : "saved";
    }
    const dirty = changed.size > 0 || !hasSaved.current;
    if (!saving.current) setState(dirty ? "dirty" : "saved");
    return dirty;
  }, []);

  useLayoutEffect(() => {
    if (formRef.current) baseline.current = snapshot(formRef.current);
    refresh();
    const observer = new MutationObserver(refresh);
    if (formRef.current) observer.observe(formRef.current, { subtree: true, attributes: true, attributeFilter: ["value", "checked"] });
    return () => observer.disconnect();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !refresh()) return;
    const form = event.currentTarget;
    const submitted = snapshot(form);
    const data = new FormData(form);
    saving.current = true;
    setState("saving");
    let confirmed = false;
    try { confirmed = await onSave(data); }
    catch { confirmed = false; }
    finally { saving.current = false; }
    if (confirmed) {
      hasSaved.current = true;
      setHasBeenSaved(true);
      baseline.current = submitted;
      refresh();
    } else setState("error");
  }

  const label = state === "saving" ? "Salvando…" : state === "dirty" ? hasBeenSaved ? "Alterações não salvas" : "Novo registro não salvo" : state === "error" ? "Salvamento não confirmado. Tente novamente." : "Dados salvos";
  return <SaveContext.Provider value={state}>
    <form {...props} ref={formRef} className={"saved-form " + className} data-save-state={state} aria-busy={state === "saving"} onSubmit={submit} onInput={() => queueMicrotask(refresh)} onChange={() => queueMicrotask(refresh)}>
      <div className="saved-form__status" role="status" aria-live="polite"><AppIcon name={state === "saved" ? "check" : state === "saving" ? "clock" : "edit"} />{label}</div>
      {children}
    </form>
  </SaveContext.Provider>;
}

export function SaveButton({ children, disabled, ...props }: ComponentProps<"button">) {
  const state = useContext(SaveContext);
  return <button {...props} type="submit" disabled={disabled || state === "saved" || state === "saving"}>
    <AppIcon name={state === "saved" ? "check" : state === "saving" ? "clock" : "edit"} />
    {state === "saved" ? "Salvo" : state === "saving" ? "Salvando…" : children ?? "Salvar alterações"}
  </button>;
}
