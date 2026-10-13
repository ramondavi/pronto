"use client";

import { useState } from "react";
import { useInterfaceLanguage } from "./interface-language";

const revealLabel = {
  pt: "Mostrar telefone", en: "Show phone number", es: "Mostrar teléfono", de: "Telefonnummer anzeigen", fr: "Afficher le téléphone", it: "Mostra telefono",
};

export function ProtectedPhone() {
  const { language } = useInterfaceLanguage();
  const [revealed, setRevealed] = useState(false);
  if (!revealed) return <button className="protected-phone" type="button" onClick={() => setRevealed(true)}>{revealLabel[language]}</button>;

  const number = String.fromCharCode(40, 55, 49, 41, 32, 51, 50, 56, 51, 45, 53, 56, 56, 56);
  const dial = `+${[55, 71, 3283, 5888].join("")}`;
  return <a href={`tel:${dial}`}>{number}</a>;
}
