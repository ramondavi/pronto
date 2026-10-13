import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { HelpSearch } from "@/components/help-search";
import { AppIcon } from "@/components/app-icon";
import { ProtectedEmail } from "@/components/protected-email";
import { ProtectedPhone } from "@/components/protected-phone";
import { getPublishedKnowledge, safeKnowledgeHtml } from "@/lib/knowledge-service";
import { getInterfaceLanguage } from "@/lib/server-language";
import { helpCopy, helpCategoryLabel } from "@/lib/help-copy";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getInterfaceLanguage();
  const { center, intro } = helpCopy[language];
  return { title: center, description: intro, alternates: { canonical: "/ajuda" }, openGraph: { title: `${center} | Pronto!`, description: intro, url: "/ajuda", locale: language === "pt" ? "pt_BR" : language, images: [{ url: "/opengraph-image", alt: `${center} | Pronto!` }] }, twitter: { title: `${center} | Pronto!`, description: intro, images: ["/opengraph-image"] } };
}

export default async function HelpPage() {
  const language = await getInterfaceLanguage(); const t = helpCopy[language];
  const entries = await getPublishedKnowledge();
  const faqs = entries.filter((entry) => entry.kind === "faq");
  const articles = entries.filter((entry) => entry.kind === "article" && entry.slug);
  return <><SiteHeader /><main className="faq-page">
    <header className="container faq-heading"><p className="eyebrow">{t.center}</p><h1>{t.title}</h1><p>{t.intro}</p></header>
    <HelpSearch />
    <section className="container faq-list" aria-labelledby="perguntas-frequentes"><p className="eyebrow">{t.faq}</p><h2 id="perguntas-frequentes">{t.faqTitle}</h2>{faqs.map((faq) => <details key={faq.id}><summary>{faq.title}</summary><div className="knowledge-rich-content" dangerouslySetInnerHTML={{ __html: safeKnowledgeHtml(faq.body_html || `<p>${faq.summary}</p>`) }} /></details>)}</section>
    <section className="container knowledge-category" aria-labelledby="artigos-ajuda"><p className="eyebrow">{t.articles}</p><h2 id="artigos-ajuda">{t.articleTitle}</h2><div className="knowledge-cards">{articles.map((article) => <article key={article.id}><div className="knowledge-cards__category"><AppIcon name={article.category === "Análise" ? "review" : article.category === "Autodepósito" ? "upload" : "document"} /><span>{helpCategoryLabel(language, article.category)}</span></div><h3>{article.title}</h3><p>{article.summary}</p><Link href={`/ajuda/artigos/${article.slug}`}>{t.read}</Link></article>)}</div></section>
    <section className="container help-contact" aria-labelledby="contato-ajuda"><AppIcon name="help" className="help-contact__watermark" /><div><p className="eyebrow">{t.contact}</p><h2 id="contato-ajuda">{t.contactTitle}</h2><p>{t.contactIntro}</p></div><address><ProtectedEmail recipient="library" /><ProtectedPhone /></address></section>
  </main></>;
}
