import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { feedbackAgeBands, feedbackComparisons, feedbackDifficulties, feedbackDigitalAutonomy, feedbackDigitalFamiliarity, feedbackRatings, feedbackResidences } from "@/lib/feedback-questions";

export type FeedbackExportResponse = { answers: Record<string, string> };
type Options = readonly (readonly [string, string])[];

const categories: { key: string; title: string; options: Options }[] = [
  { key: "difficulty", title: "Etapa de maior dificuldade", options: feedbackDifficulties },
  { key: "age_band", title: "Faixa etária", options: feedbackAgeBands },
  { key: "residence", title: "Local de residência", options: feedbackResidences },
  { key: "digital_familiarity", title: "Uso de serviços digitais da universidade", options: feedbackDigitalFamiliarity },
  { key: "digital_autonomy", title: "Ajuda para realizar etapas online", options: feedbackDigitalAutonomy },
  { key: "prior_email", title: "Solicitação anterior por e-mail", options: [["yes", "Sim"], ["no", "Não"], ["unsure", "Não tem certeza"]] },
  { key: "comparison", title: "Pronto! em comparação com e-mail", options: feedbackComparisons },
];

function label(options: Options, value?: string) {
  return options.find(([key]) => key === value)?.[1] ?? "";
}

function csvCell(value: string) {
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function createFeedbackCsv(responses: FeedbackExportResponse[]) {
  const headers = [
    ...feedbackRatings.map((item) => item.question),
    ...categories.map((item) => item.title),
    "O que ficou melhor ou pior?", "O que deveríamos melhorar primeiro?",
  ];
  const rows = responses.map(({ answers }) => [
    ...feedbackRatings.map((item) => answers[item.key] === "na" ? "Não se aplica" : answers[item.key] ?? ""),
    ...categories.map((item) => label(item.options, answers[item.key])),
    answers.comparison_note ?? "", answers.improvement ?? "",
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map((value) => csvCell(String(value))).join(";")).join("\r\n")}\r\n`;
}

export function createFeedbackAggregateCsv(report: Record<string, Record<string, number>>, invited: number, responded: number) {
  const rows: string[][] = [
    ["Indicador", "Valor", "Quantidade"],
    ["Convites", "Total", String(invited)],
    ["Respostas", "Total", String(responded)],
  ];
  for (const item of feedbackRatings) {
    for (const [value, count] of Object.entries(report[item.key] ?? {})) {
      rows.push([item.question, value === "na" ? "Não se aplica" : value, String(count)]);
    }
  }
  for (const category of categories) {
    for (const [value, count] of Object.entries(report[category.key] ?? {})) {
      rows.push([category.title, label(category.options, value) || value, String(count)]);
    }
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

const pageSize: [number, number] = [595.28, 841.89];
const ink = rgb(0.1, 0.16, 0.22);
const muted = rgb(0.38, 0.43, 0.48);
const brand = rgb(0.04, 0.36, 0.39);
const blue = rgb(0.16, 0.42, 0.7);
const track = rgb(0.9, 0.93, 0.94);

function wrap(font: PDFFont, text: string, maxWidth: number, size: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").flatMap((word) => {
    if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
    const parts: string[] = [];
    let part = "";
    for (const character of word) {
      if (part && font.widthOfTextAtSize(part + character, size) > maxWidth) { parts.push(part); part = character; }
      else part += character;
    }
    if (part) parts.push(part);
    return parts;
  });
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

export async function createFeedbackPdf(responses: FeedbackExportResponse[], invitedCount: number) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await readFile(join(process.cwd(), "src", "assets", "Geist-Regular.ttf"));
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const pages: PDFPage[] = [];
  let page = pdf.addPage(pageSize);
  pages.push(page);
  let y = 752;

  function newPage() {
    page = pdf.addPage(pageSize);
    pages.push(page);
    y = 752;
  }
  function ensure(height: number) {
    if (y - height < 76) newPage();
  }
  function heading(text: string) {
    ensure(46);
    page.drawText(text, { x: 48, y, size: 15, font, color: ink });
    y -= 30;
  }
  function paragraph(text: string, color = muted) {
    const lines = wrap(font, text, 490, 9.5);
    ensure(lines.length * 15 + 10);
    for (const line of lines) { page.drawText(line, { x: 48, y, size: 9.5, font, color }); y -= 15; }
    y -= 10;
  }
  function bar(labelText: string, count: number, maximum: number, valueText: string, color = brand) {
    const lines = wrap(font, labelText, 455, 9);
    ensure(lines.length * 12 + 30);
    for (const line of lines) { page.drawText(line, { x: 48, y, size: 9, font, color: ink }); y -= 12; }
    y -= 5;
    page.drawRectangle({ x: 48, y, width: 443, height: 9, color: track });
    if (count > 0) page.drawRectangle({ x: 48, y, width: 443 * Math.min(1, count / maximum), height: 9, color });
    page.drawText(valueText, { x: 502, y: y - 1, size: 8.5, font, color: ink });
    y -= 25;
  }

  heading("Pesquisa de experiência do Pronto!");
  paragraph(`Relatório consolidado de ${responses.length} respostas entre ${invitedCount} convites. Gerado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}. As respostas não possuem nome, matrícula nem vínculo com protocolo.`);
  heading("Avaliação das etapas");
  paragraph("Médias das notas de 1 a 5. Respostas 'Não se aplica' não entram na média.");
  for (const item of feedbackRatings) {
    const values = responses.map(({ answers }) => Number(answers[item.key])).filter((value) => value >= 1 && value <= 5);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    bar(item.question, average, 5, values.length ? `${average.toFixed(1).replace(".", ",")}/5` : "N/A", blue);
  }

  const overall = feedbackRatings.find((item) => item.key === "overall");
  if (overall) {
    heading("Distribuição da avaliação geral");
    for (let score = 1; score <= 5; score++) {
      const count = responses.filter(({ answers }) => answers.overall === String(score)).length;
      bar(`${score} de 5`, count, responses.length, `${count} (${Math.round(count / responses.length * 100)}%)`);
    }
  }

  for (const category of categories) {
    const applicable = responses.filter(({ answers }) => Boolean(answers[category.key]));
    heading(category.title);
    paragraph(`${applicable.length} resposta${applicable.length === 1 ? "" : "s"} aplicável${applicable.length === 1 ? "" : "eis"}.`);
    for (const [key, text] of category.options) {
      const count = applicable.filter(({ answers }) => answers[category.key] === key).length;
      bar(text, count, Math.max(1, applicable.length), `${count} (${applicable.length ? Math.round(count / applicable.length * 100) : 0}%)`);
    }
  }

  const comments = [
    { title: "Comentários sobre a comparação com e-mail", key: "comparison_note" },
    { title: "Sugestões de melhoria", key: "improvement" },
  ];
  for (const group of comments) {
    const texts = responses.map(({ answers }) => answers[group.key]?.trim()).filter((value): value is string => Boolean(value));
    heading(group.title);
    if (!texts.length) paragraph("Não houve comentários nesta questão.");
    for (const value of texts) {
      const lines = wrap(font, value, 480, 9.5);
      ensure(lines.length * 15 + 18);
      for (const line of lines) { page.drawText(line, { x: 48, y, size: 9.5, font, color: ink }); y -= 15; }
      y -= 14;
    }
  }

  pages.forEach((current, index) => {
    current.drawRectangle({ x: 0, y: 790, width: pageSize[0], height: 52, color: brand });
    current.drawText("BIB/FAUFBA  /  PRONTO!", { x: 48, y: 810, size: 11, font, color: rgb(1, 1, 1) });
    current.drawLine({ start: { x: 48, y: 59 }, end: { x: 547, y: 59 }, thickness: 0.6, color: track });
    current.drawText(`Pesquisa de experiência · ${responses.length} respostas anônimas`, { x: 48, y: 42, size: 8, font, color: muted });
    current.drawText(`${index + 1} / ${pages.length}`, { x: 513, y: 42, size: 8, font, color: muted });
  });
  return pdf.save();
}

export async function createFeedbackAggregatePdf(report: Record<string, Record<string, number>>, invited: number, responded: number) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await readFile(join(process.cwd(), "src", "assets", "Geist-Regular.ttf"));
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const pages: PDFPage[] = [];
  let page = pdf.addPage(pageSize);
  pages.push(page);
  let y = 752;
  const nextPage = () => { page = pdf.addPage(pageSize); pages.push(page); y = 752; };
  const ensure = (height: number) => { if (y - height < 76) nextPage(); };
  const heading = (title: string) => { ensure(40); page.drawText(title, { x: 48, y, size: 15, font, color: ink }); y -= 30; };
  const paragraph = (value: string) => {
    const lines = wrap(font, value, 490, 9.5);
    ensure(lines.length * 15 + 10);
    for (const line of lines) { page.drawText(line, { x: 48, y, size: 9.5, font, color: muted }); y -= 15; }
    y -= 10;
  };
  const row = (labelText: string, value: string) => {
    const lines = wrap(font, labelText, 390, 9);
    ensure(lines.length * 13 + 10);
    for (const line of lines) { page.drawText(line, { x: 48, y, size: 9, font, color: ink }); y -= 13; }
    page.drawText(value, { x: 470, y: y + 13, size: 9, font, color: brand });
    y -= 10;
  };

  heading("Pesquisa de experiência do Pronto!");
  paragraph(`Resultados agregados de ${responded} respostas entre ${invited} convites (${invited ? Math.round(responded / invited * 100) : 0}% de resposta). Gerado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}. As respostas individuais e os comentários já foram eliminados.`);
  heading("Avaliação das etapas");
  paragraph("Médias das notas de 1 a 5. Respostas 'Não se aplica' não entram na média.");
  for (const item of feedbackRatings) {
    const counts = report[item.key] ?? {};
    const scored = Object.entries(counts).filter(([value]) => /^[1-5]$/.test(value));
    const total = scored.reduce((sum, [, count]) => sum + count, 0);
    const average = total ? scored.reduce((sum, [value, count]) => sum + Number(value) * count, 0) / total : 0;
    row(item.question, total ? `${average.toFixed(1).replace(".", ",")}/5` : "N/A");
  }
  heading("Distribuição da avaliação geral");
  for (let score = 1; score <= 5; score++) {
    const count = report.overall?.[String(score)] ?? 0;
    row(`${score} de 5`, `${count} (${responded ? Math.round(count / responded * 100) : 0}%)`);
  }
  for (const category of categories) {
    heading(category.title);
    for (const [key, labelText] of category.options) row(labelText, String(report[category.key]?.[key] ?? 0));
  }
  pages.forEach((current, index) => {
    current.drawRectangle({ x: 0, y: 790, width: pageSize[0], height: 52, color: brand });
    current.drawText("BIB/FAUFBA  /  PRONTO!", { x: 48, y: 810, size: 11, font, color: rgb(1, 1, 1) });
    current.drawLine({ start: { x: 48, y: 59 }, end: { x: 547, y: 59 }, thickness: 0.6, color: track });
    current.drawText("Pesquisa de experiência · resultados agregados", { x: 48, y: 42, size: 8, font, color: muted });
    current.drawText(`${index + 1} / ${pages.length}`, { x: 513, y: 42, size: 8, font, color: muted });
  });
  return pdf.save();
}
