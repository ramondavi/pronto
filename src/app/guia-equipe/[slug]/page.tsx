import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeStaffGuideHtml } from "@/lib/staff-guide";
import { AppIcon } from "@/components/app-icon";
import { StaffGuideArticleBody } from "@/components/staff-guide-article-body";
import type { Metadata } from "next";
import { staffGuideSectionLabel as sectionLabel, staffGuideSectionOrder as sectionOrder } from "@/lib/staff-guide-sections";

type PublishedPage = { published_slug: string | null; published_section: string | null; published_position: number | null; published_title: string | null; published_summary: string | null; published_html: string | null; published_at: string | null; reviewed_version: string | null };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const stopWords = new Set(["para", "como", "com", "este", "esta", "cada", "sobre", "pela", "pelo", "guia", "pronto", "equipe", "voce", "seus", "suas"]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: page } = await supabase.from("staff_guide_pages").select("published_title")
    .eq("published_slug", slug).not("published_at", "is", null).maybeSingle();
  return { title: { absolute: `${page?.published_title ? `${page.published_title} › ` : ""}Guia da equipe | Pronto!` }, robots: { index: false, follow: false } };
}

function relatedPages(page: PublishedPage, pages: PublishedPage[]) {
  const words = new Set(normalize(`${page.published_title} ${page.published_summary}`).split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !stopWords.has(word)));
  return pages.filter((item) => item !== page).map((item) => {
    const title = normalize(item.published_title ?? "");
    const text = normalize(`${item.published_summary ?? ""} ${(item.published_html ?? "").replace(/<[^>]+>/g, " ")}`);
    let score = item.published_section === page.published_section ? 2 : 0;
    for (const word of words) score += title.includes(word) ? 3 : text.includes(word) ? 1 : 0;
    return { item, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(({ item }) => item);
}

export default async function StaffGuideArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("staff_guide_pages")
    .select("published_slug,published_section,published_position,published_title,published_summary,published_html,published_at,reviewed_version")
    .not("published_at", "is", null);
  const pages = ((data ?? []) as PublishedPage[]).filter((item) => item.published_slug && item.published_title && item.published_html)
    .sort((a, b) => (sectionOrder[a.published_section ?? ""] ?? 99) - (sectionOrder[b.published_section ?? ""] ?? 99) || (a.published_position ?? 0) - (b.published_position ?? 0));
  const index = pages.findIndex((item) => item.published_slug === slug);
  if (index < 0) notFound();
  const page = pages[index];
  const related = relatedPages(page, pages);
  const previous = pages[index - 1];
  const next = pages[index + 1];
  return <main className="staff-docs__main staff-docs__article">
    <nav className="staff-docs__breadcrumbs" aria-label="Caminho"><Link href="/guia-equipe">Guia da equipe</Link><AppIcon name="arrowRight" /><span>{page.published_title}</span></nav>
    <div className="staff-docs__eyebrow"><AppIcon name="lock" />Acesso restrito à equipe</div>
    <header className="staff-docs__article-head"><p className="eyebrow">{sectionLabel[page.published_section ?? ""] ?? "Guia da equipe"}</p><h1>{page.published_title}</h1><p>{page.published_summary}</p></header>
    <StaffGuideArticleBody html={safeStaffGuideHtml(page.published_html ?? "", pages)} />
    {related.length > 0 && <aside className="staff-docs__related" aria-labelledby="staff-docs-related-title"><h2 id="staff-docs-related-title">Leituras relacionadas</h2><div>{related.map((item) => <Link href={`/guia-equipe/${item.published_slug}`} key={item.published_slug}><AppIcon name="book" /><span><strong>{item.published_title}</strong><small>{item.published_summary}</small></span><AppIcon name="arrowRight" /></Link>)}</div></aside>}
    <footer className="staff-docs__article-footer"><p>Conferido na versão {page.reviewed_version} · Publicado em {new Date(page.published_at!).toLocaleDateString("pt-BR")}</p><nav className="staff-docs__chapter-nav" aria-label="Navegação entre capítulos">{previous ? <Link href={`/guia-equipe/${previous.published_slug}`}><AppIcon name="undo" /><span><small>Capítulo anterior</small><strong>{previous.published_title}</strong></span></Link> : <span />}{next ? <Link href={`/guia-equipe/${next.published_slug}`}><span><small>Próximo capítulo</small><strong>{next.published_title}</strong></span><AppIcon name="arrowRight" /></Link> : <span />}</nav></footer>
  </main>;
}
