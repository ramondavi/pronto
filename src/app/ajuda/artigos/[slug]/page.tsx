import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getPublishedKnowledge, safeKnowledgeHtml } from "@/lib/knowledge-service";
import { getInterfaceLanguage } from "@/lib/server-language";
import { helpCopy, helpCategoryLabel } from "@/lib/help-copy";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = (await getPublishedKnowledge()).find((entry) => entry.kind === "article" && entry.slug === slug);
  if (!article) return {};
  const title = `${article.title} | Pronto!`;
  const url = `/ajuda/artigos/${slug}`;
  return { title: article.title, description: article.summary, alternates: { canonical: url }, openGraph: { title, description: article.summary, url, images: [{ url: "/opengraph-image", alt: title }] }, twitter: { title, description: article.summary, images: ["/opengraph-image"] } };
}

const articleCopy = {
  pt: ["Neste artigo", "Guia completo", "Voltar à Central de ajuda", "Continue aprendendo", "Artigos relacionados"],
  en: ["In this article", "Complete guide", "Back to Help center", "Keep learning", "Related articles"],
  es: ["En este artículo", "Guía completa", "Volver al Centro de ayuda", "Siga aprendiendo", "Artículos relacionados"],
  de: ["In diesem Artikel", "Ausführliche Anleitung", "Zurück zur Hilfe", "Mehr erfahren", "Verwandte Artikel"],
  fr: ["Dans cet article", "Guide complet", "Retour au Centre d’aide", "Pour aller plus loin", "Articles associés"],
  it: ["In questo articolo", "Guida completa", "Torna al Centro assistenza", "Continua a imparare", "Articoli correlati"],
};
const dateLabels = {
  pt: ["Publicado em", "Atualizado em"], en: ["Published on", "Updated on"],
  es: ["Publicado el", "Actualizado el"], de: ["Veröffentlicht am", "Aktualisiert am"],
  fr: ["Publié le", "Mis à jour le"], it: ["Pubblicato il", "Aggiornato il"],
};

export default async function KnowledgeArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const language = await getInterfaceLanguage();
  const t = helpCopy[language]; const a = articleCopy[language];
  const { slug } = await params;
  const articles = (await getPublishedKnowledge()).filter((entry) => entry.kind === "article" && entry.slug);
  const article = articles.find((entry) => entry.slug === slug);
  if (!article) notFound();
  const publishedAt = article.published_at ?? article.created_at;
  const updatedAt = article.updated_at;
  const dateFormatter = new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, { dateStyle: "long", timeZone: "America/Sao_Paulo" });
  const sections: { title: string; level: number }[] = [];
  const html = safeKnowledgeHtml(article.body_html).replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (_match, level: string, attributes: string | undefined, heading: string) => {
    const title = heading.replace(/<span\b[^>]*aria-hidden=["']true["'][^>]*>[\s\S]*?<\/span>/gi, "").replace(/<[^>]*>/g, "").trim();
    sections.push({ title, level: Number(level) });
    return `<h${level}${attributes ?? ""} id="secao-${sections.length}">${heading}</h${level}>`;
  });
  const related = articles.filter((entry) => entry.id !== article.id && entry.category === article.category)
    .concat(articles.filter((entry) => entry.id !== article.id && entry.category !== article.category)).slice(0, 2);
  return <><SiteHeader articleTitle={article.title} /><main className="knowledge-article">
    <header className="container knowledge-article__heading"><p className="eyebrow">{helpCategoryLabel(language, article.category)} · {t.articles}</p><h1>{article.title}</h1><p>{article.summary}</p>{(publishedAt || updatedAt) && <dl className="knowledge-article__dates">{publishedAt && <div><dt>{dateLabels[language][0]}</dt><dd><time dateTime={publishedAt}>{dateFormatter.format(new Date(publishedAt))}</time></dd></div>}{updatedAt && <div><dt>{dateLabels[language][1]}</dt><dd><time dateTime={updatedAt}>{dateFormatter.format(new Date(updatedAt))}</time></dd></div>}</dl>}</header>
    <div className="container knowledge-article__layout">
      <aside className="knowledge-article__toc" aria-label={a[0]}><strong>{a[0]}</strong>{sections.length ? <ol>{sections.map((section, index) => <li className={`knowledge-article__toc-level-${section.level}`} key={index}><a href={`#secao-${index + 1}`}>{section.title}</a></li>)}</ol> : <p>{a[1]}</p>}</aside>
      <article className="knowledge-article__body"><div className="knowledge-rich-content" dangerouslySetInnerHTML={{ __html: html }} /><Link className="button button--secondary" href="/ajuda">{a[2]}</Link></article>
    </div>
    {related.length > 0 && <section className="container knowledge-related" aria-labelledby="artigos-relacionados"><p className="eyebrow">{a[3]}</p><h2 id="artigos-relacionados">{a[4]}</h2><div className="knowledge-cards">{related.map((item) => <article key={item.id}><span>{helpCategoryLabel(language, item.category)}</span><h3>{item.title}</h3><p>{item.summary}</p><Link href={`/ajuda/artigos/${item.slug}`}>{t.read}</Link></article>)}</div></section>}
  </main></>;
}
