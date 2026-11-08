import type { AppIconName } from "@/components/app-icon";
import type { InterfaceLanguage } from "./interface-language";
import { uiText } from "./ui-text";

type Labels = Record<InterfaceLanguage, string>;
export type PublicInterfaceReference = { key: string; group: string; labels: Labels; icon?: AppIconName };
const form = (key: string, group: string, labels: Labels): PublicInterfaceReference => ({ key: `student-${key}`, group, labels });
const page = (key: string, label: string, icon: AppIconName): PublicInterfaceReference => ({
  key: `student-${key}`, group: "Painel do estudante", icon,
  labels: { pt: label, en: uiText("en", label), es: uiText("es", label), de: uiText("de", label), fr: uiText("fr", label), it: uiText("it", label) },
});
const control = (key: string, label: string, group: string, icon?: AppIconName): PublicInterfaceReference => ({
  key: `student-${key}`, group, icon,
  labels: { pt: label, en: uiText("en", label), es: uiText("es", label), de: uiText("de", label), fr: uiText("fr", label), it: uiText("it", label) },
});

// Rótulos retirados das seis versões de uiCopy no formulário de solicitação.
export const publicInterfaceReferences: PublicInterfaceReference[] = [
  page("requests", "Minhas solicitações", "request"),
  page("new-request", "Nova solicitação", "document"),
  page("correct-request", "Corrigir solicitação", "edit"),
  page("deposit", "Autodepósito", "upload"),
  control("nada-section", "Envio do Nada Consta", "Minhas solicitações", "document"),
  control("nada-select", "Escolher PDF", "Envio do Nada Consta", "upload"),
  control("nada-send", "Enviar Nada Consta", "Envio do Nada Consta", "upload"),
  control("nada-pending", "Em conferência pela biblioteca", "Envio do Nada Consta"),
  control("nada-approved", "Documento validado", "Envio do Nada Consta"),
  control("deposit-open", "Acessar guia do RI/UFBA", "Autodepósito", "arrowRight"),
  control("deposit-start", "Começar o guia do autodepósito", "Autodepósito", "upload"),
  control("deposit-review", "Rever preparação para depositar", "Autodepósito", "undo"),
  control("deposit-data", "Dados para copiar e conferir", "Autodepósito", "copy"),
  control("deposit-steps", "O que fazer no RI", "Autodepósito", "hierarchy"),
  control("deposit-confirm", "Confirmo que enviei o trabalho ao RI/UFBA", "Autodepósito", "upload"),
  control("correction-requested", "Correção solicitada", "Minhas solicitações"),
  control("correct-pending", "Corrigir campo pendente", "Minhas solicitações", "edit"),
  control("correct-pending-many", "Corrigir campos pendentes", "Minhas solicitações", "edit"),
  control("resubmit-correction", "Reenviar correção", "Corrigir solicitação", "upload"),
  control("resubmit-corrections", "Reenviar correções", "Corrigir solicitação", "upload"),
  control("correction-guidance", "Orientação da biblioteca", "Corrigir solicitação"),
  control("correction-note", "Observação complementar", "Corrigir solicitação"),
  form("step-affiliation", "Nova solicitação · Etapas", { pt: "Vínculo acadêmico", en: "Academic affiliation", es: "Vínculo académico", de: "Studienzugehörigkeit", fr: "Parcours académique", it: "Percorso accademico" }),
  form("step-description", "Nova solicitação · Etapas", { pt: "Descrição do trabalho", en: "Work description", es: "Descripción del trabajo", de: "Beschreibung der Arbeit", fr: "Description du travail", it: "Descrizione del lavoro" }),
  form("step-keywords", "Nova solicitação · Etapas", { pt: "Palavras-chave", en: "Keywords", es: "Palabras clave", de: "Schlagwörter", fr: "Mots-clés", it: "Parole chiave" }),
  form("step-file", "Nova solicitação · Etapas", { pt: "Arquivo e declarações", en: "File and declarations", es: "Archivo y declaraciones", de: "Datei und Erklärungen", fr: "Fichier et déclarations", it: "File e dichiarazioni" }),
  form("step-review", "Nova solicitação · Etapas", { pt: "Revisão", en: "Review", es: "Revisión", de: "Überprüfung", fr: "Vérification", it: "Revisione" }),
  form("program", "Nova solicitação · Vínculo acadêmico", { pt: "Curso ou programa", en: "Academic program", es: "Programa académico", de: "Studiengang", fr: "Programme académique", it: "Corso o programma" }),
  form("registration", "Nova solicitação · Vínculo acadêmico", { pt: "Matrícula atual", en: "Current student ID", es: "Matrícula actual", de: "Aktuelle Matrikelnummer", fr: "Numéro d'étudiant actuel", it: "Matricola attuale" }),
  form("author", "Nova solicitação · Descrição do trabalho", { pt: "Autor", en: "Author", es: "Autor", de: "Verfasser", fr: "Auteur", it: "Autore" }),
  form("original-title", "Nova solicitação · Descrição do trabalho", { pt: "Título no idioma original", en: "Title in the original language", es: "Título en el idioma original", de: "Titel in der Originalsprache", fr: "Titre dans la langue originale", it: "Titolo nella lingua originale" }),
  form("original-language", "Nova solicitação · Descrição do trabalho", { pt: "Idioma original do trabalho", en: "Original language of the work", es: "Idioma original del trabajo", de: "Originalsprache der Arbeit", fr: "Langue originale du travail", it: "Lingua originale del lavoro" }),
  form("advisor", "Nova solicitação · Descrição do trabalho", { pt: "Orientador", en: "Advisor", es: "Director", de: "Betreuer", fr: "Directeur", it: "Relatore" }),
  form("keywords", "Nova solicitação · Palavras-chave", { pt: "Palavras-chave", en: "Keywords", es: "Palabras clave", de: "Schlagwörter", fr: "Mots-clés", it: "Parole chiave" }),
  form("public-link", "Nova solicitação · Arquivo e declarações", { pt: "Link público do trabalho completo", en: "Public link to the complete work", es: "Enlace público al trabajo completo", de: "Öffentlicher Link zur vollständigen Arbeit", fr: "Lien public vers le travail complet", it: "Link pubblico al lavoro completo" }),
  form("send", "Nova solicitação · Revisão", { pt: "Enviar solicitação", en: "Submit request", es: "Enviar solicitud", de: "Antrag senden", fr: "Envoyer la demande", it: "Invia richiesta" }),
];

export const publicInterfaceReferenceByKey = new Map(publicInterfaceReferences.map((reference) => [reference.key, reference]));
