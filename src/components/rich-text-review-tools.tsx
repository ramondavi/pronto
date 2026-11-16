"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/core";
import { AppIcon } from "./app-icon";
import type { StaffGuideIncludeSource } from "./staff-guide-include-picker";

type Tool = "search" | "compare" | "links" | "accessibility" | null;
type Finding = { label: string; detail: string };

function readableBlocks(html: string): string[] {
  if (typeof DOMParser === "undefined") return [];
  const root = new DOMParser().parseFromString(html, "text/html");
  return [...root.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote,th,td")]
    .filter((element) => !element.parentElement?.closest("li,blockquote,th,td"))
    .map((element) => element.textContent?.trim() ?? "").filter(Boolean);
}

function inspectAccessibility(html: string): Finding[] {
  if (typeof DOMParser === "undefined") return [];
  const root = new DOMParser().parseFromString(html, "text/html");
  const findings: Finding[] = [];
  root.body.querySelectorAll("img").forEach((image, index) => {
    if (!image.getAttribute("alt")?.trim()) findings.push({ label: `Imagem ${index + 1}`, detail: "Inclua uma descrição alternativa." });
  });
  root.body.querySelectorAll("a").forEach((link, index) => {
    if (!link.textContent?.trim() && !link.querySelector("img[alt]")) findings.push({ label: `Link ${index + 1}`, detail: "O link precisa de texto ou imagem com descrição." });
  });
  let previous = 0;
  root.body.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading) => {
    const level = Number(heading.tagName[1]);
    if (!heading.textContent?.trim()) findings.push({ label: "Título vazio", detail: "Escreva um título descritivo." });
    if (previous && level > previous + 1) findings.push({ label: heading.textContent?.trim() || "Título", detail: `A hierarquia salta de H${previous} para H${level}.` });
    previous = level;
  });
  root.body.querySelectorAll("table").forEach((table, index) => {
    if (!table.querySelector("th")) findings.push({ label: `Tabela ${index + 1}`, detail: "Identifique linhas ou colunas de cabeçalho." });
  });
  return findings;
}

function inspectLinks(html: string, guideSources: StaffGuideIncludeSource[]): Finding[] {
  if (typeof DOMParser === "undefined") return [];
  const root = new DOMParser().parseFromString(html, "text/html");
  const guideSlugs = new Set(guideSources.map((source) => source.slug));
  const findings: Finding[] = [];
  root.body.querySelectorAll("a").forEach((link, index) => {
    const href = link.getAttribute("href")?.trim() ?? "";
    const label = link.textContent?.trim() || `Link ${index + 1}`;
    if (!href) { findings.push({ label, detail: "O endereço está vazio." }); return; }
    let url: URL;
    try { url = new URL(href, window.location.origin); } catch { findings.push({ label, detail: "O endereço é inválido." }); return; }
    if (url.protocol !== "https:" && url.protocol !== "http:") { findings.push({ label, detail: "Use um endereço HTTP ou HTTPS." }); return; }
    if (url.origin !== window.location.origin) return;
    const match = /^\/guia-equipe\/([^/]+)\/?$/.exec(url.pathname);
    if (match && !guideSlugs.has(decodeURIComponent(match[1]))) findings.push({ label, detail: "O capítulo de destino não está entre os capítulos publicados disponíveis para esta edição." });
  });
  return findings;
}

