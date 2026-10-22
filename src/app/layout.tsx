import { siteCopy } from "@/lib/site-copy";
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { SiteFooter } from "@/components/site-footer";
import { GovernmentBar } from "@/components/government-bar";
import { InterfaceLanguageProvider } from "@/components/interface-language";
import { CookieNotice } from "@/components/cookie-notice";
import { TooltipViewportManager } from "@/components/tooltip-viewport-manager";
import { normalizeLanguage } from "@/lib/interface-language";
import { getInterfaceLanguage } from "@/lib/server-language";
import { cookies, headers } from "next/headers";
import packageInfo from "../../package.json";

const metadataBase = new URL("https://prontobib.vercel.app");
const siteTitle = `Pronto! | ${siteCopy.pt.title}`;
const siteDescription = siteCopy.pt.description;
const layoutCopy = {
  pt: [siteTitle, siteDescription, "Pular para o conteúdo principal", "Portal do Governo Brasileiro"],
  en: ["Pronto! | Catalog Record and Self-deposit Assistant", "BIB/FAUFBA service for requesting a catalog record and guiding self-deposit.", "Skip to main content", "Brazilian Government Portal"],
  es: ["Pronto! | Asistente de fichas catalográficas y autodepósito", "Servicio de BIB/FAUFBA para solicitar la ficha catalográfica y orientar el autodepósito.", "Ir al contenido principal", "Portal del Gobierno Brasileño"],
  de: ["Pronto! | Assistent für Katalogeinträge und Selbsteinreichung", "Dienst der BIB/FAUFBA zur Beantragung eines Katalogeintrags und Anleitung zur Selbsteinreichung.", "Zum Hauptinhalt", "Portal der brasilianischen Regierung"],
  fr: ["Pronto! | Assistant de catalogage et d’auto-dépôt", "Service de la BIB/FAUFBA pour demander une notice de catalogage et guider l’auto-dépôt.", "Aller au contenu principal", "Portail du gouvernement brésilien"],
  it: ["Pronto! | Assistente per schede catalografiche e autodeposito", "Servizio BIB/FAUFBA per richiedere una scheda catalografica e guidare l’autodeposito.", "Vai al contenuto principale", "Portale del Governo brasiliano"],
};

const baseMetadata: Metadata = {
  metadataBase,
  title: { default: siteTitle, template: "%s | Pronto!" },
  description: siteDescription,
  applicationName: "Pronto!",
  authors: [{ name: "Biblioteca da Faculdade de Arquitetura — UFBA" }],
  creator: "Biblioteca da Faculdade de Arquitetura — UFBA",
  publisher: "Universidade Federal da Bahia",
  category: "Educação",
  keywords: ["UFBA", "BIB/FA", "Biblioteca da Faculdade de Arquitetura", "ficha catalográfica", "autodepósito", "repositório institucional", "trabalho de conclusão de curso", "dissertação", "tese"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "pt_BR", url: "/", siteName: "Pronto!", title: siteTitle, description: siteDescription, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteTitle }] },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription, images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
};

export async function generateMetadata(): Promise<Metadata> {
  const language = await getInterfaceLanguage();
  const title = `Pronto! | ${siteCopy[language].title}`;
  const description = siteCopy[language].description;
  return { ...baseMetadata, title: { default: title, template: "%s | Pronto!" }, description, openGraph: { ...baseMetadata.openGraph, locale: language === "pt" ? "pt_BR" : `${language}_${({ en: "US", es: "ES", de: "DE", fr: "FR", it: "IT" } as const)[language]}`, title, description, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }] }, twitter: { ...baseMetadata.twitter, title, description } };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const savedLanguage = cookieStore.get("pronto-language")?.value;
  const deviceLanguage = normalizeLanguage(requestHeaders.get("accept-language")?.split(",")[0]);
  const interfaceLanguage = savedLanguage ? normalizeLanguage(savedLanguage) : deviceLanguage;
  const copy = layoutCopy[interfaceLanguage];
  return (
    <html lang={interfaceLanguage === "pt" ? "pt-BR" : interfaceLanguage} translate="no" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta name="google-site-verification" content="PmvJq_StIaeihiD5npLFGUPk46eJu_O4x1qK_onknnc" />
        <meta name="google" content="notranslate" />
        <ThemeScript />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Pronto!", url: metadataBase.toString(), inLanguage: interfaceLanguage === "pt" ? "pt-BR" : interfaceLanguage, publisher: { "@type": "Organization", name: "Universidade Federal da Bahia", url: "https://ufba.br" } }) }} />
      </head>
      <body>
        <InterfaceLanguageProvider initialLanguage={interfaceLanguage} initialDeviceLanguage={deviceLanguage} initialPreference={Boolean(savedLanguage)}>
          <GovernmentBar portalLabel={copy[3]} />
          <Script id="barra-brasil-oficial" src="https://barra.brasil.gov.br/barra_2.0.js" strategy="afterInteractive" />
          <a className="skip-link" href="#conteudo">{copy[2]}</a>
          <AccessibilityControls />
          <TooltipViewportManager />
          <div id="conteudo" tabIndex={-1}>{children}</div>
          <SiteFooter version={packageInfo.version} />
          <CookieNotice />
        </InterfaceLanguageProvider>
      </body>
    </html>
  );
}
