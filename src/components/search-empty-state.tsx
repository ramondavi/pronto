import { AppIcon } from "@/components/app-icon";
import type { InterfaceLanguage } from "@/lib/interface-language";

const copy: Record<InterfaceLanguage, { title: string; spelling: string; fewer: string; panel: string; help: string }> = {
  pt: { title: "Este resultado se escondeu entre as estantes.", spelling: "Confira a grafia e os acentos.", fewer: "Tente menos palavras ou um termo mais geral.", panel: "Busque também por protocolo, pessoa, assunto ou configuração.", help: "Experimente termos como ficha, correção ou autodepósito." },
  en: { title: "This result is hiding between the shelves.", spelling: "Check spelling and accents.", fewer: "Try fewer words or a broader term.", panel: "You can also search by protocol, person, subject or setting.", help: "Try terms such as cataloging card, correction or deposit." },
  es: { title: "Este resultado se escondió entre los estantes.", spelling: "Revise la ortografía y los acentos.", fewer: "Pruebe con menos palabras o un término más general.", panel: "También puede buscar por protocolo, persona, asunto o configuración.", help: "Pruebe términos como ficha, corrección o autodepósito." },
  de: { title: "Dieses Ergebnis versteckt sich zwischen den Regalen.", spelling: "Prüfen Sie Schreibweise und Akzente.", fewer: "Versuchen Sie weniger Wörter oder einen allgemeineren Begriff.", panel: "Suchen Sie auch nach Vorgang, Person, Thema oder Einstellung.", help: "Versuchen Sie Begriffe wie Katalogkarte oder Korrektur." },
  fr: { title: "Ce résultat se cache entre les rayons.", spelling: "Vérifiez l’orthographe et les accents.", fewer: "Essayez moins de mots ou un terme plus général.", panel: "Recherchez aussi un protocole, une personne, un sujet ou un réglage.", help: "Essayez des termes comme fiche, correction ou dépôt." },
  it: { title: "Questo risultato si nasconde tra gli scaffali.", spelling: "Controlla l’ortografia e gli accenti.", fewer: "Prova con meno parole o un termine più generale.", panel: "Cerca anche per protocollo, persona, argomento o impostazione.", help: "Prova termini come scheda, correzione o deposito." },
};

export function SearchEmptyState({ language = "pt", scope }: { language?: InterfaceLanguage; scope: "panel" | "help" }) {
  const text = copy[language];
  return <div className="search-empty-state"><span className="search-empty-state__icon" aria-hidden="true"><AppIcon name="search" /></span><div className="search-empty-state__content"><strong>{text.title}</strong><ul><li><AppIcon name="edit" />{text.spelling}</li><li><AppIcon name="search" />{text.fewer}</li><li><AppIcon name={scope === "panel" ? "compass" : "book"} />{text[scope]}</li></ul></div></div>;
}
