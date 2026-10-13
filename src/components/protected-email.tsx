"use client";

import { useState } from "react";
import { useInterfaceLanguage } from "./interface-language";

const localParts = {
  library: [98, 105, 98, 97, 114, 113],
  privacy: [112, 114, 105, 118, 97, 99, 105, 100, 97, 100, 101],
} as const;
const domain = [117, 102, 98, 97, 46, 98, 114] as const;
const revealLabel = {
  pt: "Mostrar e-mail", en: "Show email", es: "Mostrar correo", de: "E-Mail anzeigen", fr: "Afficher l’adresse", it: "Mostra e-mail",
};

export function ProtectedEmail({ recipient }: { recipient: keyof typeof localParts }) {
  const { language } = useInterfaceLanguage();
  const [revealed, setRevealed] = useState(false);
  if (!revealed) return <button className="protected-email" type="button" onClick={() => setRevealed(true)}>{revealLabel[language]}</button>;

  const address = `${String.fromCharCode(...localParts[recipient])}@${String.fromCharCode(...domain)}`;
  return <a href={`mailto:${address}`}>{address}</a>;
}
