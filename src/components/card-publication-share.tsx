"use client";

import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource-variable/oswald/wght.css";
import "@fontsource-variable/playfair-display/wght.css";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/caveat/wght.css";
import "@fontsource-variable/unbounded/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/700.css";

import { useEffect, useRef, useState } from "react";
// Font Awesome Free brand icons, CC BY 4.0: https://fontawesome.com/license/free
import { faWhatsapp, faInstagram, faXTwitter, faFacebookF, faLinkedinIn, faTelegram } from "@fortawesome/free-brands-svg-icons";
import { AppIcon } from "@/components/app-icon";
import { createInstagramImage, instagramFonts, instagramFormats, instagramPalettes, type InstagramFont, type InstagramFormat, type InstagramPalette } from "@/domain/cataloging-card/instagram-share-image";
import { downloadPublicPagePdf } from "@/domain/cataloging-card/public-page-pdf";
import type { InterfaceLanguage } from "@/lib/interface-language";

const copy = {
  pt: { share: "Compartilhar esta página", eyebrow: "COMPARTILHAR", intro: "Envie o endereço público deste registro.", copy: "Copiar link", copied: "Link copiado", instagramCopied: "Imagem baixada. O endereço desta página do trabalho foi copiado automaticamente; cole-o na legenda da publicação ou no sticker de link do Story.", instagramNoCopy: "Imagem baixada. Para incluir o endereço desta página na publicação, clique em “Copiar link” acima.", instagramPreparing: "Preparando a imagem para o Instagram…", instagramFailed: "Não foi possível preparar a imagem agora.", instagramShared: "Imagem enviada ao compartilhamento do dispositivo.", imageLabel: "TRABALHO ACADÊMICO", imageOptions: "Imagem para Instagram", imageFormat: "Formato", imagePalette: "Paleta", imageFeed: "Publicação vertical", imageSquare: "Publicação quadrada", imageStory: "Story", imageInstitutional: "Institucional", imageOcean: "Oceano", imageClay: "Argila", imageGraphite: "Grafite", copyFailed: "Não foi possível copiar", email: "E-mail", print: "Imprimir", pdf: "Salvar como PDF", close: "Fechar" },
  en: { share: "Share this page", eyebrow: "SHARE", intro: "Send the public link to this record.", copy: "Copy link", copied: "Link copied", instagramCopied: "Image downloaded. This work page's address was copied automatically; paste it in the post caption or Story link sticker.", instagramNoCopy: "Image downloaded. To add this page's address to your post, select Copy link above.", instagramPreparing: "Preparing the Instagram image…", instagramFailed: "Could not prepare the image now.", instagramShared: "Image sent to your device's share menu.", imageLabel: "ACADEMIC WORK", imageOptions: "Instagram image", imageFormat: "Format", imagePalette: "Palette", imageFeed: "Portrait post", imageSquare: "Square post", imageStory: "Story", imageInstitutional: "Institutional", imageOcean: "Ocean", imageClay: "Clay", imageGraphite: "Graphite", copyFailed: "Could not copy link", email: "Email", print: "Print", pdf: "Save as PDF", close: "Close" },
  es: { share: "Compartir esta página", eyebrow: "COMPARTIR", intro: "Envíe el enlace público de este registro.", copy: "Copiar enlace", copied: "Enlace copiado", instagramCopied: "Imagen descargada. La dirección de esta página del trabajo se copió automáticamente; péguela en la descripción o el sticker de enlace de la historia.", instagramNoCopy: "Imagen descargada. Para incluir la dirección de esta página, pulse «Copiar enlace» arriba.", instagramPreparing: "Preparando la imagen para Instagram…", instagramFailed: "No se pudo preparar la imagen ahora.", instagramShared: "Imagen enviada al menú para compartir del dispositivo.", imageLabel: "TRABAJO ACADÉMICO", imageOptions: "Imagen para Instagram", imageFormat: "Formato", imagePalette: "Paleta", imageFeed: "Publicación vertical", imageSquare: "Publicación cuadrada", imageStory: "Historia", imageInstitutional: "Institucional", imageOcean: "Océano", imageClay: "Arcilla", imageGraphite: "Grafito", copyFailed: "No se pudo copiar", email: "Correo", print: "Imprimir", pdf: "Guardar como PDF", close: "Cerrar" },
  de: { share: "Diese Seite teilen", eyebrow: "TEILEN", intro: "Senden Sie den öffentlichen Link zu diesem Eintrag.", copy: "Link kopieren", copied: "Link kopiert", instagramCopied: "Bild heruntergeladen. Die Adresse dieser Werkseite wurde automatisch kopiert; fügen Sie sie in die Bildunterschrift oder den Story-Link-Sticker ein.", instagramNoCopy: "Bild heruntergeladen. Wählen Sie oben „Link kopieren“, um die Adresse dieser Seite zum Beitrag hinzuzufügen.", instagramPreparing: "Instagram-Bild wird erstellt…", instagramFailed: "Das Bild konnte derzeit nicht erstellt werden.", instagramShared: "Bild an das Teilen-Menü des Geräts gesendet.", imageLabel: "WISSENSCHAFTLICHE ARBEIT", imageOptions: "Instagram-Bild", imageFormat: "Format", imagePalette: "Farbpalette", imageFeed: "Hochformat-Beitrag", imageSquare: "Quadratischer Beitrag", imageStory: "Story", imageInstitutional: "Institutionell", imageOcean: "Ozean", imageClay: "Ton", imageGraphite: "Graphit", copyFailed: "Link konnte nicht kopiert werden", email: "E-Mail", print: "Drucken", pdf: "Als PDF speichern", close: "Schließen" },
  fr: { share: "Partager cette page", eyebrow: "PARTAGER", intro: "Envoyez le lien public vers cette notice.", copy: "Copier le lien", copied: "Lien copié", instagramCopied: "Image téléchargée. L’adresse de cette page du travail a été copiée automatiquement ; collez-la dans la légende ou le sticker de lien de la story.", instagramNoCopy: "Image téléchargée. Pour ajouter l’adresse de cette page, cliquez sur « Copier le lien » ci-dessus.", instagramPreparing: "Préparation de l'image Instagram…", instagramFailed: "Impossible de préparer l'image maintenant.", instagramShared: "Image envoyée au menu de partage de l'appareil.", imageLabel: "TRAVAIL UNIVERSITAIRE", imageOptions: "Image Instagram", imageFormat: "Format", imagePalette: "Palette", imageFeed: "Publication portrait", imageSquare: "Publication carrée", imageStory: "Story", imageInstitutional: "Institutionnelle", imageOcean: "Océan", imageClay: "Argile", imageGraphite: "Graphite", copyFailed: "Impossible de copier le lien", email: "E-mail", print: "Imprimer", pdf: "Enregistrer en PDF", close: "Fermer" },
  it: { share: "Condividi questa pagina", eyebrow: "CONDIVIDI", intro: "Invia il link pubblico a questa scheda.", copy: "Copia link", copied: "Link copiato", instagramCopied: "Immagine scaricata. L’indirizzo di questa pagina del lavoro è stato copiato automaticamente; incollalo nella didascalia o nello sticker del link della storia.", instagramNoCopy: "Immagine scaricata. Per aggiungere l’indirizzo di questa pagina, premi «Copia link» qui sopra.", instagramPreparing: "Preparazione dell'immagine Instagram…", instagramFailed: "Impossibile preparare l'immagine ora.", instagramShared: "Immagine inviata al menu di condivisione del dispositivo.", imageLabel: "LAVORO ACCADEMICO", imageOptions: "Immagine Instagram", imageFormat: "Formato", imagePalette: "Palette", imageFeed: "Post verticale", imageSquare: "Post quadrato", imageStory: "Storia", imageInstitutional: "Istituzionale", imageOcean: "Oceano", imageClay: "Argilla", imageGraphite: "Grafite", copyFailed: "Impossibile copiare il link", email: "E-mail", print: "Stampa", pdf: "Salva come PDF", close: "Chiudi" },
} as const;

