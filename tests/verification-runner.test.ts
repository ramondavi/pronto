import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import test from "node:test";
import { selectChecks, verify } from "../scripts/verify.ts";

test("verification keeps full diagnostics, reports warnings and continues after failures", async () => {
  const root = resolve("tmp/verification-tests");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "case-"));
  try {
    const output: string[] = [];
    const report = await verify({ directory, emit: (line) => output.push(line), steps: [
      { name: "failed", command: process.execPath, args: ["-e", "console.error('diagnostic-marker'); process.exit(7)"] },
      { name: "passed", command: process.execPath, args: ["-e", "console.log('x'.repeat(10000)); console.log('warning: example'); console.log('# tests 1'); console.log('# pass 1')"] },
    ] });
    assert.equal(report.ok, false);
    assert.deepEqual(report.results.map((r) => r.exitCode), [7, 0]);
    assert.equal(report.results[1].warningLines, 1);
    assert.equal(report.results[1].testSummary, "tests=1; pass=1");
    assert.match(readFileSync(report.results[0].log, "utf8"), /diagnostic-marker/);
    assert.ok(report.results[1].logBytes > 10000);
    assert.ok(output.join("\n").length < 2000);
    assert.ok(!output.join("\n").includes("diagnostic-marker"));
    const repeat = await verify({ directory, emit: () => {}, steps: [
      { name: "ok", command: process.execPath, args: ["-e", "process.exit(0)"] },
    ] });
    assert.equal(repeat.ok, true);
    assert.notEqual(repeat.results[0].log, report.results[0].log);
    assert.equal(JSON.parse(readFileSync(join(resolve(repeat.results[0].log, ".."), "summary.json"), "utf8")).ok, true);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("a missing executable is a reported failure, never a success", async () => {
  const root = resolve("tmp/verification-tests");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "case-"));
  try {
    const report = await verify({ directory, emit: () => {}, steps: [
      { name: "missing", command: join(directory, "missing-executable"), args: [] },
    ] });
    assert.equal(report.ok, false);
    assert.equal(report.results[0].exitCode, 1);
    assert.equal(report.results[0].launchError, "ENOENT");
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("targeted checks reject unknown commands and retain all default checks", () => {
  assert.deepEqual(selectChecks([]), ["test", "typecheck", "lint", "build"]);
  assert.deepEqual(selectChecks(["--only", "lint", "lint", "test"]), ["lint", "test"]);
  assert.throws(() => selectChecks(["--only", "db:migrate"]));
  assert.throws(() => selectChecks(["--only"]));
});

test("entry documentation stays within its context budget without truncation", () => {
  const size = ["AGENTS.md", "docs/estado-atual.md"]
    .reduce((total, file) => total + readFileSync(file, "utf8").replace(/\r\n/g, "\n").length, 0);
  assert.ok(size <= 6000, `Entry context: ${size}/6000 characters; move details to topic references.`);
});
