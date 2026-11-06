import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readAuthorityPreview } from "../src/lib/authority-preview.ts";

const sample = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "tests/fixtures/authority-iso2709-sample.ts"], { encoding: "utf8" })) as { first: string; second: string; xml: string };
const first = Buffer.from(sample.first, "base64");
const second = Buffer.from(sample.second, "base64");

test("ISO 2709 mede bytes UTF-8 e volta ao importador com os campos preservados", () => {
  const bytes = first;
  const leader = new TextDecoder().decode(bytes.slice(0, 24));
  assert.equal(Number(leader.slice(0, 5)), bytes.length);
  assert.equal(leader[9], "a");
  assert.equal(bytes[Number(leader.slice(12, 17)) - 1], 0x1e);
  assert.equal(bytes.at(-1), 0x1d);
  const [restored] = readAuthorityPreview(bytes, "bn");
  assert.equal(restored.title, "Habitação e praça");
  assert.equal(restored.variants[0]?.value, "Moradia e espaço público");
  assert.match(sample.xml, /Habitação e praça/);
});

test("ISO 2709 em lote usa registros consecutivos sem separador adicional", () => {
  const combined = Uint8Array.from([...first, ...second]);
  const imported = readAuthorityPreview(combined, "bn");
  assert.equal(imported.length, 2);
  assert.equal(imported[1].title, "Urbanização");
});