const paletteNames: Record<InterfaceLanguage, Record<InstagramPalette, string>> = {
  pt: { institutional: "Institucional", ocean: "Oceano", clay: "Argila", graphite: "Grafite", midnight: "Noturno", coral: "Coral", cobalt: "Cobalto", lime: "Lima" },
  en: { institutional: "Institutional", ocean: "Ocean", clay: "Clay", graphite: "Graphite", midnight: "Midnight", coral: "Coral", cobalt: "Cobalt", lime: "Lime" },
  es: { institutional: "Institucional", ocean: "Océano", clay: "Arcilla", graphite: "Grafito", midnight: "Nocturna", coral: "Coral", cobalt: "Cobalto", lime: "Lima" },
  de: { institutional: "Institutionell", ocean: "Ozean", clay: "Ton", graphite: "Graphit", midnight: "Mitternacht", coral: "Koralle", cobalt: "Kobalt", lime: "Limette" },
  fr: { institutional: "Institutionnelle", ocean: "Océan", clay: "Argile", graphite: "Graphite", midnight: "Nocturne", coral: "Corail", cobalt: "Cobalt", lime: "Citron vert" },
  it: { institutional: "Istituzionale", ocean: "Oceano", clay: "Argilla", graphite: "Grafite", midnight: "Notturna", coral: "Corallo", cobalt: "Cobalto", lime: "Lime" },
};

