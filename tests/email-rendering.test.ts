import assert from "node:assert/strict";
import test from "node:test";
import { transactionalEmailHtml, transactionalEmailText } from "../src/lib/email-html.ts";

const site = "https://pronto.example.invalid";
const footer = "Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.";

test("each correction action includes its own complete fallback URL and the shared footer", () => {
  const subject = "Pronto! | Correções necessárias na solicitação n.º FA2026-0001";
  const html = transactionalEmailHtml(subject, "Olá, Pessoa.\n\nCorrija os campos indicados.", site);
  for (const [label, url] of [["Corrigir campos pendentes", `${site}/painel/solicitacao/corrigir`], ["Acessar o painel do Pronto!", `${site}/painel`]]) {
    assert.ok(html.includes(`Se o botão &quot;${label}&quot; não funcionar, copie este endereço para o navegador:`));
    assert.ok(html.includes(`font-size:12px;word-break:break-all\">${url}</a>`));
  }
  assert.ok(html.includes(`${footer}<br>Não responda a este e-mail.`));
});

test("completion without publication exposes only the corresponding public record action to both recipients", () => {
  for (const greeting of ["Olá, Pessoa.", "Olá!"]) {
    const body = `${greeting}\n\nO atendimento da ficha catalográfica foi concluído.\n\nPágina pública do trabalho no Pronto!: {{SITE_URL}}/f/identificador-exemplo`;
    const html = transactionalEmailHtml("Pronto! | Atendimento concluído — FA2026-0001", body, site);
    assert.ok(html.includes("Ver página pública do trabalho"));
    assert.ok(html.includes(`${site}/f/identificador-exemplo`));
    assert.ok(!html.includes("Acessar o painel"));
  }
});

test("coordination completion never adds internal panel access", () => {
  const body = "Olá!\n\nA página de acompanhamento desta solicitação foi fechada juntamente com o protocolo de atendimento.\n\nPublicação no RI/UFBA: https://repositorio.ufba.br/handle/ri/exemplo";
  assert.ok(!transactionalEmailHtml("Pronto! | Atendimento concluído — FA2026-0001", body, site).includes("Acessar o painel"));
});

test("reminders have a single contextual action, and library replies remain sanitized inside an information box", () => {
  const reminder = transactionalEmailHtml("Pronto! | Continue a preparação do autodepósito", `Continue: ${site}/painel/autodeposito?pedido=exemplo`, site);
  assert.ok(reminder.includes("Continuar preparação para o autodepósito"));
  assert.ok(!reminder.includes("Acessar o painel"));
  const body = 'Olá, Pessoa.\n\nA biblioteca respondeu:\n\n<p><strong>Resposta</strong><script>alert(1)</script></p>\n\nAcompanhe no Pronto!.';
  const subject = "Pronto! | Resposta sobre o protocolo FA2026-0001";
  const html = transactionalEmailHtml(subject, body, site);
  assert.ok(html.includes("border-left:3px solid"));
  assert.ok(html.includes("<strong>Resposta</strong>"));
  assert.ok(!html.includes("<script>"));
  assert.ok(transactionalEmailText(subject, body, site).endsWith(`${footer}\nNão responda a este e-mail.`));
});
