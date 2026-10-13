import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("uma correção só é salva quando altera o valor do campo", async () => {
  const component = await readFile("src/components/request-analysis-workspace.tsx", "utf8");
  assert.match(component, /JSON\.stringify\(correctedValue\) === JSON\.stringify\(originalValue\)/);
  assert.match(component, /setState\("idle"\)/);
});

test("a análise salva as alterações e exige justificativa para enviar ajustes", async () => {
  const component = await readFile("src/components/request-analysis-workspace.tsx", "utf8");
  assert.match(component, /showPanelChange\("Registro salvo automaticamente"/);
  assert.match(component, /Enviar ao estudante para correção/);
  assert.match(component, /missingReturnFields\.length === 0/);
  assert.match(component, /disabled=\{returning \|\| !canReturn\}/);
  assert.match(component, /hasRequestedAdjustments/);
  assert.match(component, /Metadados validados/);
  assert.doesNotMatch(component, /Revisar devolução/);
  assert.match(component, /reset_direct_request_corrections/);
  assert.match(component, /savedText\.current/);
});
