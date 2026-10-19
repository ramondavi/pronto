"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { HexColorPicker } from "react-colorful";
import { AppIcon } from "@/components/app-icon";
import { CardPublicationShare } from "@/components/card-publication-share";
import { useInterfaceLanguage } from "@/components/interface-language";
import type { InterfaceLanguage } from "@/lib/interface-language";
import { uiText } from "@/lib/ui-text";
import { formatWorkTitle } from "@/lib/work-title";
import { A4_PAGE, CARD_PUBLIC_LINK_BOUNDS, ISSUANCE_OPACITY, addCardPublicLink, drawCatalogingCard, pdfColor } from "@/domain/cataloging-card/pdf";
import { cardPublicUrl } from "@/domain/cataloging-card/public-link";
import { catalogedWorkFilename, type CatalogingCardSnapshot } from "@/domain/cataloging-card/types";

const shareNote: Record<InterfaceLanguage, string> = {
  pt: "Compartilhe o registro público do trabalho. O arquivo ficará acessível nessa página após sua publicação no RI/UFBA.",
  en: "Share the public record of the work. The file will become accessible there after publication in RI/UFBA.",
  es: "Comparta el registro público del trabajo. El archivo estará disponible allí tras su publicación en el RI/UFBA.",
  de: "Teilen Sie den öffentlichen Eintrag der Arbeit. Die Datei wird dort nach der Veröffentlichung im RI/UFBA zugänglich.",
  fr: "Partagez la notice publique du travail. Le fichier y sera accessible après sa publication dans le RI/UFBA.",
  it: "Condividi il record pubblico del lavoro. Il file sarà accessibile lì dopo la pubblicazione nel RI/UFBA.",
};

