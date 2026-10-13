import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("a marca compartilhada alterna os logos oficiais por tema", async () => {
  const [brand, footer, css] = await Promise.all([readFile("src/components/brand.tsx", "utf8"), readFile("src/components/site-footer.tsx", "utf8"), readFile("src/app/globals.css", "utf8")]);
  assert.match(brand, /logo-pronto-v3-light\.png/);
  assert.match(brand, /logo-pronto-v3-dark\.png/);
  assert.match(brand, /Biblioteca FAUFBA/);
  assert.match(footer, /OfficialLibraryLogo/);
  assert.match(css, /dashboard-nav \.brand__image--dark/);
});

test("exibe a barra institucional do Governo Brasileiro", async () => {
  const [layout, bar] = await Promise.all([readFile("src/app/layout.tsx", "utf8"), readFile("src/components/government-bar.tsx", "utf8")]);
  assert.match(layout, /GovernmentBar/);
  assert.match(layout, /barra\.brasil\.gov\.br\/barra_2\.0\.js/);
  assert.match(bar, /id="barra-brasil"/);
  assert.doesNotMatch(bar, /government-bar/);
  assert.match(bar, /Portal do Governo Brasileiro/);
  assert.match(bar, /https:\/\/www\.gov\.br\//);
});
