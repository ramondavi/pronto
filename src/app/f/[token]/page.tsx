import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Brand } from "@/components/brand";
import { CardPublicationShare } from "@/components/card-publication-share";
import { RepositoryIcon } from "@/components/repository-icon";
import { cardPublicUrl } from "@/domain/cataloging-card/public-link";
import { getInterfaceLanguage } from "@/lib/server-language";
import { createClient } from "@/lib/supabase/server";
import { formatWorkTitle } from "@/lib/work-title";

const copy = {
  pt: { eyebrow: "Ficha catalográfica", title: "Registro bibliográfico", waiting: "Publicação aguardando confirmação", waitingBody: "A ficha foi emitida. O acesso ao trabalho aparecerá aqui depois que a biblioteca confirmar a publicação no RI/UFBA.", ready: "Disponível no RI/UFBA", readyBody: "Publicação conferida pela biblioteca no Repositório Institucional da UFBA.", action: "Acessar trabalho no RI/UFBA", pendingAction: "O trabalho ainda não está disponível no RI/UFBA", destination: "Endereço da publicação", details: "Dados do trabalho", author: "Autoria", advisor: "Orientação", program: "Curso ou programa", nature: "Tipo de trabalho", publication: "Local e ano", extent: "Descrição física", subjects: "Assuntos", cdu: "Classificação CDU", pages: "páginas", volumes: "volumes" },
  en: { eyebrow: "Catalog record", title: "Bibliographic record", waiting: "Publication awaiting confirmation", waitingBody: "The catalog record has been issued. Access to the work will appear here after the library confirms publication in RI/UFBA.", ready: "Available in RI/UFBA", readyBody: "Publication verified by the library in UFBA's Institutional Repository.", action: "Open work in RI/UFBA", pendingAction: "The work is not yet available in RI/UFBA", destination: "Publication address", details: "Work details", author: "Author", advisor: "Advisor", program: "Program", nature: "Work type", publication: "Place and year", extent: "Physical description", subjects: "Subjects", cdu: "UDC classification", pages: "pages", volumes: "volumes" },
  es: { eyebrow: "Ficha catalográfica", title: "Registro bibliográfico", waiting: "Publicación pendiente de confirmación", waitingBody: "La ficha ya fue emitida. El acceso al trabajo aparecerá aquí cuando la biblioteca confirme su publicación en el RI/UFBA.", ready: "Disponible en el RI/UFBA", readyBody: "Publicación verificada por la biblioteca en el Repositorio Institucional de la UFBA.", action: "Abrir trabajo en el RI/UFBA", pendingAction: "El trabajo aún no está disponible en el RI/UFBA", destination: "Dirección de la publicación", details: "Datos del trabajo", author: "Autoría", advisor: "Dirección", program: "Programa", nature: "Tipo de trabajo", publication: "Lugar y año", extent: "Descripción física", subjects: "Materias", cdu: "Clasificación CDU", pages: "páginas", volumes: "volúmenes" },
  de: { eyebrow: "Katalogeintrag", title: "Bibliografischer Eintrag", waiting: "Veröffentlichung wird noch bestätigt", waitingBody: "Der Katalogeintrag wurde erstellt. Der Zugang zur Arbeit erscheint hier nach Bestätigung der Veröffentlichung im RI/UFBA.", ready: "Im RI/UFBA verfügbar", readyBody: "Die Veröffentlichung wurde von der Bibliothek im institutionellen Repositorium der UFBA geprüft.", action: "Arbeit im RI/UFBA öffnen", pendingAction: "Die Arbeit ist im RI/UFBA noch nicht verfügbar", destination: "Adresse der Veröffentlichung", details: "Angaben zur Arbeit", author: "Verfasser", advisor: "Betreuung", program: "Studiengang", nature: "Art der Arbeit", publication: "Ort und Jahr", extent: "Umfang", subjects: "Schlagwörter", cdu: "UDK-Klassifikation", pages: "Seiten", volumes: "Bände" },
  fr: { eyebrow: "Notice de catalogage", title: "Notice bibliographique", waiting: "Publication en attente de confirmation", waitingBody: "La notice a été émise. L'accès au travail apparaîtra ici après confirmation de sa publication dans le RI/UFBA.", ready: "Disponible dans le RI/UFBA", readyBody: "Publication vérifiée par la bibliothèque dans le dépôt institutionnel de l'UFBA.", action: "Ouvrir le travail dans le RI/UFBA", pendingAction: "Le travail n'est pas encore disponible dans le RI/UFBA", destination: "Adresse de la publication", details: "Données du travail", author: "Auteur", advisor: "Direction", program: "Formation", nature: "Type de travail", publication: "Lieu et année", extent: "Description matérielle", subjects: "Sujets", cdu: "Classification CDU", pages: "pages", volumes: "volumes" },
  it: { eyebrow: "Scheda catalografica", title: "Record bibliografico", waiting: "Pubblicazione in attesa di conferma", waitingBody: "La scheda è stata emessa. L'accesso al lavoro apparirà qui dopo la conferma della pubblicazione nel RI/UFBA.", ready: "Disponibile nel RI/UFBA", readyBody: "Pubblicazione verificata dalla biblioteca nel repository istituzionale dell'UFBA.", action: "Apri il lavoro nel RI/UFBA", pendingAction: "Il lavoro non è ancora disponibile nel RI/UFBA", destination: "Indirizzo della pubblicazione", details: "Dati del lavoro", author: "Autore", advisor: "Relatore", program: "Corso o programma", nature: "Tipo di lavoro", publication: "Luogo e anno", extent: "Descrizione fisica", subjects: "Soggetti", cdu: "Classificazione CDU", pages: "pagine", volumes: "volumi" },
} as const;

