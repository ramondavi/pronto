"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { AppIcon } from "./app-icon";
import { staffPanelReferenceByKey } from "@/lib/staff-panel-references";
import { publicInterfaceReferenceByKey } from "@/lib/public-interface-references";
import type { InterfaceLanguage } from "@/lib/interface-language";

function StaffPanelReferenceView({ node }: NodeViewProps) {
  const key = String(node.attrs.key);
  const staff = staffPanelReferenceByKey.get(key);
  const publicReference = publicInterfaceReferenceByKey.get(key);
  const language = String(node.attrs.language ?? "pt") as InterfaceLanguage;
  const label = staff?.label ?? publicReference?.labels[language] ?? publicReference?.labels.pt;
  const icon = staff?.icon ?? publicReference?.icon;
  return <NodeViewWrapper as="span" className={`staff-panel-reference${staff?.kind === "field" || publicReference && !publicReference.icon ? " staff-panel-reference--field" : ""}`} data-panel-ref={key} title={staff?.group ?? publicReference?.group} contentEditable={false}>
    {label ? <>{icon && <AppIcon name={icon} />}<span>{label}</span></> : <span>Elemento do painel indisponível</span>}
  </NodeViewWrapper>;
}

export const StaffPanelReferenceNode = Node.create({
  name: "staffPanelReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() { return {
    key: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute("data-panel-ref"), renderHTML: (attributes: { key: string }) => ({ "data-panel-ref": attributes.key }) },
    language: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute("data-panel-language"), renderHTML: (attributes: { language: string | null }) => attributes.language ? { "data-panel-language": attributes.language } : {} },
  }; },
  parseHTML() { return [{ tag: "span[data-panel-ref]" }]; },
  renderHTML({ HTMLAttributes }) {
    const key = String(HTMLAttributes["data-panel-ref"] ?? "");
    const language = String(HTMLAttributes["data-panel-language"] ?? "pt") as InterfaceLanguage;
    return ["span", mergeAttributes(HTMLAttributes), staffPanelReferenceByKey.get(key)?.label ?? publicInterfaceReferenceByKey.get(key)?.labels[language] ?? "Elemento do painel"];
  },
  addNodeView() { return ReactNodeViewRenderer(StaffPanelReferenceView); },
});
