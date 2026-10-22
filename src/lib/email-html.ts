import sanitizeHtml from "sanitize-html";

const colors = {
  background: "#f3f3f1",
  surface: "#ffffff",
  text: "#0a0a0a",
  muted: "#626262",
  border: "#cfcfcf",
  institutional: "#1a3b70",
  institutionalSoft: "#edf3fa",
  header: "#dce8f4",
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
const importantPattern = /(\b[A-Z]{2,}\d{4}-\d{4,}\b|\b\d+\s+dias?\s+úteis\b|Atenção!|ficha catalográfica foi homologada|ficha já está disponível no Pronto!|informações que precisam ser corrigidas|protocolo foi encerrado|atendimento foi concluído|Administração → (?:Equipe e acessos|Operação → Contas)|ficha do protocolo|foi homologada|PDF completo do seu trabalho|opção recomendada|atendimento da ficha catalográfica foi concluído|permanente e único|cerca de 3 minutos|Nada Consta)/gi;
const importantTest = /^(?:[A-Z]{2,}\d{4}-\d{4,}|\d+\s+dias?\s+úteis|Atenção!|ficha catalográfica foi homologada|ficha já está disponível no Pronto!|informações que precisam ser corrigidas|protocolo foi encerrado|atendimento foi concluído|Administração → (?:Equipe e acessos|Operação → Contas)|ficha do protocolo|foi homologada|PDF completo do seu trabalho|opção recomendada|atendimento da ficha catalográfica foi concluído|permanente e único|cerca de 3 minutos|Nada Consta)$/i;
const detailLine = /^(Trabalho|Solicitante|Matrícula|Protocolo|Prazo de referência|Previsão da análise|Publicação no RI\/UFBA|Endereço permanente da publicação):\s*(.*)$/i;
const adjustmentLine = /^•\s+([^:]+):\s*(.*)$/;

function importantText(value: string) {
  return value.split(importantPattern).map((part) => importantTest.test(part) ? `<strong style="color:${colors.text};font-weight:700">${escapeHtml(part)}</strong>` : escapeHtml(part)).join("");
}

function linkedText(value: string) {
  return value.split(/(https?:\/\/[^\s<>]+)/g).map((part) => {
    if (!/^https?:\/\//.test(part)) return importantText(part);
    const url = part.replace(/[.,;:!?]+$/, "");
    const trailing = part.slice(url.length);
    return `<a href="${escapeHtml(url)}" style="color:${colors.institutional};font-weight:700;text-decoration:underline;word-break:break-word">${escapeHtml(url)}</a>${escapeHtml(trailing)}`;
  }).join("");
}

function paragraphHtml(value: string): string {
  const cancellation = value.match(/^(.*estas declarações não foram cumpridas:)\s*([\s\S]+)$/);
  if (cancellation) return paragraphHtml(cancellation[1]) + informationBox(linkedText(cancellation[2]));
  const lines = value.split("\n");
  const observationIndex = value.indexOf("\nObservação complementar: ");
  if (value.startsWith("• ") && observationIndex > 0) {
    const main = value.slice(0, observationIndex).match(adjustmentLine);
    const observation = value.slice(observationIndex + "\nObservação complementar: ".length);
    if (main && observation.trim()) return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;padding:12px 16px;border-left:3px solid ${colors.institutional};border-radius:6px;background:${colors.institutionalSoft}"><tr><td style="color:${colors.text};font-size:14px;line-height:1.55"><strong>${escapeHtml(main[1])}:</strong> ${linkedText(main[2])}</td></tr><tr><td style="padding-top:9px;color:${colors.text};font-size:14px;line-height:1.55"><strong>Observação complementar:</strong> ${observation.split("\n").map(linkedText).join("<br>")}</td></tr></table>`;
  }
  const adjustments = lines.map((line) => line.match(adjustmentLine));
  if (adjustments.every(Boolean)) {
    const rows = adjustments.map((match) => {
      const observationIndex = match![2].indexOf(" Observação complementar: ");
      const guidance = observationIndex >= 0 ? match![2].slice(0, observationIndex) : match![2];
      const observation = observationIndex >= 0 ? match![2].slice(observationIndex + " Observação complementar: ".length) : "";
      return `<tr><td style="padding:10px 10px 10px 0;color:${colors.institutional};font-size:16px;vertical-align:top">•</td><td style="padding:10px 0;color:${colors.text};font-size:14px;line-height:1.55;vertical-align:top"><strong style="font-weight:700">${escapeHtml(match![1])}:</strong> ${linkedText(guidance)}${observation ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid ${colors.border}"><strong>Observação complementar:</strong> ${linkedText(observation)}</div>` : ""}</td></tr>`;
    }).join("");
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;padding:8px 16px;border-left:3px solid ${colors.institutional};border-radius:6px;background:${colors.institutionalSoft}">${rows}</table>`;
  }
  const details = lines.map((line) => line.match(detailLine));
  if (details.every(Boolean)) {
    const rows = details.map((match) => `<tr><td style="padding:7px 10px 7px 0;color:${colors.muted};font-size:13px;vertical-align:top;white-space:nowrap">${escapeHtml(match![1])}</td><td style="padding:7px 0;color:${colors.text};font-size:14px;font-weight:700;vertical-align:top">${linkedText(match![2])}</td></tr>`).join("");
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;padding:10px 14px;border-left:3px solid ${colors.institutional};border-radius:6px;background:${colors.institutionalSoft}">${rows}</table>`;
  }
  return `<p style="margin:0 0 18px;color:${colors.text};font-size:15px;line-height:1.65">${lines.map(linkedText).join("<br>")}</p>`;
}

const correctionSubject = /^Pronto!\s*\|\s*Correções necessárias\b/i;
const studentReplySubject = /^Pronto!\s*\|\s*Resposta sobre o protocolo\b/i;
const richReplyPattern = /<\/?(?:p|strong|em|ul|ol|li|a|br)\b/i;
const footerText = "Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.\nNão responda a este e-mail.";
const informationBox = (content: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;padding:12px 16px;border-left:3px solid ${colors.institutional};border-radius:6px;background:${colors.institutionalSoft}"><tr><td style="color:${colors.text};font-size:15px;line-height:1.65">${content}</td></tr></table>`;
function replyParagraphs(body: string, html: boolean) {
  const parts = body.split(/\n\s*\n/).filter(Boolean);
  if (parts.length < 4) return null;
  const reply = parts.slice(2, -1).join("\n\n");
  if (!html) {
    const plain = sanitizeHtml(reply.replace(/<\/(?:p|li|ul|ol)>|<br\s*\/?\s*>/gi, "\n"), { allowedTags: [], allowedAttributes: {} }).trim();
    return [...parts.slice(0, 2), plain, parts.at(-1)!].join("\n\n");
  }
  const safeReply = richReplyPattern.test(reply) ? sanitizeHtml(reply, {
    allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "style"] },
    allowedSchemes: ["https"],
    transformTags: { a: (_tag, attrs) => ({ tagName: "a", attribs: { href: attrs.href ?? "", style: `color:${colors.institutional};font-weight:700;text-decoration:underline` } }) },
  }) : reply.split(/\n\s*\n/).map(paragraphHtml).join("");
  return `${parts.slice(0, 2).map(paragraphHtml).join("")}${informationBox(safeReply)}${paragraphHtml(parts.at(-1)!)}`;
}
const coordinationCompletion = (subject: string, body: string) => /Atendimento concluído|protocolo\s+n\.º\s+.*\s+concluído/i.test(subject) && body.includes("A página de acompanhamento desta solicitação foi fechada");
const explicitClosedLink = (body: string) => body.replace("O Magic Link enviado anteriormente não é mais válido.", "O botão e URL de acesso ao protocolo enviados anteriormente não são mais válidos.");
const firstNameGreeting = (body: string) => body.replace(/^(Olá,\s+)([^\n.]+)(\.)/m, (_match, greeting: string, name: string, punctuation: string) => `${greeting}${name.trim().split(/\s+/)[0]}${punctuation}`);
const panelUrl = (siteUrl: string) => new URL("/painel", siteUrl).toString();
const resolveSiteUrl = (body: string, siteUrl: string) => body.replaceAll("{{SITE_URL}}", siteUrl.replace(/\/$/, ""));

function emailDestination(subject: string, textBody: string, siteUrl: string) {
  if (studentReplySubject.test(subject)) return undefined;
  if (correctionSubject.test(subject)) return new URL("/painel/solicitacao/corrigir", siteUrl).toString();
  return textBody.match(/https?:\/\/[^\s<>]+/)?.[0]?.replace(/[.,;:!?]+$/, "");
}

function emailActions(subject: string, body: string, siteUrl: string) {
  const publicWorkUrl = body.match(/https?:\/\/[^\s<>]+\/f\/[a-zA-Z0-9-]+/)?.[0];
  if (/Atendimento concluído/i.test(subject) && publicWorkUrl) return [{ url: publicWorkUrl, label: "Ver página pública do trabalho" }];
  // A coordenação acompanha por link próprio e não recebe acesso ao painel.
  if (/Atendimento (?:da ficha )?concluído/i.test(subject) && body.startsWith("Olá!")) return [];
  const destination = emailDestination(subject, body, siteUrl);
  if (/Continue a preparação do autodepósito|Lembrete.*depósito/i.test(subject) || destination?.includes("/painel/autodeposito")) {
    return destination ? [{ url: destination, label: "Continuar preparação para o autodepósito" }] : [];
  }
  if (destination?.includes("/painel/avaliacao")) return [{ url: destination, label: "Avaliar o serviço" }];
  if (destination?.includes("/coordenacao/")) return [{ url: destination, label: "Acompanhar solicitação" }];
  const actions = [];
  if (destination && destination !== panelUrl(siteUrl)) actions.push({ url: destination, label: correctionSubject.test(subject) ? "Corrigir campos pendentes" : /repositorio\.ufba\.br|\/handle\//i.test(destination) ? "Consultar publicação" : "Acessar o Pronto!" });
  if (!coordinationCompletion(subject, body)) actions.push({ url: panelUrl(siteUrl), label: "Acessar o painel do Pronto!" });
  return actions;
}

const fallbackLabel = (label: string, count: number) => count > 1 ? `Se o botão "${label}" não funcionar, copie este endereço para o navegador:` : "Se o botão não funcionar, copie este endereço para o navegador:";

export function transactionalEmailText(subject: string, textBody: string, siteUrl: string) {
  const resolvedBody = firstNameGreeting(resolveSiteUrl(textBody, siteUrl)).trim();
  const body = studentReplySubject.test(subject) ? replyParagraphs(resolvedBody, false) ?? resolvedBody : coordinationCompletion(subject, resolvedBody) ? explicitClosedLink(resolvedBody) : resolvedBody;
  const formattedBody = correctionSubject.test(subject) ? body.replaceAll(" Observação complementar: ", "\n  Observação complementar: ") : body;
  const actions = emailActions(subject, body, siteUrl);
  return `${formattedBody}${actions.map(({ url, label }) => `\n\n${label}\n${fallbackLabel(label, actions.length)}\n${url}`).join("")}\n\n${footerText}`;
}

export function transactionalEmailHtml(subject: string, textBody: string, siteUrl: string) {
  const resolvedBody = firstNameGreeting(resolveSiteUrl(textBody, siteUrl)).trim();
  const body = coordinationCompletion(subject, resolvedBody) ? explicitClosedLink(resolvedBody) : resolvedBody;
  const firstUrl = emailDestination(subject, body, siteUrl);
  const coordinationAccess = Boolean(firstUrl?.includes("/coordenacao/"));
  const displayBody = coordinationAccess && firstUrl ? body.replace(firstUrl, "").replace(/Para acompanhar o andamento, use o acesso seguro abaixo:\s*/, "Para acompanhar o andamento, use o botão abaixo.\n\n") : body;
  const paragraphs = studentReplySubject.test(subject) ? replyParagraphs(displayBody, true) ?? displayBody.split(/\n\s*\n/).filter(Boolean).map(paragraphHtml).join("") : displayBody.split(/\n\s*\n/).filter(Boolean).map(paragraphHtml).join("");
  const actions = emailActions(subject, body, siteUrl);
  const actionRow = actions.map(({ url, label }) => `<div style="margin:24px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:${colors.institutional};color:#ffffff;font-size:14px;font-weight:700;line-height:1.25;text-decoration:none">${escapeHtml(label)}</a><p style="margin:12px 0 0;color:${colors.muted};font-size:12px;line-height:1.5">${escapeHtml(fallbackLabel(label, actions.length))}<br><a href="${escapeHtml(url)}" style="color:${colors.institutional};font-size:12px;word-break:break-all">${escapeHtml(url)}</a></p></div>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>@media(max-width:480px){.email-action-cell a{padding:10px 12px!important;font-size:12px!important}}</style></head><body style="margin:0;padding:32px 12px;background:${colors.background};font-family:Inter,Arial,Helvetica,sans-serif;color:${colors.text}"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:auto;border:1px solid ${colors.border};border-radius:8px;background:${colors.surface}"><tr><td bgcolor="${colors.header}" style="padding:0;background:${colors.header}"><img src="cid:pronto-header" width="600" alt="Pronto! Biblioteca FAUFBA" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr><tr><td style="padding:32px"><p style="margin:0 0 10px;color:${colors.institutional};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">BIB/FAUFBA · Pronto!</p><h1 style="margin:0 0 24px;color:${colors.text};font-size:24px;line-height:1.25">${escapeHtml(subject.replace(/^Pronto!\s*\|\s*/, ""))}</h1>${paragraphs}${actionRow}</td></tr><tr><td style="padding:20px 32px;border-top:1px solid ${colors.border};background:${colors.background};color:${colors.muted};font-size:12px;line-height:1.6">${escapeHtml(footerText).replace("\n", "<br>")}</td></tr></table></body></html>`;
}
