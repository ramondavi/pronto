"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppIcon } from "./app-icon";
import { staffGuideSections } from "@/lib/staff-guide-sections";
import { staffGuideTopics, type StaffGuideTopic } from "@/lib/staff-guide-topics";

export type GuideNavigationPage = { published_slug: string; published_section: string; published_title: string; published_position: number; published_html: string };
type Topic = StaffGuideTopic;
const sections = staffGuideSections;

function topicsFromHeadings(headings: HTMLHeadingElement[]): Topic[] {
  return staffGuideTopics(headings.map((heading) => ({ title: heading.textContent?.trim() ?? "", level: heading.tagName === "H3" ? 3 : 2 })));
}

export function StaffGuideNavigation({ pages }: { pages: GuideNavigationPage[] }) {
  const pathname = usePathname();
  const activeSlug = pathname.startsWith("/guia-equipe/") ? pathname.slice("/guia-equipe/".length) : "";
  const [allTopics, setAllTopics] = useState<Record<string, Topic[]>>({});
  const [expanded, setExpanded] = useState<string[]>(activeSlug ? [activeSlug] : []);
  const [activeTopic, setActiveTopic] = useState("");

  useEffect(() => {
    const parser = new DOMParser();
    const next: Record<string, Topic[]> = {};
    for (const page of pages) {
      const document = parser.parseFromString(page.published_html, "text/html");
      next[page.published_slug] = topicsFromHeadings(Array.from(document.querySelectorAll<HTMLHeadingElement>("h2, h3")));
    }
    setAllTopics(next);
  }, [pages]);

  useEffect(() => {
    if (activeSlug) setExpanded((current) => current.includes(activeSlug) ? current : [...current, activeSlug]);
    let headings: HTMLHeadingElement[] = [];
    let hashApplied = false;
    const onScroll = () => {
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
      const current = atEnd ? headings.at(-1) : [...headings].reverse().find((heading) => heading.getBoundingClientRect().top <= 150) ?? headings[0];
      setActiveTopic(current?.id ?? "");
    };
    const update = () => {
      const article = document.querySelector<HTMLElement>(".staff-docs__article-body");
      if (!article) { headings = []; setActiveTopic(""); return; }
      headings = Array.from(article.querySelectorAll<HTMLHeadingElement>("h2, h3"));
      const topics = topicsFromHeadings(headings);
      headings.forEach((heading, index) => { heading.id = topics[index].id; });
      if (!hashApplied && window.location.hash) {
        const target = headings.find((heading) => `#${heading.id}` === decodeURIComponent(window.location.hash));
        if (target) { hashApplied = true; requestAnimationFrame(() => target.scrollIntoView()); }
      }
      onScroll();
    };
    const content = document.querySelector(".staff-docs__content");
    const observer = new MutationObserver(update);
    if (content) observer.observe(content, { childList: true, subtree: true });
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [activeSlug]);

  return <nav className="staff-docs__nav" aria-label="Capítulos do Guia da Equipe">
    <Link href="/guia-equipe" className={`staff-docs__nav-home${pathname === "/guia-equipe" ? " is-active" : ""}`} aria-current={pathname === "/guia-equipe" ? "page" : undefined}><AppIcon name="home" />Início do guia</Link>
    {sections.map(([key, label]) => {
      const items = pages.filter((page) => page.published_section === key);
      return items.length || key === "casos" ? <div className="staff-docs__nav-group" key={key}><h2>{label}</h2>{items.map((page) => {
        const isActive = activeSlug === page.published_slug;
        const topics = allTopics[page.published_slug] ?? [];
        const isExpanded = expanded.includes(page.published_slug);
        return <div className="staff-docs__chapter" key={page.published_slug}><div className={`staff-docs__chapter-heading${isActive ? " is-active" : ""}`}><Link href={`/guia-equipe/${page.published_slug}`} aria-current={isActive ? "page" : undefined}>{page.published_title}</Link>{topics.length > 0 && <button type="button" aria-label={`${isExpanded ? "Contrair" : "Expandir"} tópicos de ${page.published_title}`} aria-expanded={isExpanded} aria-controls={`staff-docs-topics-${page.published_slug}`} onClick={() => setExpanded((current) => isExpanded ? current.filter((slug) => slug !== page.published_slug) : [...current, page.published_slug])}><AppIcon name="chevronDown" /></button>}</div>{topics.length > 0 && <div id={`staff-docs-topics-${page.published_slug}`} className="staff-docs__topics" aria-label={`Tópicos de ${page.published_title}`} hidden={!isExpanded}>{topics.map((topic) => <Link key={topic.id} href={`/guia-equipe/${page.published_slug}#${topic.id}`} onClick={() => { if (isActive) setActiveTopic(topic.id); }} className={`${topic.level === 3 ? "is-nested " : ""}${isActive && activeTopic === topic.id ? "is-current" : ""}`} aria-current={isActive && activeTopic === topic.id ? "location" : undefined}>{topic.title}</Link>)}</div>}</div>;
      })}</div> : null;
    })}
  </nav>;
}
