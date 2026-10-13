import { isValidCpf, normalizeCpf } from "../students/cpf.ts";
import { validatePassword } from "./password.ts";

export const UFBA_EMAIL_DOMAIN = "ufba.br";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isUfbaEmail(value: string) {
  const email = normalizeEmail(value);
  const [localPart, domain, ...extra] = email.split("@");
  return Boolean(localPart && domain === UFBA_EMAIL_DOMAIN && extra.length === 0);
}

export function validateEmailChange(newEmail: string, currentEmail: string) {
  if (!isUfbaEmail(newEmail)) return "Use um novo endereço institucional @ufba.br.";
  if (normalizeEmail(newEmail) === normalizeEmail(currentEmail)) return "O novo e-mail deve ser diferente do endereço atual.";
  return null;
}

export function canChangeAuthenticatedEmail(status: string | null | undefined) {
  return status === "active";
}

export type SignupInput = {
  fullName: string;
  cpf: string;
  birthDate: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  privacyAccepted: boolean;
};

export type SignupField = "name" | "cpf" | "birthDate" | "email" | "password" | "passwordConfirmation" | "privacyAccepted";
export type SignupErrors = Partial<Record<SignupField, string>>;

export function validateSignupFields(input: SignupInput): SignupErrors {
  const errors: SignupErrors = {};
  if (input.fullName.trim().length < 3) errors.name = "Informe seu nome completo.";
  if (!isValidCpf(input.cpf)) errors.cpf = "Informe um CPF válido.";
  if (!isValidBirthDate(input.birthDate)) errors.birthDate = "Informe uma data de nascimento válida.";
  if (!isUfbaEmail(input.email)) errors.email = "Use seu endereço institucional @ufba.br.";
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (input.password !== input.passwordConfirmation || !input.passwordConfirmation) errors.passwordConfirmation = "As senhas não coincidem.";
  if (!input.privacyAccepted) errors.privacyAccepted = "É necessário declarar ciência da Política de Privacidade.";
  return errors;
}

export function validateSignup(input: SignupInput) {
  return Object.values(validateSignupFields(input))[0] ?? null;
}

export function normalizedSignupMetadata(input: SignupInput) {
  return { registration_source: "student", full_name: input.fullName.trim(), cpf: normalizeCpf(input.cpf), birth_date: input.birthDate };
}

export function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && value <= new Date().toISOString().slice(0, 10);
}