type Bibliography = {
  title?: string | null; subtitle?: string | null; author?: string | null; author_entry?: string | null; advisor?: string | null;
  program?: string | null; work_nature?: string | null; publication_place?: string | null;
  deposit_year?: string | null; extent_count?: string | null; extent_unit?: string | null;
  cdu?: string | null; subjects?: string[] | null;
};
type CardPublication = { permanent_url: string | null; bibliography: Bibliography | null };

const getPublication = cache(async (token: string): Promise<CardPublication | null> => {
  const { data, error } = await (await createClient()).rpc("get_card_publication", { link_token: token }).maybeSingle();
  return error ? null : data as CardPublication | null;
});

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const language = await getInterfaceLanguage();
  const record = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token) ? await getPublication(token) : null;
  const bibliography = record?.bibliography;
  const workTitle = bibliography?.title ? formatWorkTitle(bibliography.title, bibliography.subtitle) : copy[language].title;
  const title = workTitle;
  const description = bibliography?.author ? `${copy[language].eyebrow}: ${workTitle}. ${copy[language].author}: ${bibliography.author}.` : `${copy[language].eyebrow}: ${workTitle}.`;
  const url = cardPublicUrl(token);
  const imageUrl = `${url}/opengraph-image`;
  return {
    title: { absolute: `${bibliography?.title || copy[language].title} | Pronto!` }, description, referrer: "no-referrer",
    robots: { index: false, follow: false, noarchive: true, nocache: true, noimageindex: true },
    alternates: { canonical: url },
    openGraph: { type: "article", url, siteName: "Pronto!", title, description, locale: language === "pt" ? "pt_BR" : `${language}_${({ en: "US", es: "ES", de: "DE", fr: "FR", it: "IT" } as const)[language]}`, images: [{ url: imageUrl, width: 1200, height: 630, alt: workTitle }] },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default async function CardPublicationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const language = await getInterfaceLanguage();
  const t = copy[language];
  const record = await getPublication(token);
  if (!record) notFound();
  const bibliography = record.bibliography;
  let destination: URL | null = null;
  try {
    if (record.permanent_url) {
      const parsed = new URL(record.permanent_url);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) destination = parsed;
    }
  } catch { /* Um endereço antigo inválido não impede a consulta dos dados bibliográficos. */ }
  const publication = [bibliography?.publication_place, bibliography?.deposit_year].filter(Boolean).join(", ");
  const extent = bibliography?.extent_count ? `${bibliography.extent_count} ${bibliography.extent_unit === "volumes" ? t.volumes : t.pages}` : null;
  const fields: { icon: AppIconName; label: string; value?: string | null }[] = [
    { icon: "person", label: t.author, value: bibliography?.author },
    { icon: "person", label: t.advisor, value: bibliography?.advisor },
    { icon: "home", label: t.program, value: bibliography?.program },
    { icon: "book", label: t.nature, value: bibliography?.work_nature },
    { icon: "calendar", label: t.publication, value: publication },
    { icon: "document", label: t.extent, value: extent },
  ];

  return <main className="card-publication-page"><div className="card-publication-page__inner">
    <div className="card-publication-page__brand"><Brand compact /></div>
    <header className="card-publication-page__hero"><span className="card-publication-page__hero-icon"><AppIcon name="book" /></span><div className="card-publication-page__hero-copy"><div className="card-publication-page__hero-top"><p className="eyebrow">{t.eyebrow} · Pronto!</p><CardPublicationShare language={language} title={bibliography?.title ? formatWorkTitle(bibliography.title, bibliography.subtitle) : t.title} imageTitle={bibliography?.title} subtitle={bibliography?.subtitle} author={bibliography?.author} authorEntry={bibliography?.author_entry} depositYear={bibliography?.deposit_year} workNature={bibliography?.work_nature} programName={bibliography?.program} /></div><h1>{bibliography?.title || t.title}</h1>{bibliography?.subtitle && <p className="card-publication-page__subtitle">{bibliography.subtitle}</p>}</div><div className="card-publication-page__access">{destination ? <a className="button button--primary card-publication-page__access-button" href={destination.toString()} target="_blank" rel="noopener noreferrer"><RepositoryIcon /><span>{t.action}</span><AppIcon name="external" /></a> : <button className="button button--secondary card-publication-page__access-button card-publication-page__access-button--pending" type="button" disabled><RepositoryIcon /><span><strong>{t.action}</strong><small>{t.pendingAction}</small></span></button>}</div></header>
    {bibliography && <section className="card-publication-page__details" aria-labelledby="card-publication-details"><div className="card-publication-page__section-heading"><span className="card-publication-page__section-icon"><AppIcon name="document" /></span><h2 id="card-publication-details">{t.details}</h2></div><dl className="card-publication-page__grid">{fields.filter((field) => field.value).map((field) => <div key={field.label}><dt><AppIcon name={field.icon} />{field.label}</dt><dd>{field.value}</dd></div>)}</dl>{Boolean(bibliography.subjects?.length) && <div className="card-publication-page__indexing"><h3><AppIcon name="tag" />{t.subjects}</h3><ul>{bibliography.subjects?.map((subject, index) => <li key={`${subject}-${index}`}>{subject}</li>)}</ul></div>}</section>}
  </div></main>;
}
