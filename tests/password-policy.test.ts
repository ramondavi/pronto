import assert from "node:assert/strict";
import test from "node:test";
import { passwordRequirements, validatePassword } from "../src/domain/auth/password.ts";

test("password policy requires length, uppercase letter, digit and special character", () => {
  assert.equal(validatePassword("Abcdef1!"), null);
  assert.equal(validatePassword("Ábcdef1!"), null);
  assert.match(validatePassword("Ab1!") ?? "", /8 caracteres/);
  assert.match(validatePassword("abcdef1!") ?? "", /maiúscula/);
  assert.match(validatePassword("Abcdefg!") ?? "", /número/);
  assert.match(validatePassword("Abcdefg1") ?? "", /caractere especial/);
});

test("spaces and accented lowercase letters do not count as special characters", () => {
  assert.equal(passwordRequirements("Abcdef1 ").special, false);
  assert.equal(passwordRequirements("Abcdef1é").special, false);
});
