import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/app/painel/page.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/components/dashboard-shell.tsx", import.meta.url), "utf8");

test("staff opens the overview first and sees role-appropriate operational summaries", () => {
  assert.match(dashboard, /profile\.role === "cataloger" \|\| profile\.role === "administrator"/);
  assert.match(dashboard, /<StaffOverview role=\{profile\.role\} userId=\{user\.id\}/);
  assert.match(dashboard, /<h1><AppIcon className="panel-heading-icon" name="home" \/>Visão geral<\/h1>/);
  assert.match(dashboard, /<AdminProvisioningAlert candidates=\{candidates \?\? \[\]\}/);
  assert.ok(shell.indexOf('href="/painel"') < shell.indexOf('href="/painel/fila"'));
});