export function RichTextReviewTools({ editor, html, publishedHtml, guideSources = [], editable }: { editor: Editor; html: string; publishedHtml?: string | null; guideSources?: StaffGuideIncludeSource[]; editable: boolean }) {
  const [tool, setTool] = useState<Tool>(null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchIndex, setMatchIndex] = useState(-1);
  const [notice, setNotice] = useState("");
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [checkedLinks, setCheckedLinks] = useState<Finding[]>([]);
  const matches = (() => {
    if (!query) return [];
    const found: { from: number; to: number }[] = [];
    const needle = query.toLocaleLowerCase("pt-BR");
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      const text = node.text.toLocaleLowerCase("pt-BR");
      let at = 0;
      while ((at = text.indexOf(needle, at)) !== -1) { found.push({ from: pos + at, to: pos + at + query.length }); at += query.length; }
    });
    return found;
  })();
  const draftBlocks = useMemo(() => readableBlocks(html), [html]);
  const publishedBlocks = useMemo(() => publishedHtml ? readableBlocks(publishedHtml) : [], [publishedHtml]);
  const linkFindings = useMemo(() => inspectLinks(html, guideSources), [html, guideSources]);
  const accessibilityFindings = useMemo(() => inspectAccessibility(html), [html]);

  function selectMatch(index: number) {
    if (!matches.length) return;
    const next = (index + matches.length) % matches.length;
    editor.chain().focus().setTextSelection(matches[next]).run();
    editor.view.dom.ownerDocument.getSelection()?.anchorNode?.parentElement?.scrollIntoView({ block: "center" });
    setMatchIndex(next);
  }
  function replace(one: boolean) {
    if (!editable || !matches.length) return;
    if (one) {
      const index = matchIndex >= 0 && matchIndex < matches.length ? matchIndex : 0;
      editor.commands.insertContentAt(matches[index], replacement);
      setNotice("Uma ocorrência substituída.");
      setMatchIndex(-1);
      return;
    }
    const count = matches.length;
    for (const match of [...matches].reverse()) editor.commands.insertContentAt(match, replacement);
    setNotice(`${count} ocorrências substituídas.`);
    setMatchIndex(-1);
  }
  async function checkInternalLinks() {
    setCheckingLinks(true);
    const root = new DOMParser().parseFromString(html, "text/html");
    const links = [...root.body.querySelectorAll("a[href]")].map((link) => ({ label: link.textContent?.trim() || "Link sem texto", href: link.getAttribute("href") || "" }));
    const results: Finding[] = [];
    for (const link of links) {
      let url: URL;
      try { url = new URL(link.href, window.location.origin); } catch { continue; }
      if (url.origin !== window.location.origin || !["http:", "https:"].includes(url.protocol)) continue;
      try {
        const response = await fetch(url.href, { method: "HEAD", credentials: "same-origin" });
        if (!response.ok || new URL(response.url).pathname === "/entrar") results.push({ label: link.label, detail: response.status === 404 ? "Página não encontrada." : `Resposta ${response.status}; confira o destino com acesso à equipe.` });
      } catch { results.push({ label: link.label, detail: "Não foi possível consultar o destino agora." }); }
    }
    setCheckedLinks(results);
    setCheckingLinks(false);
  }
  const toggle = (next: Exclude<Tool, null>) => { setTool(tool === next ? null : next); setNotice(""); };

  return <section className="rich-review" aria-label="Ferramentas de revisão do conteúdo">
    <div className="rich-review__tabs">
      <button type="button" aria-expanded={tool === "search"} onClick={() => toggle("search")}><AppIcon name="search" />Buscar e substituir</button>
      {publishedHtml != null && <button type="button" aria-expanded={tool === "compare"} onClick={() => toggle("compare")}><AppIcon name="document" />Comparar versões</button>}
      <button type="button" aria-expanded={tool === "links"} onClick={() => toggle("links")}><AppIcon name="link" />Conferir links</button>
      <button type="button" aria-expanded={tool === "accessibility"} onClick={() => toggle("accessibility")}><AppIcon name="contrast" />Acessibilidade</button>
    </div>
    {tool === "search" && <div className="rich-review__panel"><div className="rich-review__fields"><label>Buscar<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setMatchIndex(-1); setNotice(""); }} /></label><label>Substituir por<input value={replacement} onChange={(event) => setReplacement(event.target.value)} disabled={!editable} /></label></div><div className="rich-review__actions"><span role="status">{query ? `${matches.length} ocorrência${matches.length === 1 ? "" : "s"}` : "Digite para buscar no capítulo"}</span><button type="button" className="button button--secondary button--small" disabled={!matches.length} onClick={() => selectMatch(matchIndex + 1)}>Próxima</button><button type="button" className="button button--secondary button--small" disabled={!editable || !matches.length} onClick={() => replace(true)}>Substituir</button><button type="button" className="button button--secondary button--small" disabled={!editable || !matches.length} onClick={() => replace(false)}>Substituir todas</button></div>{notice && <p role="status">{notice}</p>}</div>}
    {tool === "compare" && <div className="rich-review__panel"><p>Compare o texto do rascunho com a versão que a equipe lê agora. Os trechos diferentes aparecem destacados na mesma posição.</p>{publishedHtml ? <div className="rich-review__comparison"><div><strong>Rascunho atual</strong><ol>{draftBlocks.map((block, index) => <li className={block !== publishedBlocks[index] ? "is-changed" : undefined} key={index}>{block}</li>)}</ol></div><div><strong>Versão publicada</strong><ol>{publishedBlocks.map((block, index) => <li className={block !== draftBlocks[index] ? "is-changed" : undefined} key={index}>{block}</li>)}</ol></div></div> : <p>Este capítulo ainda não tem versão publicada.</p>}</div>}
    {tool === "links" && <div className="rich-review__panel"><p>A conferência identifica endereços inválidos e capítulos indisponíveis. Verifique também as páginas internas em tempo real; links externos exigem conferência na origem.</p><div><button type="button" className="button button--secondary button--small" disabled={checkingLinks} onClick={() => void checkInternalLinks()}>{checkingLinks ? "Conferindo…" : "Testar páginas internas"}</button></div>{linkFindings.length || checkedLinks.length ? <ul>{[...linkFindings, ...checkedLinks].map((finding, index) => <li key={index}><strong>{finding.label}:</strong> {finding.detail}</li>)}</ul> : <p role="status">Nenhum problema encontrado nessa conferência.</p>}</div>}
    {tool === "accessibility" && <div className="rich-review__panel"><p>Conferência de descrição de imagens, texto de links, sequência dos títulos e cabeçalhos de tabelas.</p>{accessibilityFindings.length ? <ul>{accessibilityFindings.map((finding, index) => <li key={index}><strong>{finding.label}:</strong> {finding.detail}</li>)}</ul> : <p role="status">Nenhum problema encontrado nessa conferência.</p>}</div>}
  </section>;
}
