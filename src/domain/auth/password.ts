const specialCharacters = new Set(Array.from("!@#$%^&*()_+-=[]{};'\":|<>?,./`~\\"));

export function passwordRequirements(password: string) {
  return {
    minLength: password.length >= 8,
    uppercase: /\p{Lu}/u.test(password),
    number: /[0-9]/.test(password),
    special: Array.from(password).some((character) => specialCharacters.has(character)),
  };
}

export function validatePassword(password: string) {
  const requirements = passwordRequirements(password);
  if (!requirements.minLength) return "A senha deve ter pelo menos 8 caracteres.";
  if (!requirements.uppercase) return "A senha deve ter pelo menos uma letra maiúscula.";
  if (!requirements.number) return "A senha deve ter pelo menos um número.";
  if (!requirements.special) return "A senha deve ter pelo menos um caractere especial.";
  return null;
}
