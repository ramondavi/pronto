import assert from "node:assert/strict";
import test from "node:test";
import { canChangeAuthenticatedEmail, isUfbaEmail, normalizeEmail, normalizedSignupMetadata, validateEmailChange, validateSignup } from "../src/domain/auth/account.ts";

test("accepts only the exact UFBA email domain", () => {
  assert.equal(isUfbaEmail(" pessoa@ufba.br "), true);
  assert.equal(isUfbaEmail("pessoa@aluno.ufba.br"), false);
  assert.equal(isUfbaEmail("pessoa@ufba.br.example.com"), false);
});

test("normalizes institutional email", () => {
  assert.equal(normalizeEmail(" Pessoa@UFBA.BR "), "pessoa@ufba.br");
});

test("validates an institutional email change", () => {
  assert.equal(validateEmailChange("nova.pessoa@ufba.br", "pessoa@ufba.br"), null);
  assert.equal(validateEmailChange("pessoa@ufba.br", " Pessoa@UFBA.BR "), "O novo e-mail deve ser diferente do endereço atual.");
  assert.equal(validateEmailChange("pessoa@gmail.com", "pessoa@ufba.br"), "Use um novo endereço institucional @ufba.br.");
});

test("allows authenticated email changes only for active accounts", () => {
  assert.equal(canChangeAuthenticatedEmail("active"), true);
  assert.equal(canChangeAuthenticatedEmail("blocked"), false);
  assert.equal(canChangeAuthenticatedEmail("inactive"), false);
  assert.equal(canChangeAuthenticatedEmail(null), false);
  assert.equal(canChangeAuthenticatedEmail(undefined), false);
});

test("validates all signup decisions together", () => {
  assert.equal(validateSignup({
    fullName: "Maria da Silva",
    cpf: "529.982.247-25",
    birthDate: "2000-01-15",
    email: "maria@ufba.br",
    password: "Uma-senha1!",
    passwordConfirmation: "Uma-senha1!",
    privacyAccepted: true,
  }), null);
});

test("requires acknowledgement of the privacy policy", () => {
  assert.equal(validateSignup({
    fullName: "Maria da Silva", cpf: "529.982.247-25", birthDate: "2000-01-15", email: "maria@ufba.br",
    password: "Uma-senha1!", passwordConfirmation: "Uma-senha1!", privacyAccepted: false,
  }), "É necessário declarar ciência da Política de Privacidade.");
});

test("student metadata never accepts a client-provided role", () => {
  const metadata = normalizedSignupMetadata({
    fullName: "Maria da Silva", cpf: "529.982.247-25", birthDate: "2000-01-15", email: "maria@ufba.br",
    password: "Uma-senha1!", passwordConfirmation: "Uma-senha1!", privacyAccepted: true,
  });
  assert.deepEqual(metadata, { registration_source: "student", full_name: "Maria da Silva", cpf: "52998224725", birth_date: "2000-01-15" });
  assert.equal("role" in metadata, false);
});
