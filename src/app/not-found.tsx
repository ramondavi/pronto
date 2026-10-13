import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getInterfaceLanguage } from "@/lib/server-language";

const copy = {
  pt: ["Erro 404 · consulta sem resultado", "Esta página saiu da estante.", "Procuramos no catálogo, entre os rascunhos e até atrás da ficha catalográfica. Nada por aqui.", "A boa notícia: o Pronto! continua no lugar certo.", "Voltar ao início", "Consultar a Central de ajuda"],
  en: ["Error 404 · no results", "This page has left the shelf.", "We searched the catalog, the drafts, and even behind the catalog cards. Nothing here.", "The good news: Pronto! is still right where it belongs.", "Back to home", "Visit the Help center"],
  es: ["Error 404 · sin resultados", "Esta página salió de la estantería.", "Buscamos en el catálogo, entre los borradores y hasta detrás de las fichas catalográficas. No hay nada aquí.", "La buena noticia: Pronto! sigue en su lugar.", "Volver al inicio", "Visitar el Centro de ayuda"],
  de: ["Fehler 404 · keine Ergebnisse", "Diese Seite ist nicht mehr im Regal.", "Wir haben im Katalog, in den Entwürfen und sogar hinter den Karteikarten gesucht. Hier ist nichts.", "Die gute Nachricht: Pronto! ist noch am richtigen Platz.", "Zur Startseite", "Hilfe aufrufen"],
  fr: ["Erreur 404 · aucun résultat", "Cette page a quitté les rayons.", "Nous avons cherché dans le catalogue, parmi les brouillons et même derrière les fiches. Rien ici.", "La bonne nouvelle : Pronto! est toujours à sa place.", "Retour à l’accueil", "Consulter le Centre d’aide"],
  it: ["Errore 404 · nessun risultato", "Questa pagina ha lasciato lo scaffale.", "Abbiamo cercato nel catalogo, tra le bozze e persino dietro le schede. Qui non c’è nulla.", "La buona notizia: Pronto! è ancora al suo posto.", "Torna alla home", "Visita il Centro assistenza"],
};

export default async function NotFound() {
  const t = copy[await getInterfaceLanguage()];
  return (
    <>
      <SiteHeader />
      <main className="not-found-page">
        <section className="container not-found-card" aria-labelledby="not-found-title">
          <p className="eyebrow">{t[0]}</p>
          <div className="not-found-stamp" aria-hidden="true">404</div>
          <h1 id="not-found-title">{t[1]}</h1>
          <p>{t[2]}</p>
          <p className="not-found-note">{t[3]}</p>
          <div className="not-found-actions">
            <Link className="button button--primary" href="/">{t[4]}</Link>
            <Link className="button button--secondary" href="/ajuda">{t[5]}</Link>
          </div>
        </section>
      </main>
    </>
  );
}
