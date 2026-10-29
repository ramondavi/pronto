import test from "node:test";
import assert from "node:assert/strict";
import { composeCduSymbols, type CduToken } from "../src/lib/cdu-symbols.ts";
import { composeCdu, type ComposerEntry } from "../src/lib/cdu-composer.ts";
const edition = "2ª edição (IBICT, 2007)";
const row = (code: string, kind = "main", extra: Partial<ComposerEntry> = {}): ComposerEntry => ({ cdu_code: code, description: `Exemplo ${code}`, source_reference: edition, validated: false, notation_kind: kind, ...extra });
const entries: ComposerEntry[] = [
 ...["1", "2", "5", "7", "32", "51", "53", "54", "62", "69", "72", "77.044", "355", "622.341.1", "006.44", "929", "94", "811.134.3", "025.45", "026.07", "027"].map(code => row(code)),
 row("027.1", "main", { parent_code: "027" }), row("72.01", "special_point_zero", { auxiliary_scope_code: "72" }),
 row("811.134.3-31", "special_hyphen", { auxiliary_scope_code: "811.134.3" }),
 row("(81)", "common_place"), row("(73)", "common_place"), row("(430)", "common_place"), row("(815.2)", "common_place"),
 row("(091)", "common_form"), row("(0.034.2PDF)", "common_form"), row("=111", "common_language"), row("(=411.21)", "common_ancestry"),
 row('"-2000"', "common_time"), row('"1939"', "common_time"), row('"1945"', "common_time"), row('"19"', "common_time"),
 row("-051", "common_persons"), row("-034.14", "common_materials"), row("-021.131", "common_properties"), row("-049.2", "common_processes"),
];
const r = (code: string): CduToken => ({ kind: "record", code });
const op = (value: "+" | "/" | ":" | "::"): CduToken => ({ kind: "relation", value });
const open: CduToken = { kind: "open" }, close: CduToken = { kind: "close" };
const build = (tokens: CduToken[], source = entries) => composeCduSymbols(tokens, edition, source);

