import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";
import { getInterfaceLanguage } from "@/lib/server-language";
import { ProtectedEmail } from "@/components/protected-email";
import { PRIVACY_NOTICE_VERSION } from "@/domain/privacy/notice";
import { privacyCopy } from "@/lib/privacy-copy";
import { AppIcon, type AppIconName } from "@/components/app-icon";

const metadataCopy = {
  pt: ["Política de privacidade", "Entenda como o Pronto! trata e protege os dados necessários ao atendimento da BIB/FAUFBA."],
  en: ["Privacy policy", "Learn how Pronto! handles and protects the data needed for BIB/FAUFBA services."],
  es: ["Política de privacidad", "Conozca cómo Pronto! trata y protege los datos necesarios para los servicios de BIB/FAUFBA."],
  de: ["Datenschutzerklärung", "Erfahren Sie, wie Pronto! die für die Dienste der BIB/FAUFBA erforderlichen Daten verarbeitet und schützt."],
  fr: ["Politique de confidentialité", "Découvrez comment Pronto! traite et protège les données nécessaires aux services de la BIB/FAUFBA."],
  it: ["Informativa sulla privacy", "Scopri come Pronto! tratta e protegge i dati necessari ai servizi della BIB/FAUFBA."],
};

export async function generateMetadata(): Promise<Metadata> {
  const [title, description] = metadataCopy[await getInterfaceLanguage()];
  return { title, description, alternates: { canonical: "/politica-de-privacidade" }, openGraph: { title: `${title} | Pronto!`, description, url: "/politica-de-privacidade", images: [{ url: "/opengraph-image", alt: `${title} | Pronto!` }] }, twitter: { title: `${title} | Pronto!`, description, images: ["/opengraph-image"] } };
}

const icons = ["shield", "document", "clock"] as const satisfies readonly AppIconName[];

function SummaryIcon({ name }: { name: AppIconName }) {
  return <AppIcon name={name} focusable="false" />;
}

export default async function PrivacyNoticePage() {
  const language = await getInterfaceLanguage();
  const t = privacyCopy[language];
  const updated = new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, { dateStyle: "long", timeZone: "UTC" }).format(new Date("2026-09-25T12:00:00Z"));
  return <><SiteHeader /><main className="privacy-page">
    <header className="container privacy-hero">
      <p className="eyebrow">{t.version} {PRIVACY_NOTICE_VERSION} · {t.updated}: {updated}</p><h1>{t.heading}</h1>
      <p className="privacy-hero__lead">{t.lead}</p>
    </header>
    <section className="container privacy-summary" aria-label={t.summaryLabel}>{t.summary.map(([title, description], index) => <article className="privacy-summary__card" key={title}><span className="privacy-summary__icon"><SummaryIcon name={icons[index]} /></span><h2>{title}</h2><p>{description}</p></article>)}</section>
    <section className="container privacy-accordion" aria-label={t.detailsLabel}>
      <details open><summary><span>01</span><strong>{t.sections[0].title}</strong><b aria-hidden="true">+</b></summary><div>{t.sections[0].paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></details>
      <details><summary><span>02</span><strong>{t.sections[1].title}</strong><b aria-hidden="true">+</b></summary><div><p><strong>{t.controllerLabel}</strong> {t.controller}</p><p><strong>{t.serviceLabel}</strong> <ProtectedEmail recipient="library" />. <strong>{t.officerLabel}</strong> {t.officer}; {t.institutionalChannel}: <ProtectedEmail recipient="privacy" />.</p><p>{t.informationPrefix} <a href="https://lgpd.ufba.br/" target="_blank" rel="noreferrer">{t.informationLink}</a>.</p><p>{t.legalBasis}</p></div></details>
      {t.sections.slice(2).map((section, index) => <details key={section.title}><summary><span>{String(index + 3).padStart(2, "0")}</span><strong>{section.title}</strong><b aria-hidden="true">+</b></summary><div>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></details>)}
    </section>
  </main></>;
}
