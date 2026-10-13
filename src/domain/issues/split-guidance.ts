const legacyStandardMessages = [
  "Preencha este campo obrigatório.",
  "A informação não corresponde ao documento apresentado. Confira e corrija.",
  "Informe o nome exatamente como aparece na folha de rosto.",
  "O link não está acessível publicamente. Ajuste a permissão e teste em uma janela anônima.",
  "Complete a informação conforme a orientação deste campo.",
  "Ajuste a formatação ou padronização deste campo.",
];

export function splitGuidance(value: string) {
  const marker = /\s*Observação complementar\s*:\s*/i.exec(value);
  if (marker?.index !== undefined) return { standard: value.slice(0, marker.index).trim(), observation: value.slice(marker.index + marker[0].length).trim() };
  const legacyMessage = legacyStandardMessages.find((message) => value.startsWith(message) && value.slice(message.length).trim());
  if (legacyMessage) return { standard: legacyMessage, observation: value.slice(legacyMessage.length).trim() };
  return { standard: value.trim(), observation: "" };
}
