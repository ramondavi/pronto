import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("oferece breadcrumbs, favicon e metadados de compartilhamento", async () => {
  const [layout, breadcrumbs, breadcrumbCopy, panelMetadata, icon, og, robots, sitemap, dashboardLayout, notFound, home, header, greeting, css, help, search, studentForm, article] = await Promise.all([
    readFile("src/app/layout.tsx", "utf8"), readFile("src/components/breadcrumbs.tsx", "utf8"), readFile("src/lib/breadcrumb-copy.ts", "utf8"), readFile("src/lib/panel-metadata.ts", "utf8"),
    stat("src/app/icon.svg"), readFile("src/app/opengraph-image.tsx", "utf8"),
    readFile("src/app/robots.ts", "utf8"), readFile("src/app/sitemap.ts", "utf8"), readFile("src/app/painel/layout.tsx", "utf8"), readFile("src/app/not-found.tsx", "utf8"), readFile("src/app/page.tsx", "utf8"), readFile("src/components/site-header.tsx", "utf8"), readFile("src/components/site-header-greeting.tsx", "utf8"), readFile("src/app/globals.css", "utf8"), readFile("src/app/ajuda/page.tsx", "utf8"), readFile("src/components/help-search.tsx", "utf8"), readFile("src/components/student-request-form.tsx", "utf8"), readFile("src/app/ajuda/artigos/[slug]/page.tsx", "utf8"),
  ]);
  assert.match(layout, /openGraph/);
  assert.match(layout, /metadataBase/);
  assert.match(layout, /summary_large_image/);
  assert.match(layout, /https:\/\/prontobib\.vercel\.app/);
  assert.match(layout, /application\/ld\+json/);
  assert.match(breadcrumbCopy, /Caminho de navegação/);
  assert.match(breadcrumbs, /DashboardBreadcrumbs/);
  assert.match(breadcrumbCopy, /options\.protocol/);
  assert.match(panelMetadata, /dashboardTrail/);
  assert.ok(icon.size > 0);
  assert.match(og, /ImageResponse/);
  assert.match(robots, /sitemap/);
  assert.match(robots, /\/painel\//);
  assert.match(sitemap, /ajuda/);
  assert.match(dashboardLayout, /index: false/);
  assert.match(notFound, /Esta página saiu da estante/);
  assert.match(notFound, /Voltar ao início/);
  assert.match(home, /fallbackHomeFaqs/);
  assert.match(home, /homeFaqs/);
  assert.match(header, /AppIcon name="logout"/);
  assert.match(header, /Sair da conta/);
  assert.match(header, /<SiteHeaderGreeting key=\{user\.id\}/);
  assert.match(greeting, /site-header__access-greeting/);
  assert.match(header, /pt: \["Meu painel", "Olá"/);
  assert.match(greeting, /\$\{greeting\}, \$\{name\}/);
  assert.match(css, /\.site-header__access \{[^}]*grid-template-columns: 22px max-content/);
  assert.match(help, /<ProtectedEmail recipient="library" \/>/);
  assert.match(help, /<ProtectedPhone \/>/);
  assert.doesNotMatch(help, /bibarq@ufba\.br|3283-5888/);
  assert.match(search, /aria-autocomplete="list"/);
  assert.match(search, /api\/central-de-duvidas/);
  assert.doesNotMatch(studentForm, /HelpSearch compact/);
  assert.match(studentForm, /href="\/ajuda\/artigos\/compartilhar-link-publico" target="_blank"/);
  assert.match(article, /getPublishedKnowledge/);
});