export function BrowserPdfDelivery({ snapshot, publicToken }: { snapshot: CatalogingCardSnapshot; publicToken?: string | null }) {
  const { language } = useInterfaceLanguage();
  const t = (value: string) => uiText(language, value);
  const workInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const selectionId = useRef(0);
  const [workFile, setWorkFile] = useState<File | null>(null);
  const [workPageCount, setWorkPageCount] = useState<number | null>(null);
  const [workFileError, setWorkFileError] = useState("");
  const [checkingWork, setCheckingWork] = useState(false);
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [fontChoice, setFontChoice] = useState<"standard" | "custom" | null>(null);
  const [backgroundChoice, setBackgroundChoice] = useState<"standard" | "custom" | null>(null);
  const [textChoice, setTextChoice] = useState<"standard" | "custom" | null>(null);
  const [backgroundValue, setBackgroundValue] = useState("#FFFFFF");
  const [textValue, setTextValue] = useState("#000000");
  const [backgroundEdited, setBackgroundEdited] = useState(false);
  const [textEdited, setTextEdited] = useState(false);
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [textPickerOpen, setTextPickerOpen] = useState(false);
  const [titlePage, setTitlePage] = useState("1");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(1);
  const [unlockedStep, setUnlockedStep] = useState(1);
  const firstAuthor = snapshot.people.filter((person) => person.role === "author").sort((first, second) => (first.position ?? 0) - (second.position ?? 0))[0];
  const shareUrl = publicToken ? cardPublicUrl(publicToken) : null;
  const titlePageNumber = Number(titlePage);
  const titlePageReady = /^\d+$/.test(titlePage) && Number.isInteger(titlePageNumber) && titlePageNumber > 0 && workPageCount !== null && titlePageNumber <= workPageCount;
  const workReady = Boolean(workFile && confirmed && workPageCount !== null && !checkingWork);
  const background = backgroundChoice === "custom" ? normalizeColor(backgroundValue) : "#FFFFFF";
  const textColor = textChoice === "custom" ? normalizeColor(textValue) : "#000000";
  const colorsReadable = Boolean(background && textColor && hasReadableContrast(background, textColor));
  const colorSuggestions = background && textColor && !colorsReadable ? suggestContrastingColors(background, textColor) : [];
  const appearanceReady = Boolean(fontChoice && (fontChoice === "standard" || fontFile) && backgroundChoice && textChoice && (backgroundChoice === "standard" || backgroundEdited) && (textChoice === "standard" || textEdited) && colorsReadable);
  function advance(to: number) { setUnlockedStep((current) => Math.max(current, to)); setActiveStep(to); }
  useEffect(() => { if (appearanceReady && !backgroundPickerOpen && !textPickerOpen && unlockedStep === 3) advance(4); }, [appearanceReady, backgroundPickerOpen, textPickerOpen, unlockedStep]);

  async function selectWorkFile(file: File | null) {
    const currentSelection = ++selectionId.current;
    setWorkFile(file);
    setWorkPageCount(null);
    setWorkFileError("");
    setConfirmed(false);
    setError("");
    setUnlockedStep(1);
    if (!file) { setCheckingWork(false); return; }
    setCheckingWork(true);
    try {
      if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error(t("Escolha o PDF completo do trabalho."));
      const document = await PDFDocument.load(await file.arrayBuffer());
      if (selectionId.current === currentSelection) setWorkPageCount(document.getPageCount());
    } catch {
      if (selectionId.current === currentSelection) setWorkFileError(t("Não foi possível ler este PDF. Escolha o arquivo completo do trabalho em formato PDF."));
    } finally {
      if (selectionId.current === currentSelection) setCheckingWork(false);
    }
  }

  async function generate(merge: boolean) {
    if (!appearanceReady || (merge && (unlockedStep < 4 || !workReady || !titlePageReady))) return;
    setBusy(true);
    setError("");
    try {
      const cardDocument = await PDFDocument.create();
      cardDocument.registerFontkit(fontkit);
      const regular = fontFile ? await cardDocument.embedFont(await fontFile.arrayBuffer(), { subset: true }) : await cardDocument.embedFont(StandardFonts.Helvetica);
      const bold = fontFile ? regular : await cardDocument.embedFont(StandardFonts.HelveticaBold);
      const publicUrl = publicToken ? cardPublicUrl(publicToken) : undefined;
      const publicEmblem = publicUrl ? await embedMonochromeCrest(cardDocument, textColor!) : undefined;
      drawCatalogingCard(cardDocument.addPage(A4_PAGE), snapshot, { regular, bold }, {}, { background: backgroundChoice === "custom" ? background! : undefined, text: textChoice === "custom" ? textColor! : undefined, publicUrl, publicEmblem });
      const cardBytes = await cardDocument.save();
      if (merge) {
        const document = await loadWork();
        const pages = document.getPageCount();
        if (!titlePageReady || titlePageNumber > pages) throw new Error(uiText(language, "O PDF selecionado tem {count} {unit}. Indique uma página desse arquivo ou escolha o PDF completo do trabalho.", { count: pages, unit: t(pages === 1 ? "página" : "páginas") }));
        const titlePageSize = document.getPage(titlePageNumber - 1).getSize();
        const rotation = document.getPage(titlePageNumber - 1).getRotation().angle;
        const quarterTurn = ((rotation % 180) + 180) % 180 === 90;
        const width = quarterTurn ? titlePageSize.height : titlePageSize.width;
        const height = quarterTurn ? titlePageSize.width : titlePageSize.height;
        const page = document.insertPage(titlePageNumber, [width, height]);
        if (backgroundChoice === "custom") page.drawRectangle({ x: 0, y: 0, width, height, color: pdfColor(background!) });
        const [card] = await document.embedPdf(cardBytes);
        const scale = Math.min(width / A4_PAGE[0], height / A4_PAGE[1]);
        const cardWidth = A4_PAGE[0] * scale;
        const cardHeight = A4_PAGE[1] * scale;
        page.drawPage(card, { x: (width - cardWidth) / 2, y: (height - cardHeight) / 2, width: cardWidth, height: cardHeight });
        if (publicUrl) addCardPublicLink(page, publicUrl, { x: (width - cardWidth) / 2 + CARD_PUBLIC_LINK_BOUNDS.x * scale, y: (height - cardHeight) / 2 + CARD_PUBLIC_LINK_BOUNDS.y * scale, width: CARD_PUBLIC_LINK_BOUNDS.width * scale, height: CARD_PUBLIC_LINK_BOUNDS.height * scale });
        download(await document.save(), catalogedWorkFilename(snapshot));
      } else download(cardBytes, `ficha-${snapshot.request.protocol}.pdf`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Não foi possível processar o PDF selecionado."));
    } finally { setBusy(false); }
  }

  async function loadWork() {
    if (!workFile) throw new Error(t("Selecione o PDF completo do trabalho."));
    if (!workFile.name.toLowerCase().endsWith(".pdf")) throw new Error(t("O trabalho precisa ser um arquivo PDF."));
    return PDFDocument.load(await workFile.arrayBuffer());
  }

  return <section className="panel browser-pdf-delivery" aria-labelledby="delivery-title">
    <header className="browser-pdf-delivery__header"><span className="browser-pdf-delivery__icon"><AppIcon name="document" /></span><div><p className="eyebrow">{t("Geração do PDF")}</p><h2 id="delivery-title">{t("Prepare o trabalho com a ficha")}</h2><p>{t("Escolha o PDF aprovado pela biblioteca. A ficha será inserida após a folha de rosto, em uma página do mesmo tamanho e orientação.")}</p></div></header>
    <div className={`browser-pdf-delivery__step${activeStep === 1 ? " is-active" : ""}${unlockedStep > 1 ? " is-complete" : ""}`}><button className="browser-pdf-delivery__step-heading" type="button" aria-expanded={activeStep === 1} aria-controls="delivery-step-work" onClick={() => setActiveStep(1)}><span className="browser-pdf-delivery__number">{unlockedStep > 1 ? <AppIcon name="check" /> : "1"}</span><span><strong>{t("Selecione o trabalho")}</strong><small>{unlockedStep > 1 ? workFile?.name : t("PDF final analisado pela biblioteca")}</small></span></button>{activeStep === 1 && <div id="delivery-step-work" className="browser-pdf-delivery__step-body"><p>{t("Use a versão final analisada pela biblioteca, com folha de aprovação.")}</p>
      <input ref={workInput} className="browser-pdf-delivery__file-input" type="file" accept="application/pdf,.pdf" aria-label={t("Selecionar PDF completo do trabalho")} onChange={(event) => void selectWorkFile(event.target.files?.[0] ?? null)} />
      <div className="nada-consta-picker browser-pdf-delivery__picker"><button className="browser-pdf-delivery__picker-surface" type="button" disabled={busy} aria-label={t(workFile ? "Trocar PDF" : "Escolher PDF")} onClick={() => workInput.current?.click()} /><AppIcon name={workFile ? "document" : "upload"} /><div><strong>{workFile?.name ?? t("Nenhum PDF selecionado")}</strong><span>{workFile ? `${formatBytes(workFile.size)}${workPageCount !== null ? ` · ${workPageCount} ${t(workPageCount === 1 ? "página" : "páginas")}` : checkingWork ? ` · ${t("Lendo páginas…")}` : ""}` : t("PDF completo da versão final")}</span></div><div className="nada-consta-picker__actions"><button className="button button--secondary button--small" type="button" disabled={busy} onClick={() => workInput.current?.click()}>{t(workFile ? "Trocar PDF" : "Escolher PDF")}</button>{workFile && <button className="button button--secondary button--small button--with-icon" type="button" disabled={busy} onClick={() => { void selectWorkFile(null); if (workInput.current) workInput.current.value = ""; }}><AppIcon name="close" />{t("Remover")}</button>}</div></div>
      {workFileError && <p className="form-error" role="alert">{workFileError}</p>}
      <label className="check browser-pdf-delivery__confirm"><input type="checkbox" disabled={!workFile || workPageCount === null || checkingWork} checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); if (event.target.checked && workFile) advance(2); else setUnlockedStep(1); }} /> {t("Confirmo que é o mesmo arquivo analisado pela biblioteca, finalizado e com folha de aprovação.")}</label>
    </div>}</div>
    <div className={`browser-pdf-delivery__step${activeStep === 2 ? " is-active" : ""}${unlockedStep > 2 ? " is-complete" : ""}`}><button className="browser-pdf-delivery__step-heading" type="button" disabled={unlockedStep < 2} aria-expanded={activeStep === 2} aria-controls="delivery-step-page" onClick={() => setActiveStep(2)}><span className="browser-pdf-delivery__number">{unlockedStep > 2 ? <AppIcon name="check" /> : "2"}</span><span><strong>{t("Indique a folha de rosto")}</strong><small>{unlockedStep > 2 ? uiText(language, "Página {page}", { page: titlePage }) : t("Disponível após selecionar o trabalho")}</small></span></button>{activeStep === 2 && <div id="delivery-step-page" className="browser-pdf-delivery__step-body"><div className="browser-pdf-delivery__page-card"><span className="browser-pdf-delivery__page-icon"><AppIcon name="document" /></span><div className="browser-pdf-delivery__page-content"><label htmlFor="delivery-title-page">{t("Em qual página está a folha de rosto?")}</label><p id="delivery-page-hint">{uiText(language, "O PDF escolhido tem {count} {unit}. A ficha será inserida logo após a página indicada.", { count: workPageCount ?? 0, unit: t(workPageCount === 1 ? "página" : "páginas") })}</p><div className="browser-pdf-delivery__page-controls"><input id="delivery-title-page" type="number" min={1} max={workPageCount ?? undefined} step={1} inputMode="numeric" aria-describedby="delivery-page-hint" aria-invalid={!titlePageReady} value={titlePage} onChange={(event) => { setTitlePage(event.target.value); setUnlockedStep(2); }} onKeyDown={(event) => { if (event.key === "Enter" && titlePageReady) { event.preventDefault(); advance(3); } }} /><button className="button button--primary button--small button--with-icon browser-pdf-delivery__page-confirm" type="button" disabled={!titlePageReady} onClick={() => advance(3)}><AppIcon name="check" />{t("Confirmar")}</button></div>{!titlePageReady && <p className="browser-pdf-delivery__page-error" role="alert">{workPageCount !== null && titlePageNumber > workPageCount ? uiText(language, "A página {page} não existe no PDF escolhido. Se a folha de rosto vem depois, selecione o PDF completo do trabalho.", { page: titlePage }) : t("Informe um número de página válido deste PDF.")}</p>}</div></div></div>}</div>
    <div className={`browser-pdf-delivery__step${activeStep === 3 ? " is-active" : ""}${unlockedStep > 3 ? " is-complete" : ""}`}>
      <button className="browser-pdf-delivery__step-heading" type="button" disabled={unlockedStep < 3} aria-expanded={activeStep === 3} aria-controls="delivery-step-appearance" onClick={() => setActiveStep(3)}><span className="browser-pdf-delivery__number">{unlockedStep > 3 ? <AppIcon name="check" /> : "3"}</span><span><strong>{t("Personalize a aparência da ficha")}</strong>{activeStep !== 3 && <small>{unlockedStep > 3 ? `${fontChoice === "custom" ? fontFile?.name : t("Fonte padrão")} · ${backgroundChoice === "custom" || textChoice === "custom" ? t("Cores escolhidas") : t("Cores padrão")}` : t("Escolhas obrigatórias · disponível após indicar a folha de rosto")}</small>}</span></button>
      {activeStep === 3 && <div id="delivery-step-appearance" className="browser-pdf-delivery__step-body">
        <div className="browser-pdf-delivery__appearance-group"><h3>{t("Fonte tipográfica")}</h3><p>{t("Escolha a fonte padrão ou envie a mesma fonte usada no trabalho para manter a tipografia.")}</p><div className="browser-pdf-delivery__font-options"><button type="button" className={`browser-pdf-delivery__font-option${fontChoice === "standard" ? " is-selected" : ""}`} aria-pressed={fontChoice === "standard"} onClick={() => { setFontChoice("standard"); setFontFile(null); }}><AppIcon name="document" /><span><strong>{t("Manter a fonte padrão")}</strong><small>{t("O Pronto! usa a fonte padrão da ficha. Nenhum arquivo é necessário.")}</small></span><AppIcon className="browser-pdf-delivery__font-check" name="check" /></button><button type="button" className={`browser-pdf-delivery__font-option${fontChoice === "custom" ? " is-selected" : ""}`} aria-pressed={fontChoice === "custom"} onClick={() => fontInput.current?.click()}><AppIcon name="upload" /><span><strong>{t("Usar fonte personalizada")}</strong><small>{t("Envie um arquivo TTF ou OTF da fonte do trabalho.")}</small>{fontChoice === "custom" && fontFile && <em className="browser-pdf-delivery__font-filename" title={fontFile.name}><AppIcon name="document" /><span>{fontFile.name}</span></em>}</span><AppIcon className="browser-pdf-delivery__font-check" name="check" /></button></div><input ref={fontInput} className="browser-pdf-delivery__file-input" type="file" accept=".ttf,.otf,font/ttf,font/otf" aria-label={t("Selecionar fonte TTF ou OTF")} onChange={(event) => { const file = event.target.files?.[0] ?? null; if (!file) return; setFontFile(file); setFontChoice("custom"); }} /></div>
        <ColorChoice title="Cor do fundo da página" choice={backgroundChoice} value={backgroundValue} standard="#FFFFFF" presets={["#FFFFFF", "#F8F6F0", "#F2F5F7", "#FFF8E8", "#EAF2EF", "#F5ECF2", "#E9EEF8", "#F3EDE4"]} onChoice={setBackgroundChoice} onValue={(color) => { setBackgroundValue(color); setBackgroundEdited(true); }} pickerOpen={backgroundPickerOpen} onPickerOpenChange={setBackgroundPickerOpen} />
        <ColorChoice title="Cor do texto, das linhas e do QR Code" choice={textChoice} value={textValue} standard="#000000" presets={["#000000", "#26354A", "#143C37", "#4A304A", "#4A3326", "#313C58", "#5A2E35", "#33423A"]} onChoice={setTextChoice} onValue={(color) => { setTextValue(color); setTextEdited(true); }} pickerOpen={textPickerOpen} onPickerOpenChange={setTextPickerOpen} />
        {backgroundChoice && textChoice && background && textColor && !colorsReadable && <div className="browser-pdf-delivery__contrast-help" role="alert"><p><strong>{t("As cores escolhidas dificultam a leitura da ficha, do QR ou da indicação de emissão.")}</strong> {t("O QR sem fundo precisa de cor escura sobre fundo claro. Escolha outra combinação para gerar o PDF.")}</p><span>{t("Sugestões próximas das cores que você escolheu:")}</span><div className="browser-pdf-delivery__contrast-suggestions">{colorSuggestions.map((suggestion, index) => <button key={`${suggestion.background}-${suggestion.text}`} type="button" onClick={() => { setBackgroundChoice("custom"); setTextChoice("custom"); setBackgroundValue(suggestion.background); setTextValue(suggestion.text); setBackgroundEdited(true); setTextEdited(true); setBackgroundPickerOpen(false); setTextPickerOpen(false); }}><span className="browser-pdf-delivery__contrast-colors" aria-hidden="true"><span style={{ backgroundColor: suggestion.background }} /><span style={{ backgroundColor: suggestion.text }} /></span><span><strong>{t("Opção")} {index + 1}</strong><small>{suggestion.changed === "text" ? t("Texto ajustado") : suggestion.changed === "background" ? t("Fundo ajustado") : t("Fundo e texto ajustados")}</small></span></button>)}</div></div>}
        <p className="browser-pdf-delivery__appearance-hint">{t("Quando as três escolhas estiverem prontas, a próxima etapa abrirá automaticamente. As cores afetam somente o PDF gerado no seu navegador.")}</p>
      </div>}
    </div>
    <div className={`browser-pdf-delivery__step browser-pdf-delivery__step--final${activeStep === 4 ? " is-active" : ""}`}><button className="browser-pdf-delivery__step-heading" type="button" disabled={unlockedStep < 4} aria-expanded={activeStep === 4} aria-controls="delivery-step-finish" onClick={() => setActiveStep(4)}><span className="browser-pdf-delivery__number">4</span><span><strong>{t("Gere o trabalho com a ficha")}</strong><small>{unlockedStep < 4 ? t("Disponível após concluir os passos anteriores") : t("Pronto para baixar")}</small></span></button>{activeStep === 4 && <div id="delivery-step-finish" className="browser-pdf-delivery__finish"><div className="browser-pdf-delivery__privacy"><AppIcon name="lock" /><span>{t("Os arquivos são processados somente neste navegador; não são enviados ao Pronto!.")}</span></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button--primary button--with-icon browser-pdf-delivery__generate" type="button" disabled={unlockedStep < 4 || !workReady || !titlePageReady || busy} onClick={() => void generate(true)}><AppIcon name="document" />{t(busy ? "Preparando PDF…" : "Gerar e baixar trabalho com ficha")}</button><button className="link-button" type="button" disabled={busy} onClick={() => void generate(false)}>{t("Baixar somente a ficha")}</button>{shareUrl && <div className="browser-pdf-delivery__share"><p>{shareNote[language]}</p><CardPublicationShare placement="student" publicUrl={shareUrl} language={language} title={formatWorkTitle(snapshot.request.title, snapshot.request.subtitle)} imageTitle={snapshot.request.title} subtitle={snapshot.request.subtitle} author={firstAuthor?.transcribedName} authorEntry={firstAuthor?.authorizedName.includes(",") ? firstAuthor.authorizedName.split(",")[0] : null} depositYear={snapshot.request.depositYear?.toString()} workNature={snapshot.request.workNature} programName={snapshot.request.programName} /></div>}</div>}</div>
  </section>;
}

