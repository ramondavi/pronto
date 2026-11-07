import test from "node:test";
import assert from "node:assert/strict";
import { authorityImportError, canOfferAuthorityImport, normalizeSubjectLabel } from "../src/lib/subject-authority.ts";
test("importar aparece somente com busca atual concluída e sem qualquer resultado", () => {
 const match = [{id:"1",preferred_label_pt:"Planejamento urbano",preferred_label_en:null,matched_variant:"Urbanismo"}];
 for (const state of ["idle","pending","error"] as const) assert.equal(canOfferAuthorityImport("Urbanismo",[],state),false);
 assert.equal(canOfferAuthorityImport("",[],"ready"),false); assert.equal(canOfferAuthorityImport("a",[],"ready"),false);
 assert.equal(canOfferAuthorityImport("Urbanismo",match,"ready"),false);
 assert.equal(canOfferAuthorityImport("Assunto ausente",[],"ready"),true);
});
test("comparação com o catálogo remove espaços e pontuação de borda como o salvamento", () => { assert.equal(normalizeSubjectLabel("  Planejamento   urbano. "),"Planejamento urbano"); assert.equal(normalizeSubjectLabel("Habitação (Brasil)"),"Habitação (Brasil)"); });
test("homônimo da mesma fonte recebe orientação específica", () => { assert.match(authorityImportError("authority_same_source_heading_conflict"), /mesmo cabeçalho/i); });
