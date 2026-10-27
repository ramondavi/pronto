import test from "node:test";
import assert from "node:assert/strict";
import { composeCdu, type ComposerEntry, type CduPart } from "../src/lib/cdu-composer.ts";
const edition = "2ª edição (IBICT, 2007)";
const entry = (code: string, kind: string, extra: Partial<ComposerEntry> = {}): ComposerEntry => ({ cdu_code: code, notation_kind: kind, description: `Descrição ${code}`, source_reference: edition, validated: false, ...extra });
const entries = [entry("711.4", "main"), entry("316.55", "main"), entry("(813.8)", "common_place"), entry("=111", "common_language"), entry("7", "main"), entry("72", "main", { parent_code: "7" }), entry("72.01", "special_point_zero", { auxiliary_scope_code: "72" }), entry("728", "main", { parent_code: "72" })];
const parts: CduPart[] = [{ code: "711.4", relation: ":" }, { code: "316.55", relation: ":" }];

test("composer builds place composition and records original components", () => {
 const result = composeCdu(parts.slice(0, 1), [{ code: "(813.8)", target: 0 }], edition, entries);
 assert.equal(result.code, "711.4(813.8)"); assert.deepEqual(result.auxiliaries, ["(813.8)"]); assert.deepEqual(result.related, ["711.4"]); assert.match(result.memory, /assunto 1/);
});
test("place applies to selected subject or explicitly grouped relation", () => {
 assert.equal(composeCdu(parts, [{ code: "(813.8)", target: 1 }], edition, entries).code, "711.4:316.55(813.8)");
 assert.equal(composeCdu(parts, [{ code: "(813.8)", target: 0 }], edition, entries).code, "711.4(813.8):316.55");
 assert.equal(composeCdu(parts, [{ code: "(813.8)", target: "whole" }], edition, entries).code, "[711.4:316.55](813.8)");
});
test("relation operators preserve the selected order without inferring hierarchy", () => {
 for (const relation of ["::", "+"] as const) assert.equal(composeCdu([parts[0], { ...parts[1], relation }], [], edition, entries).code, `711.4${relation}316.55`);
 assert.throws(() => composeCdu([parts[0], { code: "", relation: ":" }], [], edition, entries));
});
test("mixed/unknown editions and retired components are rejected", () => {
 for (const extra of [{ source_reference: "1997" }, { source_reference: null }, { merged_into_code: "72" }]) assert.throws(() => composeCdu(parts, [], edition, entries.map(item => item.cdu_code === "316.55" ? { ...item, ...extra } : item)));
});
test("special auxiliary composes suffix only in recorded application hierarchy", () => {
 assert.equal(composeCdu([{ code: "728", relation: ":" }], [{ code: "72.01", target: 0 }], edition, entries).code, "728.01");
 assert.throws(() => composeCdu(parts.slice(0, 1), [{ code: "72.01", target: 0 }], edition, entries));
 assert.throws(() => composeCdu([{ code: "728", relation: ":" }], [{ code: "72.01", target: "whole" }], edition, entries));
});
test("auxiliary application survives only with a real target and no duplicate pair", () => {
 assert.throws(() => composeCdu(parts, [{ code: "(813.8)", target: 9 }], edition, entries));
 assert.throws(() => composeCdu(parts, [{ code: "(813.8)", target: 0 }, { code: "(813.8)", target: 0 }], edition, entries));
 assert.equal(composeCdu(parts, [{ code: "(813.8)", target: 0 }, { code: "(813.8)", target: 1 }], edition, entries).auxiliaries.length, 1);
});
test("arbitrary expressions and unorganized entries remain manual", () => {
 assert.throws(() => composeCdu([{ code: "711.4:316.55", relation: ":" }], [], edition, [...entries, entry("711.4:316.55", "compound")]));
 assert.throws(() => composeCdu(parts, [{ code: "(813.8)", target: 1 }], edition, entries.map(item => item.cdu_code === "(813.8)" ? { ...item, notation_kind: "unclassified" } : item)));
 assert.equal(composeCdu(parts, [{ code: "(81+82)", target: 1 }], edition, [...entries, entry("(81+82)", "common_place")]).code, "711.4:316.55(81+82)");
});
test("eight subjects, twelve auxiliaries and field length bound the expression", () => {
 assert.throws(() => composeCdu(Array.from({ length: 9 }, () => parts[0]), [], edition, entries));
 const long = "711." + "4".repeat(77);
 assert.throws(() => composeCdu([{ code: long, relation: ":" }], [], edition, [entry(long, "main")]));
});

test("malformed auxiliary punctuation and excessive memory are rejected", () => {
 assert.throws(() => composeCdu(parts, [{ code: "(813.)", target: 1 }], edition, [...entries, entry("(813.)", "common_place")]));
 assert.throws(() => composeCdu(Array.from({ length: 8 }, () => parts[0]), [], edition, entries.map(item => item.cdu_code === "711.4" ? { ...item, description: "a".repeat(1000) } : item)));
});
