import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("a etapa final leva o responsável à homologação da ficha", async () => {
  const page = await readFile("src/app/painel/atendimento/[id]/page.tsx", "utf8");
  const sections = await readFile("src/components/request-analysis-sections.tsx", "utf8");
  assert.match(page, /cataloging=\{<AssistedCatalogingWorkspace/);
  assert.match(sections, /Revisão da ficha/);
  assert.match(sections, /Homologação/);
  assert.match(sections, /finalAction\?: ReactNode/);
});
