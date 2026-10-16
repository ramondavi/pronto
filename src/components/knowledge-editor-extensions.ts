import { Extension, Mark, Node, mergeAttributes, type DOMOutputSpecArray } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { headingIconChoices, headingIconColors } from "@/lib/knowledge-heading-options";

export const KnowledgeImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      linkHref: { default: null, parseHTML: (element: HTMLElement) => element.closest("a[href]")?.getAttribute("href") ?? null, renderHTML: () => ({}) },
      linkTarget: { default: "_blank", parseHTML: (element: HTMLElement) => element.closest("a[href]")?.getAttribute("target") === "_self" ? "_self" : "_blank", renderHTML: () => ({}) },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const image: DOMOutputSpecArray = ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    if (!node.attrs.linkHref) return image;
    const target = node.attrs.linkTarget === "_self" ? "_self" : "_blank";
    return ["a", { href: node.attrs.linkHref, target, ...(target === "_blank" ? { rel: "noopener noreferrer" } : {}) }, image];
  },
});

export const KnowledgeSection = Node.create({
  name: "knowledgeSection",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { tone: {
      default: "info",
      parseHTML: (element: HTMLElement) => ["info", "warning", "allowed", "prohibited"].find((tone) => element.classList.contains(`knowledge-card--${tone}`)) ?? "info",
    } };
  },
  parseHTML() { return [{ tag: "section.knowledge-card" }]; },
  renderHTML({ node }) { return ["section", { class: `knowledge-card knowledge-card--${node.attrs.tone}` }, 0]; },
});

export const KnowledgeIcon = Node.create({
  name: "knowledgeIcon",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() { return { glyph: { default: "☁", parseHTML: (element: HTMLElement) => element.textContent?.trim() || "☁" } }; },
  parseHTML() { return [{ tag: "span.knowledge-card__icon" }]; },
  renderHTML({ node }) { return ["span", { class: "knowledge-card__icon", "aria-hidden": "true" }, node.attrs.glyph]; },
});

export const KnowledgeTextColor = Mark.create({
  name: "knowledgeTextColor",
  addAttributes() { return { color: { default: null, parseHTML: (element: HTMLElement) => element.style.color || null } }; },
  parseHTML() { return [{ tag: "span[style]", getAttrs: (element) => (element as HTMLElement).style.color ? null : false }]; },
  renderHTML({ HTMLAttributes }) { return ["span", { style: `color: ${HTMLAttributes.color}` }, 0]; },
});

export const KnowledgeHighlight = Mark.create({
  name: "knowledgeHighlight",
  addAttributes() { return { color: { default: "#fff0a8", parseHTML: (element: HTMLElement) => element.style.backgroundColor || "#fff0a8" } }; },
  parseHTML() { return [{ tag: "mark" }]; },
  renderHTML({ HTMLAttributes }) { return ["mark", { style: `background-color: ${HTMLAttributes.color}` }, 0]; },
});

export const KnowledgeAlignment = Extension.create({
  name: "knowledgeAlignment",
  addGlobalAttributes() {
    return [{ types: ["paragraph", "heading"], attributes: { textAlign: {
      default: null,
      parseHTML: (element: HTMLElement) => element.style.textAlign || null,
      renderHTML: (attributes: { textAlign?: string }) => attributes.textAlign ? { style: `text-align: ${attributes.textAlign}` } : {},
    } } }];
  },
});

const headingIcons = new Set<string>(headingIconChoices.map((choice) => choice.value));
const headingColors = new Set<string>(headingIconColors.map((color) => color.value));

export const KnowledgeHeadingIcon = Extension.create({
  name: "knowledgeHeadingIcon",
  addGlobalAttributes() {
    return [{ types: ["heading"], attributes: { headingIcon: {
      default: null,
      parseHTML: (element: HTMLElement) => {
        const icon = element.getAttribute("data-heading-icon");
        return icon && headingIcons.has(icon) ? icon : null;
      },
      renderHTML: (attributes: { headingIcon?: string | null }) => attributes.headingIcon && headingIcons.has(attributes.headingIcon) ? { "data-heading-icon": attributes.headingIcon } : {},
    }, headingIconColor: {
      default: "navy",
      parseHTML: (element: HTMLElement) => {
        const color = element.getAttribute("data-heading-icon-color");
        return color && headingColors.has(color) ? color : "navy";
      },
      renderHTML: (attributes: { headingIcon?: string | null; headingIconColor?: string | null }) => attributes.headingIcon && attributes.headingIconColor && headingColors.has(attributes.headingIconColor) ? { "data-heading-icon-color": attributes.headingIconColor } : {},
    } } }];
  },
});
