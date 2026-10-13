import assert from "node:assert/strict";
import test from "node:test";
import { initialAcademicPrograms } from "../src/domain/academic-programs/seeds.ts";

test("seeds the five initial academic programs", () => {
  assert.equal(initialAcademicPrograms.length, 5);
  assert.equal(new Set(initialAcademicPrograms.map((program) => program.code)).size, 5);
});

test("disables repository deposit only for undergraduate TFG", () => {
  const disabled = initialAcademicPrograms.filter((program) => !program.repositoryDepositEnabled);
  assert.deepEqual(disabled.map((program) => program.code), ["architecture-urbanism-undergraduate"]);
});

test("maps master programs to their corresponding RI/UFBA degrees", () => {
  const masters = initialAcademicPrograms.filter((program) => program.level === "master");
  assert.deepEqual(masters.map((program) => program.repositoryAcademicDegreeLabel).sort(), ["Mestrado Acadêmico", "Mestrado Profissional"]);
});