test("all four relations preserve order and explicit grouping", () => {
 assert.equal(build([r("53"),op("/"),r("54")]).code,"53/54");
 assert.equal(build([r("77.044"),op("::"),r("355")]).code,"77.044::355");
 assert.equal(build([r("32"),op(":"),open,r("2"),op("+"),r("5"),close]).code,"32:[2+5]");
 assert.equal(build([open,open,r("1"),op("+"),r("7"),close,op(":"),r("51"),close,r("(81)")]).code,"[[1+7]:51](81)");
});
test("incomplete, adjacent and unmatched groups/operators cannot be saved", () => {
 for (const tokens of [[open,close],[r("7"),op(":")],[r("7"),r("51")],[close,r("7")],[open,r("7")],[r("7"),op("+"),op(":"),r("51")]]) assert.throws(()=>build(tokens));
});
test("ranges reject reverse, equal, decorated and repeated consecutive extension", () => {
 for (const tokens of [[r("54"),op("/"),r("53")],[r("53"),op("/"),r("53")],[r("53"),r("(81)"),op("/"),r("54")],[r("1"),op("/"),r("2"),op("/"),r("5")]]) assert.throws(()=>build(tokens));
 assert.equal(build([open,r("53"),op("/"),r("54"),close,r("(81)")]).code,"[53/54](81)");
 assert.equal(composeCdu([{code:"53",relation:":"},{code:"54",relation:"/"}],[],edition,entries).code,"53/54");
 assert.throws(()=>composeCdu([{code:"54",relation:":"},{code:"53",relation:"/"}],[],edition,entries));
});
test("alphabetic specification belongs inside place or outside for another aspect", () => {
 const text: CduToken = { kind:"alphabetic",value:"Vitória",placement:"inside" };
 assert.equal(build([r("94"),r("(815.2)"),text]).code,"94(815.2Vitória)");
 assert.equal(build([r("929"),{kind:"alphabetic",value:"Niemeyer",placement:"after"}]).code,"929Niemeyer");
 assert.throws(()=>build([r("929"),text]));
});
test("external notation requires an identified source and is recorded in memory", () => {
 const external: CduToken={kind:"external",value:"NBR6023",source:"Sistema ABNT, referência conferida",placement:"after"};
 const result=build([r("006.44"),external]);assert.equal(result.code,"006.44*NBR6023");assert.match(result.memory,/Sistema ABNT/);
 assert.throws(()=>build([r("006.44"),{...external,source:""}]));
 assert.throws(()=>build([r("006.44"),{...external,value:"<script>"}]));
 assert.equal(build([r("94"),r("(815.2)"),{...external,value:"201",placement:"inside"}]).code,"94(815.2*201)");
});
test("registered complex auxiliaries preserve their own synthesis, names and carriers", () => {
 for (const [code,kind] of [["(81+73)","common_place"],["(83/85)","common_place"],["(815.2Vitória)","common_place"],['"-03"',"common_time"],['"2001.09.11.08.46.26"',"common_time"],["(0.034.2PDF)","common_form"]]) assert.equal(build([r("7"),r(code)],[...entries,row(code,kind)]).code,"7"+code);
 assert.throws(()=>build([r("7"),r("(813.)")],[...entries,row("(813.)","common_place")]));
 assert.throws(()=>build([r("7"),r("(81+73")],[...entries,row("(81+73","common_place")]));
});
test("independent common auxiliary may prefix, dependent characteristics may not", () => {
 assert.equal(build([r("(430)"),r("622.341.1")]).code,"(430)622.341.1");
 for (const code of ["-051","-034.14","-021.131","-049.2"]) {assert.throws(()=>build([r(code),r("7")]));assert.equal(build([r("7"),r(code)]).code,"7"+code);}
});
test("intercalation preserves the complete original main number and recorded component", () => {
 assert.equal(build([r("622.341.1"),{kind:"intercalate",code:"(430)",offset:3}]).code,"622(430).341.1");
 const result=build([r("622.341.1"),{kind:"intercalate",code:"(430)",offset:7}]);assert.equal(result.code,"622.341(430).1");assert.deepEqual(result.related,["622.341.1"]);
 assert.throws(()=>build([r("622.341.1"),{kind:"intercalate",code:"(430)",offset:2}]));
});
test("same auxiliaries in different positions keep different concepts instead of reordering", () => {
 assert.equal(build([r("811.134.3"),r("811.134.3-31"),r("(81)")]).code,"811.134.3-31(81)");
 assert.equal(build([r("811.134.3"),r("(81)"),r("811.134.3-31")]).code,"811.134.3(81)-31");
 assert.throws(()=>build([r("7"),r("811.134.3-31")]));
});
test("auxiliary synthesis retains one wrapper and records both components", () => {
 const pair:CduToken={kind:"auxiliary_pair",first:"(81)",second:"(73)",relation:"+"};const result=build([r("7"),pair]);assert.equal(result.code,"7(81+73)");assert.deepEqual(result.auxiliaries,["(81)","(73)"]);
 assert.equal(build([r("7"),{kind:"auxiliary_pair",first:'"1939"',second:'"1945"',relation:"/"}]).code,'7"1939/1945"');
 assert.throws(()=>build([r("7"),{...pair,second:"(091)"}]));
 assert.throws(()=>build([r("7"),{...pair,first:"(81)",second:"(73)",relation:"/"}]));
});
test("parallel division needs explicit instruction and a recorded model hierarchy", () => {
 const token:CduToken={kind:"parallel",base:"026.07",model:"027",subdivision:"027.1",instruction:"Dividido como 027; localização conferida na edição"};const result=build([token]);assert.equal(result.code,"026.071");assert.match(result.memory,/Dividido como/);assert.ok(!result.code.includes("≅"));
 assert.throws(()=>build([{...token,instruction:""}]));assert.throws(()=>build([token],entries.map(entry=>entry.cdu_code==="027.1"?{...entry,parent_code:null}:entry)));
});
test("merged or differently sourced records cannot enter any extended assembly", () => {
 for (const extra of [{merged_into_code:"72"},{source_reference:"1997"},{source_reference:null}]) assert.throws(()=>build([r("7"),r("(81)")],entries.map(entry=>entry.cdu_code==="(81)"?{...entry,...extra}:entry)));
});
test("depth, token, memory and field limits bound the structured editor", () => {
 assert.throws(()=>build([...Array.from({length:9},()=>open),r("7"),...Array.from({length:9},()=>close)]));
 assert.throws(()=>build(Array.from({length:65},()=>r("7"))));
 assert.throws(()=>build([r("929"),{kind:"alphabetic",value:"A".repeat(41),placement:"after"}]));
});

test("special auxiliary chains preserve apostrophe, point-zero and hyphen positions", () => {
 const extra=[row("329.12"),row("329.12'13","special_apostrophe",{auxiliary_scope_code:"329.12"}),row("329.12'23","special_apostrophe",{auxiliary_scope_code:"329.12"}),row("329.12.052","special_point_zero",{auxiliary_scope_code:"329.12"})];
 assert.equal(build([r("329.12"),r("329.12'13"),r("329.12'23")],[...entries,...extra]).code,"329.12'13'23");
 assert.equal(build([r("329.12"),r("329.12'23"),r("329.12.052")],[...entries,...extra]).code,"329.12'23.052");
});

test("extension keeps recorded zero-ending subdivisions distinct", () => {
 const source=[...entries,row("53.1"),row("53.10")];
 assert.equal(build([r("53.1"),op("/"),r("53.10")],source).code,"53.1/53.10");
});

test("parallel division uses recorded hierarchy and preserves decimal groups after synthesis", () => {
 const token:CduToken={kind:"parallel",base:"026.07",model:"027",subdivision:"027.12",instruction:"Instrução de divisão paralela conferida na edição"};
 assert.equal(build([token],[...entries,row("027.12","main",{parent_code:"027"})]).code,"026.071.2");
 assert.equal(build([{...token,model:"2",subdivision:"24"}],[...entries,row("24","main",{parent_code:"2"})]).code,"026.074");
});
