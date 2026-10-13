import { PDFHexString, PDFName, PDFString, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import { buildCardContent, prefixBeforeFourthAuthorLetter, type CardPreviewOptions, type CatalogingCardSnapshot } from "./types.ts";

export const A4_PAGE: [number, number] = [595.28, 841.89];
export const ISSUANCE_OPACITY = 0.55;
const CARD_LEFT = 126.25;
const CARD_RIGHT = 497.75;
const BODY_LEFT = 163.1;
const FONT_SIZE = 10;
const LINE_HEIGHT = 12.6;
const PARAGRAPH_GAP = LINE_HEIGHT;

export type CardPdfColors = { background?: string; text?: string; publicUrl?: string; publicEmblem?: PDFImage };
export const CARD_PUBLIC_LINK_BOUNDS = { x: 29, y: 15, width: 56, height: 69 } as const;

export function addCardPublicLink(page: PDFPage, url: string, bounds: { x: number; y: number; width: number; height: number } = CARD_PUBLIC_LINK_BOUNDS) {
  const context = page.doc.context;
  const annotation = context.obj({
    Type: PDFName.of("Annot"),
    Subtype: PDFName.of("Link"),
    Rect: [bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height],
    Border: [0, 0, 0],
    Contents: PDFHexString.fromText("Publicação do trabalho no RI/UFBA"),
    A: context.obj({ Type: PDFName.of("Action"), S: PDFName.of("URI"), URI: PDFString.of(url) }),
  });
  page.node.addAnnot(context.register(annotation));
}

function drawCardQr(page: PDFPage, url: string, ink: RGB, emblem?: PDFImage) {
  const { x, y, width, height } = CARD_PUBLIC_LINK_BOUNDS;
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const size = 50;
  const left = x + (width - size) / 2;
  const bottom = y + height - size;
  const moduleSize = size / (qr.modules.size + 8);
  const emblemWidth = 8.5;
  const emblemHeight = 13;
  const centerX = left + size / 2;
  const centerY = bottom + size / 2;
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      const moduleX = left + (column + 4.5) * moduleSize;
      const moduleY = bottom + size - (row + 4.5) * moduleSize;
      if (emblem && Math.abs(moduleX - centerX) < emblemWidth / 2 + moduleSize && Math.abs(moduleY - centerY) < emblemHeight / 2 + moduleSize) continue;
      if (qr.modules.get(row, column)) page.drawRectangle({
        x: left + (column + 4) * moduleSize,
        y: bottom + size - (row + 5) * moduleSize,
        width: moduleSize,
        height: moduleSize,
        color: ink,
        opacity: ISSUANCE_OPACITY,
      });
    }
  }
  if (emblem) page.drawImage(emblem, { x: centerX - emblemWidth / 2, y: centerY - emblemHeight / 2, width: emblemWidth, height: emblemHeight, opacity: ISSUANCE_OPACITY });
  return { caption: "DISPONÍVEL NO RI/UFBA", qrX: left, qrY: bottom, qrSize: size };
}

export function pdfColor(hex: string): RGB {
  const value = hex.replace("#", "");
  return rgb(parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255);
}

