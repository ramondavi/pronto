import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const copy = readFileSync(new URL("../docs/textos-emails-transacionais.md", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202609210000_approved_transactional_email_copy.sql", import.meta.url), "utf8");

test("versions the approved transactional email copy", () => {
  for (const text of [
    "Recebemos sua solicitação n.º [protocolo]",
    "Correções necessárias na solicitação n.º [protocolo]",
    "Sua ficha catalográfica está liberada!",
    "Protocolo n.º [protocolo] encerrado",
    "Conta interna aguardando provisionamento",
  ]) assert.match(copy, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("uses the approved copy in the transactional outboxes", () => {
  for (const text of [
    "Pronto! | Recebemos sua solicitação n.º",
    "Pronto! | Correções necessárias na solicitação n.º",
    "Pronto! | Sua ficha catalográfica está liberada!",
    "Pronto! | Protocolo n.º",
    "Pronto! | Conta interna aguardando provisionamento",
  ]) assert.match(migration, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
