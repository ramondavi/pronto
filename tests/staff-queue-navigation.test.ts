import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("a fila sincroniza o filtro de responsável com a navegação", async () => {
  const [component, shell] = await Promise.all([readFile("src/components/staff-queue.tsx", "utf8"), readFile("src/components/dashboard-shell.tsx", "utf8")]);
  assert.match(component, /useEffect/);
  assert.match(component, /setAssignee\(params\.get\("responsavel"\) === "me" \? "me" : ""\)/);
  assert.match(component, /href="\/painel\/fila\?responsavel=me"/);
  assert.match(shell, /pathname\.startsWith\("\/painel\/atendimento\/"\)/);
  assert.match(shell, /href="\/painel\/fila"/);
});