export function BrowserPdfDeliveryFollowup({ repositoryDepositEnabled, href = "/painel/autodeposito" }: { repositoryDepositEnabled: boolean; href?: string }) {
  const { language } = useInterfaceLanguage();
  const t = (value: string) => uiText(language, value);
  if (!repositoryDepositEnabled) return null;
  return <section className="panel browser-pdf-delivery__followup" aria-labelledby="delivery-next-title"><div className="browser-pdf-delivery__next"><span className="browser-pdf-delivery__next-icon"><AppIcon name="upload" /></span><div><p className="eyebrow">{t("Próxima etapa do estudante")}</p><h2 id="delivery-next-title">{t("Faça o autodepósito no RI/UFBA")}</h2><p>{t("Depois de baixar e conferir o trabalho com a ficha, deposite o PDF no Repositório Institucional. A biblioteca poderá encerrar o protocolo após verificar a publicação.")}</p><Link className="button button--secondary button--with-icon" href={href}><AppIcon name="arrowRight" />{t("Abrir guia de autodepósito")}</Link></div></div><p className="browser-pdf-delivery__pdfa"><strong>{t("Sobre PDF/A:")}</strong> {t("Este navegador gera um PDF comum, sem certificação PDF/A. Confira ou converta o arquivo final conforme a exigência do repositório.")}</p></section>;
}

