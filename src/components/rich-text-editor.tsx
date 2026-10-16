"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppIcon, type AppIconName } from "./app-icon";
import { createClient } from "@/lib/supabase/client";
import { KnowledgeAlignment, KnowledgeHeadingIcon, KnowledgeHighlight, KnowledgeIcon, KnowledgeImage, KnowledgeSection, KnowledgeTextColor } from "./knowledge-editor-extensions";
import { headingIconChoices, headingIconColors } from "@/lib/knowledge-heading-options";

type EditorDialog = "link" | "image" | "color" | "highlight" | null;
type InlineTool = "link" | "color" | "highlight" | null;
const isHttpsUrl = (value: string) => /^https:\/\/[^\s]+$/i.test(value.trim());
const colorSwatches = ["#183968", "#111111", "#a4262c", "#216a45", "#805400", "#fff0a8", "#dce9ff", "#ffffff"];

export function RichTextEditor({ value, onChange, variant = "full", editable = true }: { value: string; onChange: (html: string) => void; variant?: "full" | "reply"; editable?: boolean }) {
  const [dialog, setDialog] = useState<EditorDialog>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSource, setImageSource] = useState<"file" | "url">("file");
  const [imageWidth, setImageWidth] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [inlineTool, setInlineTool] = useState<InlineTool>(null);
  const [inlineValue, setInlineValue] = useState("");
  const [linkTarget, setLinkTarget] = useState<"_blank" | "_self">("_blank");
  const [inlineError, setInlineError] = useState("");
  const [headingIconPickerOpen, setHeadingIconPickerOpen] = useState(false);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [tableHeaderRow, setTableHeaderRow] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const selectedRange = useRef<{ from: number; to: number; image: boolean } | null>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure(variant === "reply" ? { heading: false, blockquote: false, horizontalRule: false, code: false, codeBlock: false, strike: false, link: false } : { heading: { levels: [1, 2, 3, 4, 5, 6] }, link: false }), Link.configure({ openOnClick: false, autolink: variant === "full" }), ...(variant === "reply" ? [] : [KnowledgeImage.configure({ allowBase64: false, resize: { enabled: true, minWidth: 80, minHeight: 80, alwaysPreserveAspectRatio: true } }), TableKit, KnowledgeSection, KnowledgeIcon, KnowledgeTextColor, KnowledgeHighlight, KnowledgeAlignment, KnowledgeHeadingIcon])],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": variant === "reply" ? "Resposta ao estudante" : "Conteúdo completo", class: variant === "reply" ? "rich-editor__content" : "rich-editor__content knowledge-rich-content knowledge-article__body" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const toolbarState = useEditorState({ editor, selector: ({ editor: current }) => {
    if (!current) return null;
    return {
      block: current.isActive("heading") ? Number(current.getAttributes("heading").level) : current.isActive("paragraph") ? 0 : null,
      headingIcon: current.isActive("heading") ? current.getAttributes("heading").headingIcon ?? null : null,
      headingIconColor: current.isActive("heading") ? current.getAttributes("heading").headingIconColor ?? "navy" : "navy",
      table: current.isActive("table"),
      tableSelection: current.isActive("table") ? `${current.state.selection.from}:${current.state.selection.to}` : null,
      bold: current.isActive("bold"), italic: current.isActive("italic"), underline: current.isActive("underline"), strike: current.isActive("strike"),
      textColor: current.isActive("knowledgeTextColor"), highlight: current.isActive("knowledgeHighlight"), link: current.isActive("link") || (current.isActive("image") && Boolean(current.getAttributes("image").linkHref)), image: current.isActive("image"),
      bulletList: current.isActive("bulletList"), orderedList: current.isActive("orderedList"), blockquote: current.isActive("blockquote"),
      alignment: current.getAttributes(current.isActive("heading") ? "heading" : "paragraph").textAlign ?? null,
      colorValue: current.getAttributes("knowledgeTextColor").color ?? null,
      highlightValue: current.getAttributes("knowledgeHighlight").color ?? null,
    };
  } });
  useEffect(() => { editor?.setEditable(editable); }, [editor, editable]);
  useEffect(() => {
    if (!editor) return;
    const closePicker = () => { setHeadingIconPickerOpen(false); setTablePickerOpen(false); };
    editor.on("selectionUpdate", closePicker);
    editor.view.dom.addEventListener("pointerdown", closePicker);
    return () => {
      editor.off("selectionUpdate", closePicker);
      editor.view.dom.removeEventListener("pointerdown", closePicker);
    };
  }, [editor]);
  useEffect(() => {
    if (!inlineTool) return;
    const closeOnOutside = (event: PointerEvent) => { if (event.target instanceof Node && !bubbleRef.current?.contains(event.target)) setInlineTool(null); };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [inlineTool]);
  if (!editor) return <div className="rich-editor__loading">Carregando editor…</div>;

  const button = (label: string, run: () => void, active = false, content: ReactNode = label) => (
    <button type="button" aria-label={label} aria-pressed={active} title={label} className={active ? "is-active" : ""} disabled={!editable} onMouseDown={(event) => event.preventDefault()} onClick={run}>{content}</button>
  );
  const tableAction = (label: string, icon: AppIconName, run: () => void, disabled = false) => (
    <button type="button" disabled={!editable || disabled} onMouseDown={(event) => event.preventDefault()} onClick={run}><AppIcon name={icon} /><span>{label}</span></button>
  );
  const setHeadingLevel = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (editor.isActive("heading") && (level === 2 || level === 3)) editor.chain().focus().updateAttributes("heading", { level }).run();
    else editor.chain().focus().setHeading({ level }).run();
    setHeadingIconPickerOpen(false);
  };
  const activeAlignment = toolbarState?.alignment;
  const textColor = String(toolbarState?.colorValue ?? "#183968");
  const highlightColor = String(toolbarState?.highlightValue ?? "#fff0a8");
  const openInlineTool = (tool: Exclude<InlineTool, null>) => {
    const image = variant === "full" && editor.isActive("image") && editor.state.selection.from !== editor.state.selection.to;
    selectedRange.current = { from: editor.state.selection.from, to: editor.state.selection.to, image };
    const linkAttributes = image ? editor.getAttributes("image") : editor.getAttributes("link");
    setInlineValue(tool === "link" ? String(image ? linkAttributes.linkHref ?? "" : linkAttributes.href ?? "") : tool === "color" ? textColor : highlightColor);
    if (tool === "link") setLinkTarget(linkAttributes.linkTarget === "_self" || linkAttributes.target === "_self" ? "_self" : "_blank");
    setInlineError(""); setInlineTool(tool);
  };
  const applyInlineTool = (value = inlineValue) => {
    if (!inlineTool || !selectedRange.current) return;
    if (inlineTool === "link" && !isHttpsUrl(value)) { setInlineError("Use um endereço HTTPS válido."); return; }
    if (inlineTool !== "link" && !/^#[0-9a-f]{6}$/i.test(value)) { setInlineError("Informe uma cor com seis dígitos."); return; }
    const chain = editor.chain().focus().setTextSelection(selectedRange.current);
    if (inlineTool === "link" && selectedRange.current.image) editor.chain().focus().setNodeSelection(selectedRange.current.from).updateAttributes("image", { linkHref: value.trim(), linkTarget }).run();
    else if (inlineTool === "link") chain.setLink({ href: value.trim(), target: linkTarget, rel: linkTarget === "_blank" ? "noopener noreferrer" : null }).run();
    else chain.setMark(inlineTool === "color" ? "knowledgeTextColor" : "knowledgeHighlight", { color: value }).run();
    setInlineTool(null); setInlineError("");
  };
  const removeInlineFormat = () => {
    if (!inlineTool || !selectedRange.current) return;
    const chain = editor.chain().focus().setTextSelection(selectedRange.current);
    if (inlineTool === "link" && selectedRange.current.image) editor.chain().focus().setNodeSelection(selectedRange.current.from).updateAttributes("image", { linkHref: null }).run();
    else if (inlineTool === "link") chain.unsetLink().run();
    else chain.unsetMark(inlineTool === "color" ? "knowledgeTextColor" : "knowledgeHighlight").run();
    setInlineTool(null); setInlineError("");
  };
  const returnToSelection = () => {
    if (selectedRange.current) {
      if (selectedRange.current.image) editor.chain().focus().setNodeSelection(selectedRange.current.from).run();
      else editor.chain().focus().setTextSelection(selectedRange.current).run();
    }
    setInlineTool(null); setInlineError("");
  };
  const closeDialog = () => {
    setDialog(null); setImageError("");
    requestAnimationFrame(() => toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const openDialog = (kind: EditorDialog) => {
    setDialog(kind); setImageError(""); setImageFile(null); setImageSource("file"); setImageWidth("");
    const image = kind === "link" && variant === "full" && editor.isActive("image") && editor.state.selection.from !== editor.state.selection.to;
    selectedRange.current = { from: editor.state.selection.from, to: editor.state.selection.to, image };
    const linkAttributes = image ? editor.getAttributes("image") : editor.getAttributes("link");
    setDialogValue(kind === "link" ? String(image ? linkAttributes.linkHref ?? "" : linkAttributes.href ?? "") : kind === "color" ? String(editor.getAttributes("knowledgeTextColor").color ?? "#183968") : kind === "highlight" ? String(editor.getAttributes("knowledgeHighlight").color ?? "#fff0a8") : "");
    if (kind === "link") setLinkTarget(linkAttributes.linkTarget === "_self" || linkAttributes.target === "_self" ? "_self" : "_blank");
    setImageAlt("");
  };
  const applyDialog = async () => {
    if (dialog === "link") {
      if (!isHttpsUrl(dialogValue)) { setImageError("Use um endereço HTTPS válido."); return; }
      if (selectedRange.current?.image) editor.chain().focus().setNodeSelection(selectedRange.current.from).updateAttributes("image", { linkHref: dialogValue.trim(), linkTarget }).run();
      else editor.chain().focus().extendMarkRange("link").setLink({ href: dialogValue.trim(), target: linkTarget, rel: linkTarget === "_blank" ? "noopener noreferrer" : null }).run();
    }
    if (dialog === "image") {
      if (!imageAlt.trim()) { setImageError("Descreva a imagem para quem usa leitor de tela."); return; }
      const width = imageWidth ? Number(imageWidth) : undefined;
      if (width !== undefined && (!Number.isInteger(width) || width < 80 || width > 1600)) { setImageError("Use largura entre 80 e 1600 pixels."); return; }
      let src = imageSource === "url" ? dialogValue.trim() : "";
      if (imageSource === "file" && imageFile) {
        if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(imageFile.type) || imageFile.size > 2 * 1024 * 1024) { setImageError("Use PNG, JPEG, WebP ou GIF com até 2 MB."); return; }
        setUploading(true);
        const extension = imageFile.type === "image/jpeg" ? "jpg" : imageFile.type.split("/")[1];
        const path = `${crypto.randomUUID()}.${extension}`;
        const storage = createClient().storage.from("knowledge-images");
        const { error } = await storage.upload(path, imageFile, { contentType: imageFile.type, upsert: false });
        setUploading(false);
        if (error) { setImageError("Não foi possível enviar a imagem. Tente novamente."); return; }
        src = storage.getPublicUrl(path).data.publicUrl;
      }
      if (!isHttpsUrl(src)) { setImageError("Use uma URL HTTPS válida ou escolha um arquivo."); return; }
      editor.chain().focus().setImage({ src, alt: imageAlt.trim(), ...(width ? { width } : {}) }).run();
    }
    if (dialog === "color" || dialog === "highlight") {
      if (!/^#[0-9a-f]{6}$/i.test(dialogValue)) { setImageError("Informe uma cor hexadecimal com seis dígitos."); return; }
      editor.chain().focus().setMark(dialog === "color" ? "knowledgeTextColor" : "knowledgeHighlight", { color: dialogValue }).run();
    }
    closeDialog();
  };
  const removeFormatting = () => {
    if (dialog === "link" && selectedRange.current?.image) editor.chain().focus().setNodeSelection(selectedRange.current.from).updateAttributes("image", { linkHref: null }).run();
    else if (dialog === "link") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    if (dialog === "color") editor.chain().focus().unsetMark("knowledgeTextColor").run();
    if (dialog === "highlight") editor.chain().focus().unsetMark("knowledgeHighlight").run();
    closeDialog();
  };

  return <div className={`rich-editor${variant === "reply" ? " rich-editor--reply" : ""}`}>
    <div ref={toolbarRef} className="rich-editor__toolbar" role="toolbar" aria-label="Formatação do conteúdo">
      {variant === "full" && <div className="rich-editor__tool-group" role="group" aria-label="Estrutura do texto">
        {button("Parágrafo", () => editor.chain().focus().setParagraph().run(), toolbarState?.block === 0, <AppIcon name="paragraph" />)}
        {([1, 2, 3, 4, 5, 6] as const).map((level) => <span key={level} className={`rich-editor__heading-button${toolbarState?.block === level && (level === 2 || level === 3) ? " rich-editor__heading-button--with-icon" : ""}`}>
          {button(`Título H${level}`, () => setHeadingLevel(level), toolbarState?.block === level, <AppIcon name={`heading${level}` as "heading1" | "heading2" | "heading3" | "heading4" | "heading5" | "heading6"} />)}
          {toolbarState?.block === level && (level === 2 || level === 3) && <><button type="button" className={`rich-editor__heading-context${headingIconPickerOpen ? " is-active" : ""}`} aria-label={`Escolher ícone e cor do título H${level}`} aria-expanded={headingIconPickerOpen} title="Ícone e cor do título" disabled={!editable} onMouseDown={(event) => event.preventDefault()} onClick={() => setHeadingIconPickerOpen((open) => !open)}><AppIcon name={(toolbarState.headingIcon ?? "sparkles") as (typeof headingIconChoices)[number]["value"] | "sparkles"} /></button>
            {headingIconPickerOpen && <div className="rich-editor__heading-icon-picker" role="group" aria-label={`Ícone e cor do título H${level}`}><strong>Ícone do {level === 2 ? "título de seção" : "subtítulo"}</strong><div className="rich-editor__heading-icon-grid" role="group" aria-label="Escolher ícone">{headingIconChoices.map((choice) => <button key={choice.value} type="button" className={toolbarState.headingIcon === choice.value ? "is-active" : ""} aria-label={choice.label} aria-pressed={toolbarState.headingIcon === choice.value} title={choice.label} onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus().updateAttributes("heading", { headingIcon: choice.value }).run()}><AppIcon name={choice.value} /></button>)}</div><strong>Cor do ícone</strong><div className="rich-editor__heading-color-grid" role="group" aria-label="Escolher cor">{headingIconColors.map((color) => <button key={color.value} type="button" className={toolbarState.headingIconColor === color.value ? "is-active" : ""} aria-label={color.label} aria-pressed={toolbarState.headingIconColor === color.value} title={color.label} disabled={!toolbarState.headingIcon} onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus().updateAttributes("heading", { headingIconColor: color.value }).run()}><i style={{ backgroundColor: color.hex }} /></button>)}</div><div className="rich-editor__heading-picker-actions"><button type="button" disabled={!toolbarState.headingIcon} onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus().updateAttributes("heading", { headingIcon: null }).run()}>Sem ícone</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setHeadingIconPickerOpen(false)}>Concluído</button></div></div>}
          </>}
        </span>)}
      </div>}
      <div className="rich-editor__tool-group" role="group" aria-label="Estilo do texto">
        {button("Negrito", () => editor.chain().focus().toggleBold().run(), toolbarState?.bold, <AppIcon name="bold" />)}
        {button("Itálico", () => editor.chain().focus().toggleItalic().run(), toolbarState?.italic, <AppIcon name="italic" />)}
        {variant === "full" && button("Sublinhado", () => editor.chain().focus().toggleUnderline().run(), toolbarState?.underline, <AppIcon name="underline" />)}
        {variant === "full" && button("Tachado", () => editor.chain().focus().toggleStrike().run(), toolbarState?.strike, <AppIcon name="strike" />)}
        {variant === "full" && button("Cor do texto", () => openDialog("color"), toolbarState?.textColor, <span className="rich-editor__color-tool"><AppIcon name="textColor" /><i style={{ backgroundColor: textColor }} /></span>)}
        {variant === "full" && button("Cor da marcação", () => openDialog("highlight"), toolbarState?.highlight, <span className="rich-editor__color-tool"><AppIcon name="highlight" /><i style={{ backgroundColor: highlightColor }} /></span>)}
      </div>
      <div className="rich-editor__tool-group" role="group" aria-label="Inserir conteúdo">
        {button("Link", () => openDialog("link"), toolbarState?.link, <AppIcon name="link" />)}
        {variant === "full" && button("Imagem", () => openDialog("image"), toolbarState?.image, <AppIcon name="image" />)}
        {variant === "full" && <span className="rich-editor__table-control">{button("Tabela", () => setTablePickerOpen((open) => !open), toolbarState?.table, <AppIcon name="table" />)}
          {tablePickerOpen && <div className="rich-editor__table-panel" role="group" aria-label={toolbarState?.table ? "Editar tabela" : "Inserir tabela"}>
            {toolbarState?.table ? <><strong>Editar tabela</strong><div className="rich-editor__table-actions">
              {tableAction("Linha acima", "rowAbove", () => editor.chain().focus().addRowBefore().run())}
              {tableAction("Linha abaixo", "rowBelow", () => editor.chain().focus().addRowAfter().run())}
              {tableAction("Remover linha", "rowRemove", () => editor.chain().focus().deleteRow().run())}
              {tableAction("Coluna à esquerda", "columnLeft", () => editor.chain().focus().addColumnBefore().run())}
              {tableAction("Coluna à direita", "columnRight", () => editor.chain().focus().addColumnAfter().run())}
              {tableAction("Remover coluna", "columnRemove", () => editor.chain().focus().deleteColumn().run())}
              {tableAction("Alternar cabeçalho da linha", "tableHeader", () => editor.chain().focus().toggleHeaderRow().run())}
              {tableAction("Alternar cabeçalho da coluna", "tableHeaderColumn", () => editor.chain().focus().toggleHeaderColumn().run())}
              {tableAction("Mesclar células", "table", () => editor.chain().focus().mergeCells().run(), !editor.can().mergeCells())}
              {tableAction("Dividir célula", "table", () => editor.chain().focus().splitCell().run(), !editor.can().splitCell())}
              {tableAction("Excluir tabela", "tableDelete", () => editor.chain().focus().deleteTable().run())}
            </div></> : <><strong>Inserir tabela</strong><div className="rich-editor__table-size"><label>Linhas<input type="number" min={1} max={12} value={tableRows} onChange={(event) => setTableRows(Number(event.target.value))} /></label><label>Colunas<input type="number" min={1} max={8} value={tableColumns} onChange={(event) => setTableColumns(Number(event.target.value))} /></label></div><label className="rich-editor__table-header-option"><input type="checkbox" checked={tableHeaderRow} onChange={(event) => setTableHeaderRow(event.target.checked)} />Primeira linha como cabeçalho</label><button type="button" className="rich-editor__table-insert" disabled={!Number.isInteger(tableRows) || !Number.isInteger(tableColumns) || tableRows < 1 || tableRows > 12 || tableColumns < 1 || tableColumns > 8} onMouseDown={(event) => event.preventDefault()} onClick={() => { editor.chain().focus().insertTable({ rows: tableRows, cols: tableColumns, withHeaderRow: tableHeaderRow }).run(); setTablePickerOpen(false); }}><AppIcon name="table" />Inserir tabela</button></>}
          </div>}
        </span>}
      </div>
      {variant === "full" && <div className="rich-editor__tool-group" role="group" aria-label="Alinhamento">
        {button("Alinhar à esquerda", () => editor.chain().focus().updateAttributes(editor.isActive("heading") ? "heading" : "paragraph", { textAlign: "left" }).run(), activeAlignment === "left", <AppIcon name="alignLeft" />)}
        {button("Centralizar", () => editor.chain().focus().updateAttributes(editor.isActive("heading") ? "heading" : "paragraph", { textAlign: "center" }).run(), activeAlignment === "center", <AppIcon name="alignCenter" />)}
        {button("Alinhar à direita", () => editor.chain().focus().updateAttributes(editor.isActive("heading") ? "heading" : "paragraph", { textAlign: "right" }).run(), activeAlignment === "right", <AppIcon name="alignRight" />)}
      </div>}
      <div className="rich-editor__tool-group" role="group" aria-label="Listas e blocos">
        {button("Lista com marcadores", () => editor.chain().focus().toggleBulletList().run(), toolbarState?.bulletList, <AppIcon name="queue" />)}
        {button("Lista numerada", () => editor.chain().focus().toggleOrderedList().run(), toolbarState?.orderedList, <AppIcon name="numberedList" />)}
        {variant === "full" && button("Citação", () => editor.chain().focus().toggleBlockquote().run(), toolbarState?.blockquote, <AppIcon name="quote" />)}
        {variant === "full" && button("Linha divisória", () => editor.chain().focus().setHorizontalRule().run(), false, <AppIcon name="separator" />)}
      </div>
      <div className="rich-editor__tool-group rich-editor__tool-group--history" role="group" aria-label="Histórico">
        {button("Desfazer", () => editor.chain().focus().undo().run(), false, <AppIcon name="undo" />)}
        {button("Refazer", () => editor.chain().focus().redo().run(), false, <AppIcon name="redo" />)}
      </div>
    </div>
    {!dialog && <BubbleMenu ref={bubbleRef} editor={editor} pluginKey="rich-text-selection" updateDelay={120} appendTo={() => document.body} options={{ placement: "top", offset: 8, shift: { padding: 8 } }} shouldShow={({ editor: activeEditor, state }) => editable && (inlineTool !== null || activeEditor.isFocused && !state.selection.empty && (activeEditor.isActive("image") || Boolean(state.doc.textBetween(state.selection.from, state.selection.to).trim())))} className={`rich-editor__bubble${inlineTool ? " rich-editor__bubble--expanded" : ""}${inlineTool === "link" ? " rich-editor__bubble--link" : ""}`} style={inlineTool === "link" ? { width: `min(max(280px, ${Math.min(inlineValue.length + 8, 72)}ch), calc(100vw - 24px))` } : undefined} role="toolbar" aria-label="Formatar texto selecionado">
      {inlineTool ? <div className="rich-editor__inline-panel" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); returnToSelection(); } if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); applyInlineTool(); } }}>
        <div className="rich-editor__inline-heading"><button type="button" aria-label="Voltar às opções de formatação" onClick={returnToSelection}><AppIcon name="arrowRight" /></button><strong>{inlineTool === "link" ? "Link" : inlineTool === "color" ? "Cor do texto" : "Marcação"}</strong></div>
        {inlineTool === "link" ? <><input autoFocus type="url" aria-label="Endereço do link" value={inlineValue} onChange={(event) => { setInlineValue(event.target.value); setInlineError(""); }} placeholder="https://exemplo.com" /><fieldset className="rich-editor__link-target"><legend>Abrir link</legend><label><input type="radio" name="inline-link-target" checked={linkTarget === "_blank"} onChange={() => setLinkTarget("_blank")} />Em outra aba</label><label><input type="radio" name="inline-link-target" checked={linkTarget === "_self"} onChange={() => setLinkTarget("_self")} />Na própria página</label></fieldset></> : <><div className="rich-editor__inline-colors" role="group" aria-label="Cores sugeridas">{colorSwatches.map((color) => <button key={color} type="button" aria-label={`Aplicar cor ${color}`} aria-pressed={inlineValue.toLowerCase() === color} className={inlineValue.toLowerCase() === color ? "is-selected" : ""} style={{ backgroundColor: color }} onClick={() => applyInlineTool(color)} />)}</div><input autoFocus aria-label="Código hexadecimal da cor" value={inlineValue} onChange={(event) => { setInlineValue(event.target.value); setInlineError(""); }} maxLength={7} /></>}
        {inlineError && <small role="alert" className="rich-editor__inline-error">{inlineError}</small>}
        <div className="rich-editor__inline-actions"><button type="button" className="rich-editor__inline-remove" onClick={removeInlineFormat}>Remover</button><button type="button" className="rich-editor__inline-apply" onClick={() => applyInlineTool()}><AppIcon name="check" />Aplicar</button></div>
      </div> : <>
        {button("Negrito", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), <AppIcon name="bold" />)}
        {button("Itálico", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), <AppIcon name="italic" />)}
        {button("Sublinhado", () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"), <AppIcon name="underline" />)}
        {variant === "full" && button("Tachado", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"), <AppIcon name="strike" />)}
        <span className="rich-editor__bubble-divider" aria-hidden="true" />
        {button("Link", () => openInlineTool("link"), toolbarState?.link, <AppIcon name="link" />)}
        {variant === "full" && button("Cor do texto", () => openInlineTool("color"), editor.isActive("knowledgeTextColor"), <AppIcon name="textColor" />)}
        {variant === "full" && button("Marcar texto", () => openInlineTool("highlight"), editor.isActive("knowledgeHighlight"), <AppIcon name="highlight" />)}
      </>}
    </BubbleMenu>}
    <EditorContent editor={editor} />
    {dialog && <div className="rich-editor__dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) closeDialog(); }}>
      <div className="rich-editor__dialog" role="dialog" aria-label={dialog === "link" ? "Editar link" : dialog === "image" ? "Inserir imagem" : dialog === "color" ? "Cor do texto" : "Cor da marcação"} onKeyDown={(event) => { if (event.key === "Escape" && !uploading) closeDialog(); if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type !== "file") { event.preventDefault(); void applyDialog(); } }}>
        <div className="rich-editor__dialog-heading">
          <span className="rich-editor__dialog-icon"><AppIcon name={dialog === "link" ? "link" : dialog === "image" ? "document" : "contrast"} /></span>
          <h3>{dialog === "link" ? "Inserir link" : dialog === "image" ? "Inserir imagem" : dialog === "color" ? "Cor do texto" : "Cor da marcação"}</h3>
          <button className="rich-editor__dialog-close" type="button" aria-label="Fechar janela" disabled={uploading} onClick={closeDialog}><AppIcon name="close" /></button>
        </div>
        {dialog === "link" && <div className="rich-editor__dialog-body"><label>Endereço do link<input autoFocus type="url" value={dialogValue} onChange={(event) => { setDialogValue(event.target.value); setImageError(""); }} placeholder="https://exemplo.com" /></label><fieldset className="rich-editor__link-target"><legend>Abrir link</legend><label><input type="radio" name="dialog-link-target" checked={linkTarget === "_blank"} onChange={() => setLinkTarget("_blank")} />Em outra aba</label><label><input type="radio" name="dialog-link-target" checked={linkTarget === "_self"} onChange={() => setLinkTarget("_self")} />Na própria página</label></fieldset><p className="rich-editor__dialog-hint">Use um endereço HTTPS para abrir o destino com segurança.</p></div>}
        {dialog === "image" && <div className="rich-editor__dialog-body">
          <div className="rich-editor__source-tabs" role="group" aria-label="Origem da imagem"><button type="button" className={imageSource === "file" ? "is-active" : ""} aria-pressed={imageSource === "file"} onClick={() => { setImageSource("file"); setImageError(""); }}><AppIcon name="upload" />Arquivo</button><button type="button" className={imageSource === "url" ? "is-active" : ""} aria-pressed={imageSource === "url"} onClick={() => { setImageSource("url"); setImageError(""); }}><AppIcon name="link" />Endereço</button></div>
          {imageSource === "file" ? <div className="rich-editor__file-field"><input ref={fileInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { setImageFile(event.target.files?.[0] ?? null); setImageError(""); }} /><button type="button" onClick={() => fileInput.current?.click()}><AppIcon name="upload" /><span>{imageFile ? imageFile.name : "Escolher imagem"}</span></button><small>PNG, JPEG, WebP ou GIF · até 2 MB</small></div> : <label>Endereço da imagem<input autoFocus type="url" value={dialogValue} onChange={(event) => { setDialogValue(event.target.value); setImageError(""); }} placeholder="https://exemplo.com/imagem.png" /></label>}
          <div className="rich-editor__image-fields"><label>Descrição alternativa<input value={imageAlt} onChange={(event) => { setImageAlt(event.target.value); setImageError(""); }} placeholder="O que a imagem mostra?" /></label><label>Largura <span>(opcional)</span><input type="number" inputMode="numeric" min={80} max={1600} value={imageWidth} onChange={(event) => setImageWidth(event.target.value)} placeholder="px" /></label></div>
          <p className="rich-editor__dialog-hint">Depois de inserir, você também pode ajustar o tamanho pelas alças da imagem.</p>
        </div>}
        {(dialog === "color" || dialog === "highlight") && <div className="rich-editor__dialog-body"><p className="rich-editor__dialog-hint">Escolha uma cor ou informe o código hexadecimal.</p><div className="rich-editor__color-grid"><div className="rich-editor__swatches" role="group" aria-label="Cores sugeridas">{colorSwatches.map((color) => <button key={color} type="button" className={dialogValue.toLowerCase() === color ? "is-selected" : ""} style={{ backgroundColor: color }} aria-label={`Selecionar ${color}`} aria-pressed={dialogValue.toLowerCase() === color} onClick={() => { setDialogValue(color); setImageError(""); }} />)}</div><label>Código da cor<input autoFocus value={dialogValue} onChange={(event) => { setDialogValue(event.target.value); setImageError(""); }} maxLength={7} /></label></div><div className="rich-editor__color-preview"><span>Amostra</span><strong style={dialog === "color" ? { color: /^#[0-9a-f]{6}$/i.test(dialogValue) ? dialogValue : undefined } : { backgroundColor: /^#[0-9a-f]{6}$/i.test(dialogValue) ? dialogValue : undefined }}>Texto de exemplo</strong></div></div>}
        {imageError && <p role="alert" className="rich-editor__error">{imageError}</p>}
        <div className="rich-editor__dialog-actions">{dialog !== "image" && (dialog === "link" ? selectedRange.current?.image ? Boolean(editor.getAttributes("image").linkHref) : editor.isActive("link") : editor.isActive(dialog === "color" ? "knowledgeTextColor" : "knowledgeHighlight")) && <button type="button" className="rich-editor__dialog-remove" onClick={removeFormatting}>Remover formatação</button>}<span className="rich-editor__dialog-actions-spacer" /><button type="button" className="button button--secondary" disabled={uploading} onClick={closeDialog}>Cancelar</button><button type="button" className="button button--primary" disabled={uploading} onClick={() => void applyDialog()}><AppIcon name="check" />{uploading ? "Enviando…" : dialog === "link" ? "Salvar link" : dialog === "image" ? "Inserir imagem" : "Aplicar cor"}</button></div>
      </div>
    </div>}
  </div>;
}
