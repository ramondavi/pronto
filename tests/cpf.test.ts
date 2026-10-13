import assert from "node:assert/strict";
import test from "node:test";
import { isValidCpf, maskCpf, normalizeCpf } from "../src/domain/students/cpf.ts";

test("normalizes punctuation from CPF", () => {
  assert.equal(normalizeCpf("529.982.247-25"), "52998224725");
});

test("validates CPF check digits and rejects repeated digits", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("529.982.247-24"), false);
  assert.equal(isValidCpf("111.111.111-11"), false);
});

test("masks CPF without exposing the complete identifier", () => {
  assert.equal(maskCpf("52998224725"), "***.982.247-**");
  assert.equal(maskCpf("invalid"), "***.***.***-**");
});
