import test from "node:test";
import assert from "node:assert/strict";
import { initialKnowledgeEntries, knowledgeCategories } from "../src/lib/knowledge-base.ts";

test("perguntas existentes e guias completos entram no editor único", () => {
  const entries = initialKnowledgeEntries([{
    id: "faq-1", question: "Como acompanhar meu pedido?", answer: "Abra o painel.",
    active: true, position: 10, featured_position: 1, created_at: "2026-09-01T00:00:00Z",
  }]);
  assert.equal(entries.filter((entry) => entry.kind === "faq").length, 1);
  assert.equal(entries.filter((entry) => entry.kind === "answer").length, 2);
  assert.equal(entries.filter((entry) => entry.kind === "article").length, 5);
  assert.ok(entries.some((entry) => entry.slug === "emitir-nada-consta"));
  assert.ok(entries.some((entry) => entry.slug === "compartilhar-link-publico"));
  assert.equal(entries[0].featured_position, 1);
  assert.equal(entries[0].published_at, "2026-09-01T00:00:00Z");
  assert.match(entries.find((entry) => entry.slug === "preparar-solicitacao")?.body_html ?? "", /Hospede o arquivo em um serviço de nuvem/);
  assert.ok(knowledgeCategories.includes("Autodepósito"));
});