function ColorChoice({ title, choice, value, standard, presets, onChoice, onValue, pickerOpen, onPickerOpenChange }: { title: string; choice: "standard" | "custom" | null; value: string; standard: string; presets: string[]; onChoice: (value: "standard" | "custom") => void; onValue: (value: string) => void; pickerOpen: boolean; onPickerOpenChange: (value: boolean) => void }) {
  const { language } = useInterfaceLanguage();
  const t = (value: string) => uiText(language, value);
  const current = normalizeColor(value);
  const controlsRef = useRef<HTMLDivElement>(null);
  const choiceRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || controlsRef.current?.contains(target) || choiceRef.current?.contains(target)) return;
      onPickerOpenChange(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [pickerOpen, onPickerOpenChange]);
  return <fieldset className="browser-pdf-delivery__appearance-group browser-pdf-delivery__color-group">
    <legend>{t(title)}</legend>
    <div className="browser-pdf-delivery__color-options">
      <button type="button" className={`browser-pdf-delivery__color-option${choice === "standard" ? " is-selected" : ""}`} aria-pressed={choice === "standard"} onClick={() => { onChoice("standard"); onPickerOpenChange(false); }}><span className="browser-pdf-delivery__color-chip" style={{ backgroundColor: standard }} /><span><strong>{t("Manter a cor padrão")}</strong><small>{t(standard === "#FFFFFF" ? "Página branca" : "Texto, linhas e QR Code pretos")}</small></span><AppIcon name="check" /></button>
      <button ref={choiceRef} type="button" className={`browser-pdf-delivery__color-option${choice === "custom" ? " is-selected" : ""}`} aria-pressed={choice === "custom"} aria-expanded={choice === "custom" && pickerOpen} onClick={() => { onChoice("custom"); onPickerOpenChange(choice === "custom" ? !pickerOpen : true); }}><span className="browser-pdf-delivery__color-chip" style={{ backgroundColor: current ?? standard }} /><span><strong>{t("Escolher outra cor")}</strong><small>{t("Paleta visual ou código HEX/RGB")}</small></span><AppIcon name="check" /></button>
    </div>
    {choice === "custom" && pickerOpen && <div ref={controlsRef} className="browser-pdf-delivery__color-controls">
      <button className="browser-pdf-delivery__picker-close" type="button" aria-label={`${t("Fechar seletor de")} ${t(title).toLowerCase()}`} onClick={() => onPickerOpenChange(false)}><AppIcon name="close" /></button>
      <div className="browser-pdf-delivery__swatches" aria-label={`${t("Cores sugeridas para")} ${t(title).toLowerCase()}`}>{presets.map((color) => <button key={color} type="button" title={color} aria-label={`${t("Usar cor")} ${color}`} aria-pressed={current === color} style={{ backgroundColor: color }} onClick={() => onValue(color)} />)}</div>
      <div className="browser-pdf-delivery__visual-picker"><HexColorPicker color={current ?? standard} onChange={(color) => onValue(color.toUpperCase())} /></div>
      <label className="browser-pdf-delivery__color-code">{t("Código HEX ou RGB")}<input type="text" spellCheck={false} value={value} aria-invalid={!current} onChange={(event) => onValue(event.target.value)} placeholder="#26354A ou rgb(38, 53, 74)" /></label>
      {current && <output className="browser-pdf-delivery__rgb-code">RGB: {formatRgb(current)}</output>}
      {!current && <small className="browser-pdf-delivery__color-error">{t("Use #RRGGBB ou rgb(0–255, 0–255, 0–255).")}</small>}
    </div>}
  </fieldset>;
}

