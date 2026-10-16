import "server-only";
import sanitizeHtml from "sanitize-html";
import { createClient } from "@/lib/supabase/server";
import { articleHtml, helpArticles, initialKnowledgeEntries, type KnowledgeEntry, type KnowledgeItem } from "@/lib/knowledge-base";
import { getInterfaceLanguage } from "@/lib/server-language";
import { fallbackKnowledgeTranslation } from "@/lib/knowledge-translations";
import type { InterfaceLanguage } from "@/lib/interface-language";
import { userHasPermission } from "@/lib/staff-permissions";

const fields = "id,slug,kind,title,summary,body_html,translations,category,audiences,active,position,featured_position,created_at,updated_at,published_at";

export async function canEditPublicKnowledge(kind: KnowledgeEntry["kind"]): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (!profile || profile.status !== "active" || !["administrator", "cataloger"].includes(profile.role)) return false;
  if (await userHasPermission(supabase, "admin.knowledge.manage", profile.role)) return true;
  return kind === "faq" && await userHasPermission(supabase, "admin.faq.manage", profile.role);
}

function localizedEntry(entry: KnowledgeEntry, language: InterfaceLanguage): KnowledgeEntry {
  const translated = entry.translations?.[language]?.title && entry.translations?.[language]?.summary && entry.translations?.[language]?.body_html
    ? entry.translations[language] : fallbackKnowledgeTranslation(entry, language);
  return translated?.title && translated.summary && translated.body_html
    ? { ...entry, title: translated.title, summary: translated.summary, body_html: translated.body_html }
    : entry;
}

