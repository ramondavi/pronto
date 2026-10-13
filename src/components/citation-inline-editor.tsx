"use client";

import { useEffect, useRef } from "react";
import { AppIcon } from "@/components/app-icon";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toHtml(value: string) {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

function toText(element: HTMLElement) {
  const read = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof HTMLElement)) return "";
    const content = Array.from(node.childNodes).map(read).join("");
    if (node.tagName === "STRONG" || node.tagName === "B") return `**${content}**`;
    if (node.tagName === "BR") return "\n";
    return content + (node.tagName === "DIV" || node.tagName === "P" ? "\n" : "");
  };
  return Array.from(element.childNodes).map(read).join("").trimEnd();
}

export function CitationInlineEditor({ value, editable, onChange }: { value: string; editable: boolean; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) ref.current.innerHTML = toHtml(value);
  }, [value]);
  return <div className="citation-inline-editor"><div className="citation-inline-editor__toolbar"><span><AppIcon name="book" />Referência ABNT</span>{editable && <button type="button" title="Aplicar negrito ao texto selecionado" aria-label="Aplicar negrito ao texto selecionado" onMouseDown={(event) => event.preventDefault()} onClick={() => { ref.current?.focus(); document.execCommand("bold"); if (ref.current) onChange(toText(ref.current)); }}><strong>B</strong> Negrito</button>}</div><div ref={ref} className="citation-inline-editor__content" role="textbox" aria-label="Editar referência ABNT" aria-multiline="true" contentEditable={editable} suppressContentEditableWarning onInput={() => { if (ref.current) onChange(toText(ref.current)); }} /></div>;
}
