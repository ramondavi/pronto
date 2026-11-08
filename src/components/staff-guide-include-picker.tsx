"use client";

import { useMemo, useState } from "react";
import { AppIcon } from "./app-icon";
import { staffGuideTopics } from "@/lib/staff-guide-topics";

export type StaffGuideIncludeSource = { slug: string; title: string; html: string };

export function StaffGuideIncludePicker({ sources, onInsert }: { sources: StaffGuideIncludeSource[]; onInsert: (source: string, label: string) => void }) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => sources.map((source) => {
    const document = new DOMParser().parseFromString(source.html, "text/html");
    const topics = staffGuideTopics(Array.from(document.querySelectorAll("h2,h3")).map((heading) => ({ title: heading.textContent?.trim() ?? "", level: heading.tagName === "H3" ? 3 : 2 })));
    return { ...source, topics };
  }), [sources]);
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  return <div className="rich-editor__guide-include-picker" role="group" aria-label="Incorporar capítulo ou tópico">
    <strong>Incorporar trecho publicado</strong><p>O texto acompanha a versão publicada do capítulo de origem.</p>
    <input type="search" aria-label="Buscar capítulo ou tópico" placeholder="Buscar capítulo ou tópico" value={query} onChange={(event) => setQuery(event.target.value)} />
    <div className="rich-editor__guide-include-options">{options.map((source) => {
      const matches = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalized);
      const topics = source.topics.filter((topic) => matches(source.title) || matches(topic.title));
      if (normalized && !matches(source.title) && !topics.length) return null;
      return <section key={source.slug}><h4>{source.title}</h4><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onInsert(source.slug, source.title)}><AppIcon name="book" />Capítulo inteiro</button>{topics.map((topic) => <button type="button" key={topic.id} onMouseDown={(event) => event.preventDefault()} onClick={() => onInsert(`${source.slug}#${topic.id}`, `${source.title} › ${topic.title}`)}><AppIcon name="arrowRight" />{topic.title}</button>)}</section>;
    })}</div>
  </div>;
}