const typographyLabel: Record<InterfaceLanguage, string> = {
  pt: "Tipografia", en: "Typography", es: "Tipografía", de: "Typografie", fr: "Typographie", it: "Tipografia",
};

const instagramFormatTitles: Record<InterfaceLanguage, { portrait: string; square: string; story: string }> = {
  pt: { portrait: "Feed vertical", square: "Feed quadrado", story: "Story" },
  en: { portrait: "Portrait feed", square: "Square feed", story: "Story" },
  es: { portrait: "Feed vertical", square: "Feed cuadrado", story: "Historia" },
  de: { portrait: "Feed Hochformat", square: "Feed quadratisch", story: "Story" },
  fr: { portrait: "Fil vertical", square: "Fil carré", story: "Story" },
  it: { portrait: "Feed verticale", square: "Feed quadrato", story: "Storia" },
};

const studentShareCopy: Record<InterfaceLanguage, { action: string; intro: string }> = {
  pt: { action: "Compartilhar trabalho", intro: "Compartilhe a página pública do trabalho. O acesso ao arquivo aparecerá nela após a publicação no RI/UFBA." },
  en: { action: "Share work", intro: "Share the work's public page. Access to the file will appear there after publication in RI/UFBA." },
  es: { action: "Compartir trabajo", intro: "Comparta la página pública del trabajo. El acceso al archivo aparecerá allí tras su publicación en el RI/UFBA." },
  de: { action: "Arbeit teilen", intro: "Teilen Sie die öffentliche Seite der Arbeit. Der Zugang zur Datei erscheint dort nach der Veröffentlichung im RI/UFBA." },
  fr: { action: "Partager le travail", intro: "Partagez la page publique du travail. L'accès au fichier y apparaîtra après sa publication dans le RI/UFBA." },
  it: { action: "Condividi il lavoro", intro: "Condividi la pagina pubblica del lavoro. L'accesso al file apparirà dopo la pubblicazione nel RI/UFBA." },
};

const pdfFeedback = {
  pt: { done: "PDF baixado.", failed: "Não foi possível gerar o PDF agora." },
  en: { done: "PDF downloaded.", failed: "Could not generate the PDF now." },
  es: { done: "PDF descargado.", failed: "No se pudo generar el PDF ahora." },
  de: { done: "PDF heruntergeladen.", failed: "Das PDF konnte derzeit nicht erstellt werden." },
  fr: { done: "PDF téléchargé.", failed: "Impossible de générer le PDF maintenant." },
  it: { done: "PDF scaricato.", failed: "Impossibile generare il PDF ora." },
} as const;

type Network = "whatsapp" | "instagram" | "x" | "facebook" | "linkedin" | "telegram";
type DirectNetwork = Exclude<Network, "instagram">;

function NetworkIcon({ name }: { name: Network }) {
  const icons = { whatsapp: faWhatsapp, instagram: faInstagram, x: faXTwitter, facebook: faFacebookF, linkedin: faLinkedinIn, telegram: faTelegram };
  const icon = icons[name];
  const paths = icon.icon[4];
  return <svg viewBox={`0 0 ${icon.icon[0]} ${icon.icon[1]}`} aria-hidden="true" fill="currentColor">{(Array.isArray(paths) ? paths : [paths]).map((path, index) => <path key={index} d={path} />)}</svg>;
}

function downloadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

export function CardPublicationShare({ language, title, imageTitle, subtitle, author, authorEntry, depositYear, workNature, programName, publicUrl, placement = "public" }: { language: InterfaceLanguage; title: string; imageTitle?: string | null; subtitle?: string | null; author?: string | null; authorEntry?: string | null; depositYear?: string | null; workNature?: string | null; programName?: string | null; publicUrl?: string; placement?: "public" | "student" }) {
  const t = copy[language];
  const dialog = useRef<HTMLDialogElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [instagramFile, setInstagramFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [format, setFormat] = useState<InstagramFormat>("portrait");
  const [palette, setPalette] = useState<InstagramPalette>("institutional");
  const [font, setFont] = useState<InstagramFont>("inter");
  useEffect(() => {
    if (!isOpen || !instagramOpen) return;
    let cancelled = false;
    createInstagramImage(imageTitle || title, subtitle ?? null, author ?? null, workNature || t.imageLabel, programName ?? null, format, palette, font, authorEntry ?? null, depositYear ?? null)
      .then((file) => { if (!cancelled) setInstagramFile(file); })
      .catch(() => { if (!cancelled) setCopyStatus(t.instagramFailed); });
    return () => { cancelled = true; };
  }, [isOpen, instagramOpen, title, imageTitle, subtitle, author, authorEntry, depositYear, workNature, programName, format, palette, font, t.imageLabel, t.instagramFailed]);
  useEffect(() => {
    if (!instagramFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(instagramFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [instagramFile]);
  const pageUrl = () => new URL(publicUrl || window.location.href, window.location.origin).toString();
  const openNetwork = (network: DirectNetwork) => {
    const url = encodeURIComponent(pageUrl());
    const text = encodeURIComponent(title);
    const destinations: Record<DirectNetwork, string> = {
      whatsapp: `https://api.whatsapp.com/send?text=${text}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };
    window.open(destinations[network], "_blank", "noopener,noreferrer");
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(pageUrl()); setCopyStatus(t.copied); }
    catch { setCopyStatus(t.copyFailed); }
  };
  const openDialog = () => { setCopyStatus(""); setInstagramOpen(false); setInstagramFile(null); dialog.current?.showModal(); setIsOpen(true); };
  const shareInstagram = async () => {
    if (!instagramFile) return;
    const url = pageUrl();
    downloadImage(instagramFile);
    try { await navigator.clipboard.writeText(url); setCopyStatus(t.instagramCopied); }
    catch { setCopyStatus(t.instagramNoCopy); }
  };
  const email = () => { window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(pageUrl())}`; };
  const print = () => { dialog.current?.close(); window.print(); };
  const savePdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    setCopyStatus("");
    try { await downloadPublicPagePdf(title); setCopyStatus(pdfFeedback[language].done); }
    catch { setCopyStatus(pdfFeedback[language].failed); }
    finally { setPdfBusy(false); }
  };

  return <><button className={placement === "student" ? "button button--secondary button--with-icon browser-pdf-delivery__share-button" : "card-publication-page__share"} type="button" aria-label={placement === "student" ? studentShareCopy[language].action : t.share} title={placement === "student" ? studentShareCopy[language].action : t.share} onClick={openDialog}><AppIcon name="share" />{placement === "student" && studentShareCopy[language].action}</button>
    <dialog className={`card-publication-share${instagramOpen ? " card-publication-share--instagram" : ""}${placement === "student" ? " card-publication-share--student" : ""}`} ref={dialog} aria-labelledby="card-publication-share-title" onClose={() => { setIsOpen(false); setInstagramOpen(false); }} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <div className="card-publication-share__header"><div><p className="eyebrow">{t.eyebrow}</p><h2 id="card-publication-share-title">{t.share}</h2><p>{placement === "student" ? studentShareCopy[language].intro : t.intro}</p></div><button type="button" aria-label={t.close} onClick={() => dialog.current?.close()}><AppIcon name="close" /></button></div>
      <div className="card-publication-share__grid">
        {(["whatsapp", "instagram", "x", "facebook", "linkedin", "telegram"] as const).map((network) => <button key={network} type="button" aria-expanded={network === "instagram" ? instagramOpen : undefined} aria-controls={network === "instagram" ? "card-publication-instagram-options" : undefined} onClick={() => { if (network === "instagram") { setCopyStatus(""); setInstagramOpen((current) => !current); } else openNetwork(network); }}><NetworkIcon name={network} /><span>{network === "x" ? "X" : network === "linkedin" ? "LinkedIn" : network[0].toUpperCase() + network.slice(1)}</span></button>)}
        <button type="button" onClick={email}><AppIcon name="message" /><span>{t.email}</span></button>
        <button type="button" onClick={() => void copyLink()}><AppIcon name="link" /><span>{t.copy}</span></button>
        {placement === "public" && <button type="button" onClick={print}><AppIcon name="print" /><span>{t.print}</span></button>}
        {placement === "public" && <button className="card-publication-share__pdf" type="button" disabled={pdfBusy} onClick={() => void savePdf()}><AppIcon name="document" /><span>{t.pdf}{pdfBusy ? "…" : ""}</span></button>}
        {instagramOpen && <section className="card-publication-share__image-options" id="card-publication-instagram-options" aria-label={t.imageOptions}>
          <h3><NetworkIcon name="instagram" />{t.imageOptions}</h3>
          <div className="card-publication-share__image-editor">
            <div className="card-publication-share__image-controls">
              <div className="card-publication-share__option-label">{t.imageFormat}</div>
              <div className="card-publication-share__formats">{(Object.keys(instagramFormats) as InstagramFormat[]).map((item) => <button key={item} type="button" title={`${instagramFormats[item].width} × ${instagramFormats[item].height}`} aria-label={`${item === "portrait" || item === "portraitTall" ? instagramFormatTitles[language].portrait : item === "square" ? instagramFormatTitles[language].square : instagramFormatTitles[language].story} ${instagramFormats[item].label}`} aria-pressed={format === item} onClick={() => { if (format !== item) { setInstagramFile(null); setFormat(item); } }}><strong>{item === "portrait" || item === "portraitTall" ? instagramFormatTitles[language].portrait : item === "square" ? instagramFormatTitles[language].square : instagramFormatTitles[language].story}</strong><small>{instagramFormats[item].label}</small></button>)}</div>
              <div className="card-publication-share__option-label">{t.imagePalette}</div>
              <div className="card-publication-share__palettes">{(Object.keys(instagramPalettes) as InstagramPalette[]).map((item) => <button key={item} type="button" aria-pressed={palette === item} onClick={() => { if (palette !== item) { setInstagramFile(null); setPalette(item); } }}><span className="card-publication-share__swatch" style={{ background: `linear-gradient(135deg, ${instagramPalettes[item].background} 50%, ${instagramPalettes[item].accent} 50%)` }} /><span>{paletteNames[language][item]}</span></button>)}</div>
              <div className="card-publication-share__option-label">{typographyLabel[language]}</div>
              <div className="card-publication-share__fonts">{(Object.keys(instagramFonts) as InstagramFont[]).map((item) => <button key={item} type="button" aria-pressed={font === item} onClick={() => { if (font !== item) { setInstagramFile(null); setFont(item); } }} style={{ fontFamily: `"${instagramFonts[item].family}", ${instagramFonts[item].fallback}`, fontWeight: instagramFonts[item].weight }}>{instagramFonts[item].label}</button>)}</div>
              <button className="button button--primary card-publication-share__image-action" type="button" disabled={!instagramFile} onClick={() => void shareInstagram()}><AppIcon name="download" />{language === "pt" ? "Baixar imagem" : language === "es" ? "Descargar imagen" : language === "de" ? "Bild herunterladen" : language === "fr" ? "Télécharger l’image" : language === "it" ? "Scarica immagine" : "Download image"} · {instagramFormats[format].width} × {instagramFormats[format].height}</button>
            </div>
            <div className="card-publication-share__preview"><div className="card-publication-share__preview-frame" role="img" aria-label={t.imageOptions} style={{ aspectRatio: `${instagramFormats[format].width} / ${instagramFormats[format].height}`, backgroundImage: previewUrl ? `url("${previewUrl}")` : undefined }}>{!previewUrl && <span>{t.instagramPreparing}</span>}</div></div>
          </div>
        </section>}
      </div>
      <p className="card-publication-share__feedback" role="status">{copyStatus}</p>
    </dialog></>;
}
