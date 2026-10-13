import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("a janela destaca o último marco sem repetir o cabeçalho", async () => {
  const timeline = await readFile("src/components/request-timeline.tsx", "utf8");
  const styles = await readFile("src/app/globals.css", "utf8");
  assert.match(timeline, /showHeading=\{false\} highlightCurrent/);
  assert.match(timeline, /Marco atual do atendimento/);
  assert.match(styles, /protocol-current-pulse/);
});
