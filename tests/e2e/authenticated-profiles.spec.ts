import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const profiles = [
  { name: "estudante", state: ".auth/student.json", path: "/painel", heading: /Seu acompanhamento/ },
  { name: "catalogador", state: ".auth/cataloger.json", path: "/painel/fila", heading: "Fila geral" },
  { name: "administrador", state: ".auth/administrator.json", path: "/painel/admin", heading: "Administração e operação" },
] as const;

for (const profile of profiles) {
  test(`${profile.name} acessa a área esperada`, async ({ browser }) => {
    test.skip(!existsSync(profile.state), `Sessão local ausente: ${profile.state}`);
    const context = await browser.newContext({ storageState: profile.state });
    const page = await context.newPage();
    await page.goto(profile.path);
    await expect(page.getByRole("heading", { name: profile.heading })).toBeVisible();
    await expect(page).not.toHaveURL(/\/entrar/);
    await context.close();
  });
}
