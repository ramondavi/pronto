import type { InterfaceLanguage } from "@/lib/interface-language";

type HelpCopy = { center: string; title: string; intro: string; faq: string; faqTitle: string; articles: string; articleTitle: string; read: string; contact: string; contactTitle: string; contactIntro: string; search: string; compactSearch: string; placeholder: string; noResults: string };
export const helpCopy: Record<InterfaceLanguage, HelpCopy> = {
  pt: { center: "Central de ajuda", title: "Encontre a orientação certa.", intro: "Pesquise perguntas, respostas e artigos completos sobre cada etapa.", faq: "Perguntas frequentes", faqTitle: "O que mais perguntam", articles: "Artigos de ajuda", articleTitle: "Guias completos", read: "Ler artigo →", contact: "Fale com a Biblioteca", contactTitle: "Ainda precisa de orientação?", contactIntro: "Para dúvidas sobre o uso do Pronto!, entre em contato com a BIB/FA.", search: "Encontre uma resposta", compactSearch: "Dúvida durante o preenchimento?", placeholder: "Pesquise dúvidas, perguntas ou artigos", noResults: "Nenhum resultado encontrado." },
  en: { center: "Help center", title: "Find the right guidance.", intro: "Search questions, answers and complete articles about each step.", faq: "Frequently asked questions", faqTitle: "Popular questions", articles: "Help articles", articleTitle: "Complete guides", read: "Read article →", contact: "Contact the library", contactTitle: "Need more guidance?", contactIntro: "For questions about using Pronto!, contact BIB/FA.", search: "Find an answer", compactSearch: "Need help filling this in?", placeholder: "Search questions or articles", noResults: "No results found." },
  es: { center: "Centro de ayuda", title: "Encuentre la orientación adecuada.", intro: "Busque preguntas, respuestas y artículos completos sobre cada etapa.", faq: "Preguntas frecuentes", faqTitle: "Preguntas habituales", articles: "Artículos de ayuda", articleTitle: "Guías completas", read: "Leer artículo →", contact: "Contacte a la biblioteca", contactTitle: "¿Necesita más orientación?", contactIntro: "Para dudas sobre Pronto!, contacte a BIB/FA.", search: "Encuentre una respuesta", compactSearch: "¿Dudas al rellenar?", placeholder: "Busque preguntas o artículos", noResults: "No se encontraron resultados." },
  de: { center: "Hilfe", title: "Finden Sie die passende Anleitung.", intro: "Suchen Sie Fragen, Antworten und ausführliche Artikel zu jedem Schritt.", faq: "Häufige Fragen", faqTitle: "Häufig gestellt", articles: "Hilfeartikel", articleTitle: "Ausführliche Anleitungen", read: "Artikel lesen →", contact: "Bibliothek kontaktieren", contactTitle: "Benötigen Sie weitere Hilfe?", contactIntro: "Bei Fragen zu Pronto! wenden Sie sich an BIB/FA.", search: "Antwort finden", compactSearch: "Fragen beim Ausfüllen?", placeholder: "Fragen oder Artikel suchen", noResults: "Keine Ergebnisse gefunden." },
  fr: { center: "Centre d’aide", title: "Trouvez la bonne information.", intro: "Recherchez des questions, réponses et articles complets sur chaque étape.", faq: "Questions fréquentes", faqTitle: "Questions courantes", articles: "Articles d’aide", articleTitle: "Guides complets", read: "Lire l’article →", contact: "Contacter la bibliothèque", contactTitle: "Besoin d’aide supplémentaire ?", contactIntro: "Pour toute question sur Pronto!, contactez la BIB/FA.", search: "Trouver une réponse", compactSearch: "Besoin d’aide pour remplir ?", placeholder: "Rechercher des questions ou articles", noResults: "Aucun résultat trouvé." },
  it: { center: "Centro assistenza", title: "Trova le indicazioni giuste.", intro: "Cerca domande, risposte e articoli completi per ogni fase.", faq: "Domande frequenti", faqTitle: "Domande più comuni", articles: "Articoli di assistenza", articleTitle: "Guide complete", read: "Leggi l’articolo →", contact: "Contatta la biblioteca", contactTitle: "Hai bisogno di altre indicazioni?", contactIntro: "Per domande sull’uso di Pronto!, contatta BIB/FA.", search: "Trova una risposta", compactSearch: "Dubbi durante la compilazione?", placeholder: "Cerca domande o articoli", noResults: "Nessun risultato trovato." },
};

const categories: Record<InterfaceLanguage, Record<string, string>> = {
  pt: {},
  en: { Geral: "General", Solicitação: "Request", Análise: "Review", Ficha: "Catalog record", Autodepósito: "Self-deposit", Atendimento: "Service", Administração: "Administration" },
  es: { Geral: "General", Solicitação: "Solicitud", Análise: "Revisión", Ficha: "Ficha catalográfica", Autodepósito: "Autodepósito", Atendimento: "Atención", Administração: "Administración" },
  de: { Geral: "Allgemein", Solicitação: "Anfrage", Análise: "Prüfung", Ficha: "Katalogeintrag", Autodepósito: "Selbsteinreichung", Atendimento: "Bearbeitung", Administração: "Verwaltung" },
  fr: { Geral: "Général", Solicitação: "Demande", Análise: "Examen", Ficha: "Notice", Autodepósito: "Auto-dépôt", Atendimento: "Service", Administração: "Administration" },
  it: { Geral: "Generale", Solicitação: "Richiesta", Análise: "Revisione", Ficha: "Scheda", Autodepósito: "Autodeposito", Atendimento: "Assistenza", Administração: "Amministrazione" },
};
export function helpCategoryLabel(language: InterfaceLanguage, category: string) { return categories[language][category] ?? category; }

const kinds: Record<InterfaceLanguage, Record<string, string>> = {
  pt: {},
  en: { "Dúvida rápida": "Quick answer", "Pergunta frequente": "Frequently asked question", "Artigo de ajuda": "Help article" },
  es: { "Dúvida rápida": "Respuesta rápida", "Pergunta frequente": "Pregunta frecuente", "Artigo de ajuda": "Artículo de ayuda" },
  de: { "Dúvida rápida": "Kurze Antwort", "Pergunta frequente": "Häufige Frage", "Artigo de ajuda": "Hilfeartikel" },
  fr: { "Dúvida rápida": "Réponse rapide", "Pergunta frequente": "Question fréquente", "Artigo de ajuda": "Article d’aide" },
  it: { "Dúvida rápida": "Risposta rapida", "Pergunta frequente": "Domanda frequente", "Artigo de ajuda": "Articolo di assistenza" },
};
export function helpKindLabel(language: InterfaceLanguage, kind: string) { return kinds[language][kind] ?? kind; }