export function drawCatalogingCard(page: PDFPage, snapshot: CatalogingCardSnapshot, fonts: { regular: PDFFont; bold: PDFFont }, options: CardPreviewOptions = {}, colors: CardPdfColors = {}) {
  const { regular, bold } = fonts;
  const ink = pdfColor(colors.text ?? "#000000");
  if (colors.background) page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: pdfColor(colors.background) });
  const content = buildCardContent(snapshot, options);
  const firstFreeNote = content.notes.length - (snapshot.freeNotes ?? []).filter((item) => item.trim()).length;
  const hangingOffset = regular.widthOfTextAtSize(prefixBeforeFourthAuthorLetter(snapshot.people.find((person) => person.role === "author")?.authorizedName ?? ""), FONT_SIZE);
  const hangingHeight = (value: string) => wrap(value, CARD_RIGHT - BODY_LEFT - hangingOffset, CARD_RIGHT - BODY_LEFT, FONT_SIZE, regular).length * LINE_HEIGHT;
  const bodyHeight = wrap(content.authorizedAuthor, CARD_RIGHT - BODY_LEFT, CARD_RIGHT - BODY_LEFT, FONT_SIZE, regular).length * LINE_HEIGHT
    + hangingHeight(content.titleStatement)
    + (content.physicalDescription ? hangingHeight(content.physicalDescription) : 0)
    + (content.academicNote ? PARAGRAPH_GAP + hangingHeight(content.academicNote) : 0)
    + content.notes.reduce((height, note, index) => height + (index === firstFreeNote ? PARAGRAPH_GAP : 0) + hangingHeight(note), 0)
    + PARAGRAPH_GAP + hangingHeight(content.tracings);
  const headerTop = Math.max(397, 96 + PARAGRAPH_GAP + 87.6 + bodyHeight);
  if (headerTop > 750) throw new Error("As notas excedem o espaço disponível na ficha. Reduza ou reúna as notas antes de gerar o PDF.");
  center(page, "Dados Internacionais de Catalogação na Publicação (CIP)", headerTop, FONT_SIZE, bold, ink);
  center(page, snapshot.institution.university, headerTop - 12.6, FONT_SIZE, bold, ink);
  center(page, snapshot.institution.librarySystem, headerTop - 25.2, FONT_SIZE, bold, ink);
  center(page, snapshot.institution.library, headerTop - 37.8, FONT_SIZE, bold, ink);
  page.drawLine({ start: { x: CARD_LEFT, y: headerTop - 52.1 }, end: { x: CARD_RIGHT, y: headerTop - 52.1 }, thickness: 1.4, color: ink });
  page.drawText(snapshot.classification.cutter.trim() || (options.previewPlaceholders ? "[Cutter do autor]" : ""), { x: 127.7, y: headerTop - 75, size: FONT_SIZE, font: regular, color: ink });
  let y = headerTop - 87.6;
  y = drawWrapped(page, content.authorizedAuthor, BODY_LEFT, y, CARD_RIGHT - BODY_LEFT, FONT_SIZE, regular, LINE_HEIGHT, ink);
  y = drawHanging(page, content.titleStatement, y, regular, hangingOffset, ink);
  if (content.physicalDescription) y = drawHanging(page, content.physicalDescription, y, regular, hangingOffset, ink);
  if (content.academicNote) y = drawHanging(page, content.academicNote, y - PARAGRAPH_GAP, regular, hangingOffset, ink);
  for (const [index, note] of content.notes.entries()) y = drawHanging(page, note, index === firstFreeNote ? y - PARAGRAPH_GAP : y, regular, hangingOffset, ink);
  y = drawHanging(page, content.tracings, y - PARAGRAPH_GAP, regular, hangingOffset, ink);
  const cduY = y - PARAGRAPH_GAP;
  const bottomLine = cduY - 16;
  const cduText = `CDU: ${snapshot.classification.cdu.trim() || (options.previewPlaceholders ? "[Código CDU]" : "")}${options.previewPlaceholders && options.cduDescriptionPending && snapshot.classification.cdu.trim() ? " [Descrição pendente]" : ""}`;
  page.drawText(cduText, { x: CARD_RIGHT - regular.widthOfTextAtSize(cduText, FONT_SIZE), y: cduY, size: FONT_SIZE, font: regular, color: ink });
  page.drawLine({ start: { x: CARD_LEFT, y: bottomLine }, end: { x: CARD_RIGHT, y: bottomLine }, thickness: 1.4, color: ink });
  center(page, content.technicalResponsibility, bottomLine - 22, FONT_SIZE, regular, ink);
  const issuance = "Ficha emitida eletronicamente pelo Pronto! e validada por Bibliotecário(a).";
  const issuanceSize = 7;
  const iconWidth = 9;
  const gap = 5;
  const startX = (A4_PAGE[0] - iconWidth - gap - regular.widthOfTextAtSize(issuance, issuanceSize)) / 2;
  const iconY = 25;
  page.drawCircle({ x: startX + 4.5, y: iconY + 5, size: 4.2, borderWidth: 0.65, borderColor: ink, borderOpacity: ISSUANCE_OPACITY });
  page.drawLine({ start: { x: startX + 2.5, y: iconY + 5 }, end: { x: startX + 4, y: iconY + 3.5 }, thickness: 0.75, color: ink, opacity: ISSUANCE_OPACITY });
  page.drawLine({ start: { x: startX + 4, y: iconY + 3.5 }, end: { x: startX + 6.7, y: iconY + 6.5 }, thickness: 0.75, color: ink, opacity: ISSUANCE_OPACITY });
  page.drawText(issuance, { x: startX + iconWidth + gap, y: iconY + 1.5, size: issuanceSize, font: regular, color: ink, opacity: ISSUANCE_OPACITY });
  if (colors.publicUrl) {
    const { caption, qrX, qrY, qrSize } = drawCardQr(page, colors.publicUrl, ink, colors.publicEmblem);
    const size = Math.min(5.5, qrSize / regular.widthOfTextAtSize(caption, 1));
    page.drawText(caption, { x: qrX + (qrSize - regular.widthOfTextAtSize(caption, size)) / 2, y: qrY - 5.5, size, font: regular, color: ink, opacity: ISSUANCE_OPACITY });
    addCardPublicLink(page, colors.publicUrl);
  }
}

function center(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color: RGB) {
  page.drawText(text, { x: (A4_PAGE[0] - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
}

function wrap(text: string, firstWidth: number, continuationWidth: number, size: number, font: PDFFont) {
  const words = text.trim().split(/\s+/); const lines: string[] = []; let line = ""; let width = firstWidth;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; width = continuationWidth; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawHanging(page: PDFPage, text: string, y: number, font: PDFFont, offset: number, color: RGB) {
  const firstLineLeft = BODY_LEFT + offset;
  const lines = wrap(text, CARD_RIGHT - firstLineLeft, CARD_RIGHT - BODY_LEFT, FONT_SIZE, font);
  lines.forEach((line, index) => page.drawText(line, { x: index === 0 ? firstLineLeft : BODY_LEFT, y: y - index * LINE_HEIGHT, size: FONT_SIZE, font, color }));
  return y - lines.length * LINE_HEIGHT;
}

function drawWrapped(page: PDFPage, text: string, x: number, y: number, width: number, size: number, font: PDFFont, lineHeight: number, color: RGB) {
  const lines = wrap(text, width, width, size, font);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}
