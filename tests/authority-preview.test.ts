import test from "node:test";
import assert from "node:assert/strict";
import { readAuthorityPreview } from "../src/lib/authority-preview.ts";
const bn = `000 00397nz  a2200145o  4500
001 000077411
003 Br
005 20051124161700.3
008 051124d| anznnbabn           a ana     d
150 __ |a Planejamento urbano |x Fatores climáticos
450 1_ |a Fatores climáticos no planejamento urbano
550 1_ |w g |a Climatologia
670 1_ |a LCSH
750 _0 |a City planning |x Climatic factors`;
test("BN preserva cabeçalho composto, identidade e relação com o conjunto", () => {
 const [r] = readAuthorityPreview(bn, "bn");
 assert.equal(r.title, "Planejamento urbano - Fatores climáticos");
 assert.equal(r.identifier, "Br / 000077411");
 assert.equal(r.components.length, 2);
 assert.match(r.relations[0].kind, /amplo/i);
 assert.equal(r.geography, "Direta");
 assert.ok(!r.warnings.some(w => /excluído/.test(w)));
 assert.equal(r.variants[0].value, "Fatores climáticos no planejamento urbano");
 assert.equal(r.mappings[0].value, "City planning - Climatic factors");
 assert.equal(r.original, bn);
});
test("550 sem w não inventa hierarquia; todas as variantes são mantidas", () => {
 const [r] = readAuthorityPreview("150 __ |a Comunidade urbana |x Desenvolvimento\n450 __ |a Variante um\n450 __ |a Variante dois\n550 __ |a Planejamento urbano\n680 __ |a Nota de uso", "ufba");
 assert.equal(r.variants.length, 2); assert.match(r.relations[0].kind, /associativa/i); assert.equal(r.notes[0].value, "Nota de uso"); assert.equal(r.identifier, null);
});
test("rejeita bibliográfico, vazio, mensagem do serviço e XML com entidades", () => {
 for (const s of ["", "Service temporarily degraded", bn.replace("00397nz", "00397na"), '<!DOCTYPE record [<!ENTITY x SYSTEM "https://example.org">]><record/>']) assert.throws(() => readAuthorityPreview(s, "bn"));
});
test("rejeita arquivo excessivo e UTF-8 inválido", () => { assert.throws(() => readAuthorityPreview("a".repeat(2_000_001), "bn")); assert.throws(() => readAuthorityPreview(new Uint8Array([255]), "bn")); });
const concept = { "@id": "http://example.org/authority/1", "http://www.w3.org/2004/02/skos/core#prefLabel": [{ "@value": "central cities", "@language": "en" }], "http://www.w3.org/2004/02/skos/core#broader": [{ "@id": "http://example.org/authority/2" }] };
test("JSON-LD preserva idioma e URI sem tradução nem resolução externa", () => { const [r] = readAuthorityPreview(JSON.stringify(concept), "aat"); assert.equal(r.title, "central cities"); assert.equal(r.labels[0].language, "en"); assert.equal(r.relations[0].identifier, "http://example.org/authority/2"); assert.ok(r.warnings.some(w => /tradução/.test(w))); });
test("NDJSON mantém registros e avisa identificadores repetidos sem mesclar", () => { const r = readAuthorityPreview([concept, concept].map(v => JSON.stringify(v)).join("\n"), "loc"); assert.equal(r.length, 2); assert.ok(r[1].warnings.some(w => /repetido/.test(w))); });
test("JSON genérico não se transforma em autoridade", () => { assert.throws(() => readAuthorityPreview('{"title":"Assunto"}', "aat")); });
test("contexto remoto não provoca consulta de rede", () => { const [r] = readAuthorityPreview(JSON.stringify({ ...concept, "@context": "https://example.org/context" }), "aat"); assert.ok(r.warnings.some(w => /externo/.test(w))); });
test("componentes não são inventados a partir de hífens", () => { const [r] = readAuthorityPreview(JSON.stringify({ ...concept, "http://www.w3.org/2004/02/skos/core#prefLabel": [{"@value":"Urban planning--Climate"}] }), "loc"); assert.equal(r.components.length, 0); });

test("ISO 2709 respeita offsets em bytes UTF-8 e recusa MARC-8", () => {
 const fields = [["001", "SINTETICO"], ["003", "TESTE"], ["150", "  \x1faHabitação"]];
 let offset = 0;
 const directory = fields.map(([tag, value]) => { const size = Buffer.byteLength(value) + 1; const entry = tag + String(size).padStart(4, "0") + String(offset).padStart(5, "0"); offset += size; return entry; }).join("");
 const start = 25 + directory.length;
 const leader = String(start + offset + 1).padStart(5, "0") + "nz  a22" + String(start).padStart(5, "0") + "n  4500";
 const bytes = Buffer.from(leader + directory + "\x1e" + fields.map(([,value]) => value + "\x1e").join("") + "\x1d");
 const [r] = readAuthorityPreview(bytes, "bn"); assert.equal(r.title, "Habitação"); assert.equal(r.identifier, "TESTE / SINTETICO");
 const marc8 = Buffer.from(bytes); marc8[9] = 32; assert.throws(() => readAuthorityPreview(marc8, "bn"), /MARC-8/);
 assert.throws(() => readAuthorityPreview(bytes.subarray(0, bytes.length - 2), "bn"));
});
test("amostra histórica da LC lê os dez registros principais sem incorporar nós relacionados", async () => {
 const { readFile } = await import("node:fs/promises");
 const text = await readFile(new URL("./fixtures/authorities/lc-pilot-2019.ndjson", import.meta.url), "utf8");
 const results = readAuthorityPreview(text, "loc"); assert.equal(results.length, 10); assert.equal(results.filter(r => r.relations.some(v => v.kind === "Mais amplo")).length, 5);
});
