import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

for (const profile of ["student", "cataloger", "administrator"]) {
  test(`${profile}: active session redirects away from entry forms`, async ({ browser }) => {
    const state = `.auth/${profile}.json`;
    test.skip(!existsSync(state), "Sessão local ausente");
    const context = await browser.newContext({ storageState: state });
    try {
      const page = await context.newPage();
      for (const path of ["/entrar", "/entrar/codigo", "/cadastro"]) {
        await page.goto(path);
        await expect(page).toHaveURL(/\/painel(?:[/?]|$)/);
        await expect(page.locator('input[type="password"]')).toHaveCount(0);
      }
    } finally { await context.close(); }
  });
}