function formatRgb(hex: string): string { return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)).join(", "); }

async function embedMonochromeCrest(pdf: PDFDocument, color: string) {
  const image = new Image();
  image.src = "/brasao-ufba.png";
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 147;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar o brasão para o QR Code.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const luminance = .2126 * pixels.data[index] + .7152 * pixels.data[index + 1] + .0722 * pixels.data[index + 2];
    pixels.data[index] = red;
    pixels.data[index + 1] = green;
    pixels.data[index + 2] = blue;
    pixels.data[index + 3] = luminance < 235 ? pixels.data[index + 3] : 0;
  }
  context.putImageData(pixels, 0, 0);
  return pdf.embedPng(canvas.toDataURL("image/png"));
}

function normalizeColor(value: string): string | null {
  const input = value.trim();
  const hex = /^#?([0-9a-f]{6})$/i.exec(input);
  if (hex) return `#${hex[1].toUpperCase()}`;
  const rgbParts = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(input);
  if (!rgbParts) return null;
  const values = rgbParts.slice(1).map(Number);
  if (values.some((part) => part > 255)) return null;
  return `#${values.map((part) => part.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function contrastRatio(first: string, second: string): number {
  const a = luminance(first); const b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

function blendColor(from: string, toward: string, amount: number): string {
  return `#${[1, 3, 5].map((index) => {
    const start = parseInt(from.slice(index, index + 2), 16);
    const end = parseInt(toward.slice(index, index + 2), 16);
    return Math.round(start + (end - start) * amount).toString(16).padStart(2, "0");
  }).join("").toUpperCase()}`;
}

function hasReadableContrast(background: string, textColor: string): boolean {
  const secondaryColor = blendColor(background, textColor, ISSUANCE_OPACITY);
  return luminance(background) > luminance(secondaryColor) && contrastRatio(background, textColor) >= 4.5 && contrastRatio(background, secondaryColor) >= 4.5;
}

function suggestContrastingColors(background: string, textColor: string) {
  type Suggestion = { background: string; text: string; changed: "text" | "background" | "both"; distance: number };
  const candidates: Suggestion[] = [];
  const distance = (first: string, second: string) => Math.sqrt([1, 3, 5].reduce((total, index) => (total + (parseInt(first.slice(index, index + 2), 16) - parseInt(second.slice(index, index + 2), 16)) ** 2), 0));
  for (const changed of ["text", "background"] as const) for (const toward of ["#000000", "#FFFFFF"] as const) {
    const original = changed === "text" ? textColor : background;
    for (let step = 1; step <= 255; step++) {
      const adjusted = blendColor(original, toward, step / 255);
      const candidateBackground = changed === "background" ? adjusted : background;
      const candidateText = changed === "text" ? adjusted : textColor;
      if (!hasReadableContrast(candidateBackground, candidateText)) continue;
      candidates.push({ background: candidateBackground, text: candidateText, changed, distance: distance(original, adjusted) });
      break;
    }
  }
  for (const [candidateBackground, candidateText] of [["#FFFFFF", "#000000"], ["#000000", "#FFFFFF"]] as const) {
    if (!hasReadableContrast(candidateBackground, candidateText)) continue;
    candidates.push({ background: candidateBackground, text: candidateText, changed: "both", distance: distance(background, candidateBackground) + distance(textColor, candidateText) });
  }
  const unique = new Set<string>();
  return candidates.sort((a, b) => a.distance - b.distance).filter((item) => {
    const key = `${item.background}-${item.text}`;
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  }).slice(0, 3);
}

function download(bytes: Uint8Array, name: string) { const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function formatBytes(value: number) { return value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(2)} MB`; }
