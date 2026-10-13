import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("decisões finais pedem confirmação antes de executar", async () => {
  const [dialog, workspace, review, closure, nadaConsta] = await Promise.all([
    readFile("src/components/final-decision-dialog.tsx", "utf8"),
    readFile("src/components/request-analysis-workspace.tsx", "utf8"),
    readFile("src/components/cataloging-card-homologation.tsx", "utf8"),
    readFile("src/components/protocol-closure.tsx", "utf8"),
    readFile("src/components/nada-consta-review.tsx", "utf8"),
  ]);
  assert.match(dialog, /role="alertdialog"/);
  assert.match(workspace, /Validar metadados/);
  assert.match(review, /Homologar esta ficha/);
  assert.match(closure, /Encerrar este protocolo/);
  assert.match(nadaConsta, /Aprovar o Nada Consta/);
});
