import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLanguage } from "../src/lib/interface-language.ts";

test("reconhece variantes regionais dos idiomas disponíveis", () => {
  assert.equal(normalizeLanguage("pt-BR"), "pt");
  assert.equal(normalizeLanguage("en-US"), "en");
  assert.equal(normalizeLanguage("fr-CA"), "fr");
});

test("usa português quando o idioma do dispositivo não está disponível", () => {
  assert.equal(normalizeLanguage("ja-JP"), "pt");
  assert.equal(normalizeLanguage(null), "pt");
});
