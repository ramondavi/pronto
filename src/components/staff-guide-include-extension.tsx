"use client";

import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { AppIcon } from "./app-icon";

function StaffGuideIncludeView({ node }: NodeViewProps) {
  const label = String(node.attrs.label || "Capítulo ou tópico do guia");
  return <NodeViewWrapper className="rich-editor__guide-include" contentEditable={false}>
    <AppIcon name="book" /><span>Trecho incorporado: <strong>{label}</strong></span>
  </NodeViewWrapper>;
}

export const StaffGuideIncludeNode = Node.create({
  name: "staffGuideInclude",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() { return {
    source: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute("data-guide-include") },
    label: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute("data-guide-label") },
  }; },
  parseHTML() { return [{ tag: "div[data-guide-include]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", { "data-guide-include": HTMLAttributes.source, "data-guide-label": HTMLAttributes.label }]; },
  addNodeView() { return ReactNodeViewRenderer(StaffGuideIncludeView); },
});
