"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppIcon } from "./app-icon";
import { createClient } from "@/lib/supabase/client";

export function RichTextEditor({ value, onChange, variant = "full", editable = true }: { value: string; onChange: (html: string) => void; variant?: "full" | "reply"; editable?: boolean }) {
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState("");
  const editor = useEditor({
    extensions: [StarterKit.configure(variant === "reply" ? { heading: false, blockquote: false, horizontalRule: false, code: false, codeBlock: false, strike: false, link: false } : { heading: { levels: [2, 3] }, link: false }), Link.configure({ openOnClick: false, autolink: variant === "full" }), ...(variant === "reply" ? [] : [Image.configure({ allowBase64: false })])],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": variant === "reply" ? "Resposta ao estudante" : "Conteúdo completo", class: "rich-editor__content" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => { editor?.setEditable(editable); }, [editor, editable]);
  if (!editor) return <div className="rich-editor__loading">Carregando editor…</div>;

  const button = (label: string, run: () => void, active = false, content: ReactNode = label) => (
    <button type="button" aria-label={label} aria-pressed={active} title={label} className={active ? "is-active" : ""} disabled={!editable} onClick={run}>{content}</button>
  );
  const editLink = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Endereço do link (https://)", current ?? "https://");
    if (url === null) return;
    if (!url.trim()) { editor.chain().focus().unsetLink().run(); return; }
    if (!/^https:\/\/[^\s]+$/i.test(url.trim())) { window.alert("Use um endereço HTTPS válido."); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const addImageUrl = () => {
    const url = window.prompt("URL da imagem (https://)", "https://");
    if (url === null) return;
    if (!/^https:\/\/[^\s]+$/i.test(url.trim())) { setImageError("Use uma URL HTTPS válida."); return; }
    const alt = window.prompt("Descrição da imagem para acessibilidade", "");
    if (alt === null || !alt.trim()) { setImageError("Informe uma descrição da imagem."); return; }
    editor.chain().focus().setImage({ src: url.trim(), alt: alt.trim() }).run();
    setImageError("");
  };
  const uploadImage = async (file: File) => {
    if (!(["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) || file.size > 2 * 1024 * 1024) { setImageError("Use PNG, JPEG, WebP ou GIF com até 2 MB."); return; }
    const alt = window.prompt("Descrição da imagem para acessibilidade", "");
    if (alt === null || !alt.trim()) { setImageError("Informe uma descrição da imagem."); return; }
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${crypto.randomUUID()}.${extension}`;
    const storage = createClient().storage.from("knowledge-images");
    const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
    if (error) { setImageError("Não foi possível enviar a imagem. Confirme que o espaço de imagens está configurado."); return; }
    editor.chain().focus().setImage({ src: storage.getPublicUrl(path).data.publicUrl, alt: alt.trim() }).run();
    setImageError("");
  };

  return <div className={`rich-editor${variant === "reply" ? " rich-editor--reply" : ""}`}>
    <div className="rich-editor__toolbar" role="toolbar" aria-label="Formatação do conteúdo">
      {variant === "full" && button("Parágrafo", () => editor.chain().focus().setParagraph().run(), editor.isActive("paragraph") && !editor.isActive("heading"), "P")}
      {variant === "full" && <>
      {button("Título de seção", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }), "T2")}
      {button("Subtítulo", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }), "T3")}
      <span aria-hidden="true" className="rich-editor__divider" />
      </>}
      {button("Negrito", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), <strong>B</strong>)}
      {button("Itálico", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), <em>I</em>)}
      {variant === "full" && button("Tachado", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"), <s>S</s>)}
      {button("Link", editLink, editor.isActive("link"), <AppIcon name="link" />)}
      {variant === "full" && <>
      {button("Imagem por URL", addImageUrl, false, "Imagem URL")}
      {button("Imagem do computador", () => imageInput.current?.click(), false, "Imagem arquivo")}
      <span aria-hidden="true" className="rich-editor__divider" />
      </>}
      {button("Lista com marcadores", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"), "• ≡")}
      {button("Lista numerada", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"), "1. ≡")}
      {variant === "full" && button("Citação", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), "❝")}
      {variant === "full" && button("Linha divisória", () => editor.chain().focus().setHorizontalRule().run(), false, "―")}
      <span aria-hidden="true" className="rich-editor__divider" />
      {button("Desfazer", () => editor.chain().focus().undo().run(), false, "↶")}
      {button("Refazer", () => editor.chain().focus().redo().run(), false, "↷")}
    </div>
    <input ref={imageInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} />
    {imageError && <p role="alert" className="rich-editor__error">{imageError}</p>}
    <EditorContent editor={editor} />
  </div>;
}
