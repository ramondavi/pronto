import { expect, test, type Page } from "@playwright/test";

// Only the separately provisioned local fixture may enable these tests.
// This documented password belongs exclusively to disposable synthetic accounts.
const password = "SyntheticOnly-2026-Test!";
const enabled = process.env.PRONTO_WEBSITE_DRILL === "1";
test.skip(!enabled, "Requires the owned, loopback-only synthetic fixture");

async function enter(page: Page, email: string, staff = false, value = password) {
  await page.goto(staff ? "/entrar?perfil=equipe" : "/entrar");
  await page.getByLabel("E-mail institucional", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function leave(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1280) <= 1100;
  if (mobile) await page.getByRole("button", { name: "Abrir menu da conta", exact: true }).click();
  await page.getByRole("button", { name: "Sair da conta", exact: true }).click();
  if (mobile) {
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Sair da conta", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/entrar(?:\?|$)/);
}

test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
});

const active = [
  { name: "estudante um", email: "teste.pgtap.estudante1@ufba.br", path: "/painel", heading: "Visão geral", staff: false },
  { name: "estudante dois", email: "teste.pgtap.estudante2@ufba.br", path: "/painel", heading: "Visão geral", staff: false },
  { name: "catalogador", email: "teste.pgtap.catalogador@ufba.br", path: "/painel/fila", heading: "Fila de solicitações", staff: true },
  { name: "administrador", email: "teste.pgtap.administrador@ufba.br", path: "/painel/admin", heading: "Administração", staff: true },
];

for (const account of active) {
  test(`${account.name}: login, cookie, recarga e saída`, async ({ page, context }) => {
    await enter(page, account.email, account.staff);
    await expect(page).toHaveURL(/\/painel(?:\/|$)/);
    expect((await context.cookies()).some(cookie => cookie.name.includes("-auth-token"))).toBe(true);
    await page.goto("/entrar");
    await expect(page).toHaveURL(/\/painel(?:\/|$)/);
    await page.goto(account.path);
    await expect(page.getByRole("heading", { name: account.heading, exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: account.heading, exact: false })).toBeVisible();
    await leave(page);
    expect((await context.cookies()).some(cookie => cookie.name.includes("-auth-token"))).toBe(false);
    await page.goto(account.path);
    await expect(page).toHaveURL(/\/entrar(?:\?|$)/);
  });
}

for (const kind of ["bloqueado", "inativo"]) {
  test(`${kind}: login não libera o painel`, async ({ page, context }) => {
    await enter(page, `teste.pgtap.${kind}@ufba.br`, true);
    await expect(page).toHaveURL(/\/entrar\?.*error=/);
    expect((await context.cookies()).some(cookie => cookie.name.includes("-auth-token"))).toBe(false);
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/entrar(?:\?|$)/);
  });
}

test("senha incorreta não cria sessão", async ({ page, context }) => {
  await enter(page, active[0].email, false, "Incorrect-Synthetic-Password!");
  await expect(page.getByText("E-mail ou senha inválidos, ou e-mail ainda não confirmado.")).toBeVisible();
  expect((await context.cookies()).some(cookie => cookie.name.includes("-auth-token"))).toBe(false);
});

test("estudante no acesso da equipe não mantém sessão", async ({ page, context }) => {
  await enter(page, active[0].email, true);
  await expect(page.getByText("Esta é uma conta de estudante. Use o acesso de estudantes.")).toBeVisible();
  expect((await context.cookies()).some(cookie => cookie.name.includes("-auth-token"))).toBe(false);
});

test("equipe no acesso de estudante não mantém sessão", async ({ page, context }) => {
  await enter(page, active[2].email);
  await expect(page.getByText("Esta é uma conta da biblioteca. Use o acesso da equipe.")).toBeVisible();
  expect((await context.cookies()).some(cookie => cookie.name.includes("-auth-token"))).toBe(false);
});

test("visitante sem sessão é redirecionado para entrar", async ({ page }) => {
  await page.goto("/painel/admin");
  await expect(page).toHaveURL(/\/entrar(?:\?|$)/);
});
