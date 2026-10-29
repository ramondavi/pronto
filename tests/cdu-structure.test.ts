import test from "node:test";
import assert from "node:assert/strict";
import { cduPath, cduOperators } from "../src/lib/cdu-structure.ts";
test("CDU follows curated hierarchy rather than truncating compound notation", () => {
 const entries = [{ cdu_code: "7" }, { cdu_code: "72", parent_code: "7" }, { cdu_code: "72:37(81)", parent_code: "72" }];
 assert.deepEqual(cduPath("72:37(81)", entries), ["7", "72", "72:37(81)"]);
 assert.deepEqual(cduPath("72.999", entries), ["72.999"]);
});
test("CDU history redirects without duplicating ancestor paths", () => {
 assert.deepEqual(cduPath("old", [{cdu_code:"old",merged_into_code:"72"},{cdu_code:"72",parent_code:"7"},{cdu_code:"7"}]), ["7","72"]);
 assert.deepEqual(cduPath("72", [{cdu_code:"72",parent_code:"7"},{cdu_code:"7",parent_code:"72"}]), ["7","72"]);
});
test("notation hints distinguish simple and order-fixed relations and ignore quoted time", () => {
 assert.deepEqual(cduOperators('72::37+7/8[9]*ABC"1990/2000"'), ["Relação com ordem fixa (::)","Adição (+)","Extensão consecutiva (/)","Agrupamento ([…])","Notação externa (*)","Especificação alfabética"]);
 assert.deepEqual(cduOperators('72:37"1990/2000"'), ["Relação simples (:)"]);
});
