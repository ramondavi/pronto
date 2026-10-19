import type { InterfaceLanguage } from "@/lib/interface-language";

export type RepositoryDepositSetup = { collection: string; documentType: string };

const community = "Faculdade de Arquitetura";

const setups: Record<string, RepositoryDepositSetup> = {
  "ppgau-doctorate": {
    collection: `${community} > Programa de Pós-Graduação em Arquitetura e Urbanismo (PPG-AU) > Tese (PPG-AU)`,
    documentType: "Tese",
  },
  "ppgau-academic-master": {
    collection: `${community} > Programa de Pós-Graduação em Arquitetura e Urbanismo (PPG-AU) > Dissertação (PPG-AU)`,
    documentType: "Dissertação",
  },
  "architecture-urbanism-undergraduate": {
    collection: `${community} > Trabalho Final de Graduação (Graduação) - Arquitetura e Urbanismo (FA)`,
    documentType: "Trabalho de Conclusão de Curso",
  },
  "mp-cecre-master": {
    collection: `${community} > Programa de Pós-Graduação em Conservação e Restauração (CECRE) > Dissertação (CECRE)`,
    documentType: "Dissertação",
  },
  "athdc-specialization": {
    collection: `${community} > Residência em Arquitetura, Urbanismo e Engenharia (RAU+E) > Trabalho de Conclusão de Curso (Especialização) - Assistência Técnica, Habitação e Direito à Cidade (RAU+E)`,
    documentType: "Trabalho de Conclusão de Curso",
  },
};

export function repositoryDepositSetup(code: string, fallback: RepositoryDepositSetup): RepositoryDepositSetup {
  return setups[code] ?? fallback;
}

const accessText = {
  pt: { subject: "Solicitação de liberação para depósito no RI/UFBA", greeting: "Prezada equipe do RI/UFBA,", request: "venho por meio deste solicitar gentilmente a liberação do meu acesso para depositar o trabalho abaixo:", name: "Nome completo", email: "E-mail cadastrado no RI/UFBA", missingEmail: "confirme ou informe o e-mail cadastrado no RI/UFBA", community: "Comunidade", subcommunity: "Subcomunidade", collection: "Coleção", documentType: "Tipo de documento", thanks: "Agradeço a atenção.", closing: "Atenciosamente," },
  en: { subject: "Request for deposit access to RI/UFBA", greeting: "Dear RI/UFBA team,", request: "I would kindly like to request access to deposit the work below:", name: "Full name", email: "Email registered with RI/UFBA", missingEmail: "confirm or enter the email registered with RI/UFBA", community: "Community", subcommunity: "Subcommunity", collection: "Collection", documentType: "Document type", thanks: "Thank you for your attention.", closing: "Kind regards," },
  es: { subject: "Solicitud de acceso para depositar en RI/UFBA", greeting: "Estimado equipo de RI/UFBA:", request: "solicito amablemente que habiliten mi acceso para depositar el siguiente trabajo:", name: "Nombre completo", email: "Correo registrado en RI/UFBA", missingEmail: "confirme o indique el correo registrado en RI/UFBA", community: "Comunidad", subcommunity: "Subcomunidad", collection: "Colección", documentType: "Tipo de documento", thanks: "Agradezco su atención.", closing: "Atentamente," },
  de: { subject: "Antrag auf Freischaltung zur Einreichung im RI/UFBA", greeting: "Sehr geehrtes RI/UFBA-Team,", request: "ich bitte Sie freundlich, meinen Zugang für die Einreichung der folgenden Arbeit freizuschalten:", name: "Vollständiger Name", email: "Bei RI/UFBA registrierte E-Mail-Adresse", missingEmail: "bei RI/UFBA registrierte E-Mail-Adresse bestätigen oder eingeben", community: "Community", subcommunity: "Subcommunity", collection: "Sammlung", documentType: "Dokumenttyp", thanks: "Vielen Dank für Ihre Unterstützung.", closing: "Mit freundlichen Grüßen," },
  fr: { subject: "Demande d'accès au dépôt dans RI/UFBA", greeting: "Chère équipe du RI/UFBA,", request: "je vous prie de bien vouloir autoriser mon accès pour déposer le travail suivant :", name: "Nom complet", email: "Adresse e-mail enregistrée auprès du RI/UFBA", missingEmail: "confirmer ou indiquer l'adresse e-mail enregistrée auprès du RI/UFBA", community: "Communauté", subcommunity: "Sous-communauté", collection: "Collection", documentType: "Type de document", thanks: "Je vous remercie de votre attention.", closing: "Cordialement," },
  it: { subject: "Richiesta di accesso per il deposito nel RI/UFBA", greeting: "Gentile team del RI/UFBA,", request: "chiedo cortesemente l'abilitazione del mio accesso per depositare il seguente lavoro:", name: "Nome completo", email: "E-mail registrata presso il RI/UFBA", missingEmail: "confermare o indicare l'e-mail registrata presso il RI/UFBA", community: "Comunità", subcommunity: "Sottocomunità", collection: "Collezione", documentType: "Tipo di documento", thanks: "Vi ringrazio per l'attenzione.", closing: "Cordiali saluti," },
} satisfies Record<InterfaceLanguage, Record<string, string>>;

export function repositoryAccessText(language: InterfaceLanguage = "pt") { return accessText[language]; }

export function repositoryAccessSubject(name: string, language: InterfaceLanguage = "pt"): string {
  return `${repositoryAccessText(language).subject} - ${name}`;
}

export function repositoryAccessItems(name: string, email: string, setup: RepositoryDepositSetup, language: InterfaceLanguage = "pt"): string[] {
  const parts = setup.collection.split(" > ");
  const text = repositoryAccessText(language);
  return [
    `${text.name}: ${name}`,
    `${text.email}: ${email || `[${text.missingEmail}]`}`,
    `${text.community}: ${parts[0]}`,
    ...(parts.length > 2 ? [`${text.subcommunity}: ${parts[1]}`] : []),
    `${text.collection}: ${parts.at(-1)}`,
    `${text.documentType}: ${setup.documentType}`,
  ];
}

export function repositoryAccessEmail(name: string, email: string, setup: RepositoryDepositSetup, language: InterfaceLanguage = "pt"): string {
  const text = repositoryAccessText(language);
  return `${text.greeting}\n\n${text.request}\n\n${repositoryAccessItems(name, email, setup, language).map((item) => `• ${item}`).join("\n")}\n\n${text.thanks}\n\n${text.closing}\n${name}`;
}

export function repositoryAccessEmailHtml(name: string, email: string, setup: RepositoryDepositSetup, language: InterfaceLanguage = "pt"): string {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const text = repositoryAccessText(language);
  const items = repositoryAccessItems(name, email, setup, language).map((item) => `<li>${escape(item)}</li>`).join("");
  return `<p>${escape(text.greeting)}</p><p>${escape(text.request)}</p><ul>${items}</ul><p>${escape(text.thanks)}</p><p>${escape(text.closing)}<br>${escape(name)}</p>`;
}
