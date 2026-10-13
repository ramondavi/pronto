import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRIVACY_NOTICE_VERSION } from "../src/domain/privacy/notice.ts";
import { privacyCopy } from "../src/lib/privacy-copy.ts";

describe("política de privacidade", () => {
  it("identifica a versão publicada", async () => {
    const page = await readFile("src/app/politica-de-privacidade/page.tsx", "utf8");
    assert.match(page, /\{t.version\} \{PRIVACY_NOTICE_VERSION\}/);
    assert.match(privacyCopy.pt.version, /Política de privacidade · versão/);
    assert.equal(PRIVACY_NOTICE_VERSION, "1.1");
    assert.doesNotMatch(page, /Política aprovada institucionalmente/);
  });

  it("informa direitos, contatos e os serviços técnicos declarados", async () => {
    const page = await readFile("src/app/politica-de-privacidade/page.tsx", "utf8");
    assert.match(page, /<ProtectedEmail recipient="privacy" \/>/);
    assert.doesNotMatch(page, /ouvidoria@ufba\.br/);
    const content = privacyCopy.pt.sections.flatMap((section) => section.paragraphs).join(" ");
    assert.match(content, /Você pode confirmar o tratamento/);
    assert.match(content, /Supabase/);
    assert.match(content, /Vercel/);
  });

  it("explica o expurgo definido para o Nada Consta", async () => {
    const content = privacyCopy.pt.sections.flatMap((section) => section.paragraphs).join(" ");
    assert.match(content, /60 dias após o encerramento/);
    assert.match(privacyCopy.pt.summary[1][1], /PDF completo não é enviado ao Pronto/);
    assert.match(content, /no total, por 100 anos/);
    assert.match(content, /é removido 60 dias após o encerramento/);
    assert.match(content, /logs técnicos: 6 meses/);
    assert.match(content, /backups: 90 dias/);
  });

  it("usa acordeões nativos para os detalhes", async () => {
    const page = await readFile("src/app/politica-de-privacidade/page.tsx", "utf8");
    assert.match(page, /<details open>/);
    assert.match(page, /<summary>/);
  });
});
