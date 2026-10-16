import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/entrar", "/cadastro", "/recuperar-senha", "/ajuda"]) {
  test(`${path} não tem violações críticas ou sérias`, async ({ page }) => {
    if (path === "/") test.slow();
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(({ impact }) => impact === "critical" || impact === "serious")).toEqual([]);
  });
}

test("recursos de acessibilidade preservam as preferências", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  await page.getByRole("button", { name: "Recursos de acessibilidade" }).click();
  await page.getByRole("button", { name: "Aumentar tamanho do texto" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "large");
  await page.getByRole("button", { name: "Alternar alto contraste" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "large");
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
});

test("busca de ajuda sugere respostas", async ({ page }) => {
  await page.route("**/api/central-de-duvidas?*", (route) => route.fulfill({ json: { results: [{ id: "article-corrections", slug: "corrigir-solicitacao", kind: "Artigo de ajuda", category: "Análise", title: "Como responder a uma correção da biblioteca", summary: "Como corrigir a solicitação" }] } }));
  await page.goto("/ajuda");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  await page.getByRole("searchbox", { name: "Encontre uma resposta" }).fill("correcao");
  await expect(page.getByRole("link", { name: /Artigo de ajuda.*correção/ })).toBeVisible();
});

test("navegação por teclado alcança o conteúdo", async ({ page }) => {
  await page.goto("/");
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.getAttribute("href") === "#conteudo")) break;
  }
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("href"))).toBe("#conteudo");
  await page.keyboard.press("Enter");
  await expect(page.locator("#conteudo")).toBeFocused();
});

test("controles de idioma e tema ficam alinhados no rodapé público", async ({ page }) => {
  await page.goto("/");
  const language = page.locator("#creditos .language-control");
  const theme = page.locator("#creditos .theme-switcher");
  await expect(language).toBeVisible();
  await expect(theme).toBeVisible();
  const languageBounds = await language.boundingBox();
  const themeBounds = await theme.boundingBox();
  expect(languageBounds).not.toBeNull();
  expect(themeBounds).not.toBeNull();
  expect(Math.abs(languageBounds!.y - themeBounds!.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(languageBounds!.height - themeBounds!.height)).toBeLessThanOrEqual(2);
});

test("links do rodapé público formam uma linha no desktop", async ({ page }) => {
  if ((page.viewportSize()?.width ?? 0) < 900) return;
  await page.goto("/");
  const footerLinks = page.locator('#creditos nav[aria-label="Informações"] a');
  await footerLinks.first().waitFor({ state: "visible" });
  const alignment = await footerLinks.evaluateAll((links) => ({
    columns: new Set(links.map((link) => Math.round(link.getBoundingClientRect().left))).size,
    rows: new Set(links.map((link) => Math.round(link.getBoundingClientRect().top))).size,
  }));
  expect(alignment).toEqual({ columns: 3, rows: 1 });
});

test("páginas públicas não criam rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("tema explícito persiste e substitui a preferência do sistema", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  const darkTheme = page.getByRole("button", { name: "Usar tema escuro" });
  const lightTheme = page.getByRole("button", { name: "Usar tema claro" });
  await darkTheme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(darkTheme).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(darkTheme).toHaveAttribute("aria-pressed", "true");
  await lightTheme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(lightTheme).toHaveAttribute("aria-pressed", "true");
});

test("entrada continua utilizável sob latência simulada", async ({ page }) => {
  await page.route("**/*", async route => {
    await new Promise(resolve => setTimeout(resolve, 120));
    await route.continue();
  });
  await page.goto("/entrar");
  await expect(page.getByRole("heading", { name: "Entre na sua conta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
});