function protectPublicContacts(entry: KnowledgeEntry, language: InterfaceLanguage): KnowledgeEntry {
  const labels = {
    pt: ["e-mail disponível na Central de Ajuda", "telefone disponível na Central de Ajuda"],
    en: ["email available in the Help center", "phone available in the Help center"],
    es: ["correo disponible en el Centro de ayuda", "teléfono disponible en el Centro de ayuda"],
    de: ["E-Mail in der Hilfe verfügbar", "Telefonnummer in der Hilfe verfügbar"],
    fr: ["adresse disponible dans le Centre d’aide", "téléphone disponible dans le Centre d’aide"],
    it: ["e-mail disponibile nel Centro assistenza", "telefono disponibile nel Centro assistenza"],
  }[language];
  const hideContacts = (value: string) => value
    .replace(/mailto:[^"'\s<>]+/gi, "/ajuda#contato-ajuda")
    .replace(/tel:[^"'\s<>]+/gi, "/ajuda#contato-ajuda")
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, labels[0])
    .replace(/(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g, labels[1]);
  return { ...entry, title: hideContacts(entry.title), summary: hideContacts(entry.summary), category: hideContacts(entry.category), body_html: hideContacts(entry.body_html) };
}

export function safeKnowledgeHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["section", "span", "mark", "p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "s", "u", "ul", "ol", "li", "blockquote", "hr", "a", "img", "table", "caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td"],
    allowedAttributes: { section: ["class"], span: ["class", "aria-hidden", "style"], mark: ["style"], p: ["style"], h1: ["style"], h2: ["style", "data-heading-icon", "data-heading-icon-color"], h3: ["style", "data-heading-icon", "data-heading-icon-color"], h4: ["style"], h5: ["style"], h6: ["style"], ol: ["class"], th: ["colspan", "rowspan", "align", "scope"], td: ["colspan", "rowspan", "align"], a: ["href", "target", "rel"], img: ["src", "alt", "title", "width", "height", "style"] },
    allowedStyles: {
      span: { color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/i] },
      mark: { "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/i] },
      p: { "text-align": [/^(left|center|right)$/] },
      h1: { "text-align": [/^(left|center|right)$/] },
      h2: { "text-align": [/^(left|center|right)$/] },
      h3: { "text-align": [/^(left|center|right)$/] },
      h4: { "text-align": [/^(left|center|right)$/] },
      h5: { "text-align": [/^(left|center|right)$/] },
      h6: { "text-align": [/^(left|center|right)$/] },
      img: { width: [/^\d{2,4}px$/], height: [/^\d{2,4}px$/] },
    },
    allowedSchemes: ["https", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    transformTags: { a: (_tag, attrs) => ({ tagName: "a", attribs: { href: attrs.href ?? "#", target: attrs.target === "_self" ? "_self" : "_blank", ...(attrs.target === "_self" ? {} : { rel: "noopener noreferrer" }) } }), img: (_tag, attrs) => ({ tagName: "img", attribs: { src: attrs.src ?? "", alt: attrs.alt ?? "", ...(attrs.width && /^\d{2,4}$/.test(attrs.width) ? { width: attrs.width } : {}), ...(attrs.height && /^\d{2,4}$/.test(attrs.height) ? { height: attrs.height } : {}), ...(attrs.style ? { style: attrs.style } : {}), loading: "lazy" } }) },
  });
}

export function toKnowledgeItem(entry: KnowledgeEntry): KnowledgeItem {
  return {
    id: entry.id, slug: entry.slug ?? undefined,
    kind: entry.kind === "faq" ? "Pergunta frequente" : entry.kind === "answer" ? "Dúvida rápida" : "Artigo de ajuda",
    title: entry.title, summary: entry.summary, category: entry.category,
    bodyHtml: safeKnowledgeHtml(entry.body_html),
  };
}

export async function getPublishedKnowledge(publicOnly = true): Promise<KnowledgeEntry[]> {
  const supabase = await createClient();
  let query = supabase.from("knowledge_base_entries").select(fields).eq("active", true).order("position");
  if (publicOnly) query = query.contains("audiences", ["public"]);
  const { data, error } = await query;
  if (!error) {
    const language = await getInterfaceLanguage();
    const entries = data as KnowledgeEntry[];
    const nadaConstaGuide = helpArticles.find((item) => item.slug === "emitir-nada-consta");
    if (nadaConstaGuide && !entries.some((entry) => entry.slug === nadaConstaGuide.slug)) entries.push({ id: `initial-${nadaConstaGuide.id}`, slug: nadaConstaGuide.slug ?? null, kind: "article", title: nadaConstaGuide.title, summary: nadaConstaGuide.summary, body_html: articleHtml(nadaConstaGuide), category: nadaConstaGuide.category, audiences: ["public", "student", "panel"], active: true, position: 1070, featured_position: null, created_at: null, updated_at: null, published_at: null });
    return entries.map((entry) => { const localized = localizedEntry(entry, language); return publicOnly ? protectPublicContacts(localized, language) : localized; });
  }
  const { data: faqs } = await supabase.from("frequently_asked_questions")
    .select("id,question,answer,active,position,featured_position,created_at,updated_at").eq("active", true).order("position");
  const defaults = faqs?.length ? faqs : [
    { id: "fallback-1", question: "Quem pode usar o Pronto!?", answer: "Estudantes da UFBA que precisam solicitar ficha catalográfica e realizar o autodepósito, além da equipe autorizada da BIB/FA.", active: true, position: 10 },
    { id: "fallback-2", question: "O trabalho completo é enviado ao Pronto!?", answer: "Não. O estudante informa um link público para análise e o PDF completo permanece no próprio dispositivo durante a mesclagem da ficha.", active: true, position: 20 },
    { id: "fallback-3", question: "Quando posso baixar a ficha?", answer: "Depois que a ficha for homologada pela biblioteca e o Nada Consta for aprovado.", active: true, position: 30 },
  ];
  const initial = initialKnowledgeEntries(defaults);
  const language = await getInterfaceLanguage();
  return initial.map((entry) => { const localized = localizedEntry(entry, language); return publicOnly ? protectPublicContacts(localized, language) : localized; });
}
