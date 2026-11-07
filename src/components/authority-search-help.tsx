"use client";

import { useId, useRef } from "react";
import { AppIcon } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { useInterfaceLanguage } from "./interface-language";

const copy = {
  pt: { prompt: "Combine palavras e refine a busca. Maiúsculas, minúsculas e acentos não alteram os resultados.", open: "Como pesquisar?", title: "Como pesquisar temas", expressions: "Construa uma busca avançada", filters: "Combine uma busca rápida com filtros", example: "Exemplo", result: "O que acontece", close: "Fechar ajuda", rows: [
    ["Palavra ou lugar", "habitação", "Encontra registros que contêm a palavra, inclusive em variantes."], ["Expressão exata", '"habitação social"', "Mantém as palavras juntas e nessa ordem."], ["AND", "habitação AND Salvador", "Exige as duas expressões no mesmo registro."], ["OR", "habitação OR patrimônio", "Aceita registros com qualquer uma das expressões."], ["NOT", "habitação NOT rural", "Exclui registros que contêm a expressão seguinte."], ["* Vários caracteres", "urban*", "Encontra urbanismo, urbano e outras continuações."], ["? Um caractere", "urban?", "Encontra urbano ou urbana, com uma letra no lugar de ?."], ["Coordenadas", "-12.9711, -38.5108", "Busca pontos revisados a até 100 metros destas coordenadas."]
  ], filterRows: [
    ["Fonte", "Biblioteca Nacional + habitação", "Limita aos registros publicados dessa fonte."], ["Tipo de tema", "Lugar + Salvador", "Mostra somente lugares, sem misturá-los com recortes geográficos."], ["Idioma", "Inglês + housing", "Exige uma forma registrada nesse idioma."], ["Relação", "Associativa + habitação", "Mostra apenas registros com essa relação."], ["Ordenação", "Título A–Z + patrimônio", "Reorganiza os resultados encontrados."]
  ] },
  en: { prompt: "Combine words and refine your search. Capitalization and accents do not affect results.", open: "How to search?", title: "How to search themes", expressions: "Build an advanced search", filters: "Combine a quick search with filters", example: "Example", result: "What happens", close: "Close help", rows: [
    ["Word or place", "housing", "Finds records containing the word, including variants."], ["Exact phrase", '"social housing"', "Keeps the words together in this order."], ["AND", "housing AND Salvador", "Requires both expressions in one record."], ["OR", "housing OR heritage", "Accepts either expression."], ["NOT", "housing NOT rural", "Excludes records containing the next expression."], ["* Multiple characters", "urban*", "Finds urbanism, urban and other endings."], ["? One character", "urban?", "Matches one character after urban, as in urbane or urbans."], ["Coordinates", "-12.9711, -38.5108", "Finds reviewed points within 100 metres."]
  ], filterRows: [
    ["Source", "Biblioteca Nacional + housing", "Limits results to this published source."], ["Theme type", "Place + Salvador", "Shows places without mixing in geographic subdivisions."], ["Language", "English + housing", "Requires a recorded form in that language."], ["Relation", "Related + housing", "Shows records with that relation."], ["Sort", "Title A–Z + heritage", "Reorders the matching results."]
  ] },
  es: { prompt: "Combina palabras y afina la búsqueda. Las mayúsculas, minúsculas y tildes no cambian los resultados.", open: "¿Cómo buscar?", title: "Cómo buscar temas", expressions: "Construye una búsqueda avanzada", filters: "Combina una búsqueda rápida con filtros", example: "Ejemplo", result: "Qué sucede", close: "Cerrar ayuda", rows: [
    ["Palabra o lugar", "vivienda", "Encuentra registros con la palabra, incluso en variantes."], ["Frase exacta", '"vivienda social"', "Mantiene las palabras juntas y en ese orden."], ["AND", "vivienda AND Salvador", "Exige ambas expresiones."], ["OR", "vivienda OR patrimonio", "Acepta cualquiera de las dos."], ["NOT", "vivienda NOT rural", "Excluye los registros con la expresión siguiente."], ["* Varios caracteres", "urban*", "Encuentra urbanismo, urbano y otras terminaciones."], ["? Un carácter", "urban?", "Encuentra urbano o urbana sustituyendo una letra."], ["Coordenadas", "-12.9711, -38.5108", "Busca puntos revisados a menos de 100 metros."]
  ], filterRows: [
    ["Fuente", "Biblioteca Nacional + vivienda", "Limita los registros publicados a esa fuente."], ["Tipo de tema", "Lugar + Salvador", "Muestra lugares sin mezclarlos con subdivisiones geográficas."], ["Idioma", "Inglés + housing", "Exige una forma registrada en ese idioma."], ["Relación", "Asociativa + vivienda", "Muestra registros con esa relación."], ["Orden", "Título A–Z + patrimonio", "Reordena los resultados."]
  ] },
  de: { prompt: "Wörter kombinieren und Suche verfeinern. Groß- und Kleinschreibung sowie Akzente ändern die Ergebnisse nicht.", open: "Wie suchen?", title: "Themen suchen", expressions: "Erweiterte Suche erstellen", filters: "Schnellsuche mit Filtern kombinieren", example: "Beispiel", result: "Ergebnis", close: "Hilfe schließen", rows: [
    ["Wort oder Ort", "Wohnungsbau", "Findet das Wort auch in Varianten."], ["Genaue Wortfolge", '"sozialer Wohnungsbau"', "Sucht die Wörter gemeinsam in dieser Reihenfolge."], ["AND", "Wohnungsbau AND Salvador", "Verlangt beide Ausdrücke."], ["OR", "Wohnungsbau OR Kulturerbe", "Akzeptiert einen der Ausdrücke."], ["NOT", "Wohnungsbau NOT rural", "Schließt den folgenden Ausdruck aus."], ["* Mehrere Zeichen", "urban*", "Findet Urbanismus, urban und weitere Endungen."], ["? Ein Zeichen", "urban?", "Findet urban oder urban mit einem Ersatzbuchstaben."], ["Koordinaten", "-12.9711, -38.5108", "Findet geprüfte Punkte im Umkreis von 100 Metern."]
  ], filterRows: [
    ["Quelle", "Biblioteca Nacional + Wohnungsbau", "Beschränkt auf veröffentlichte Einträge dieser Quelle."], ["Thementyp", "Ort + Salvador", "Zeigt Orte getrennt von geografischen Unterteilungen."], ["Sprache", "Englisch + housing", "Erfordert eine Form in dieser Sprache."], ["Beziehung", "Verwandt + Wohnungsbau", "Zeigt Einträge mit dieser Beziehung."], ["Sortierung", "Titel A–Z + Kulturerbe", "Ordnet die Ergebnisse neu."]
  ] },
  fr: { prompt: "Combinez des mots et affinez la recherche. Les majuscules, minuscules et accents ne changent pas les résultats.", open: "Comment chercher ?", title: "Comment chercher des thèmes", expressions: "Construire une recherche avancée", filters: "Combiner une recherche rapide avec des filtres", example: "Exemple", result: "Effet", close: "Fermer l’aide", rows: [
    ["Mot ou lieu", "logement", "Trouve le mot, y compris dans les variantes."], ["Expression exacte", '"logement social"', "Garde les mots ensemble dans cet ordre."], ["AND", "logement AND Salvador", "Exige les deux expressions."], ["OR", "logement OR patrimoine", "Accepte l’une ou l’autre."], ["NOT", "logement NOT rural", "Exclut l’expression suivante."], ["* Plusieurs caractères", "urban*", "Trouve urbanisme, urbain et d’autres terminaisons."], ["? Un caractère", "urban?", "Trouve urbain ou urbaine avec une lettre remplacée."], ["Coordonnées", "-12.9711, -38.5108", "Trouve les points vérifiés à moins de 100 mètres."]
  ], filterRows: [
    ["Source", "Biblioteca Nacional + logement", "Limite aux notices publiées de cette source."], ["Type de thème", "Lieu + Salvador", "Affiche les lieux séparément des subdivisions géographiques."], ["Langue", "Anglais + housing", "Exige une forme enregistrée dans cette langue."], ["Relation", "Associée + logement", "Affiche les notices avec cette relation."], ["Tri", "Titre A–Z + patrimoine", "Réorganise les résultats."]
  ] },
  it: { prompt: "Combina parole e affina la ricerca. Maiuscole, minuscole e accenti non cambiano i risultati.", open: "Come cercare?", title: "Come cercare i temi", expressions: "Crea una ricerca avanzata", filters: "Combina una ricerca rapida con i filtri", example: "Esempio", result: "Cosa succede", close: "Chiudi guida", rows: [
    ["Parola o luogo", "edilizia", "Trova la parola anche nelle varianti."], ["Frase esatta", '"edilizia sociale"', "Mantiene le parole unite e in quest’ordine."], ["AND", "edilizia AND Salvador", "Richiede entrambe le espressioni."], ["OR", "edilizia OR patrimonio", "Accetta una delle espressioni."], ["NOT", "edilizia NOT rural", "Esclude l’espressione successiva."], ["* Più caratteri", "urban*", "Trova urbanistica, urbano e altre terminazioni."], ["? Un carattere", "urban?", "Trova urbano o urbana sostituendo una lettera."], ["Coordinate", "-12.9711, -38.5108", "Trova i punti verificati entro 100 metri."]
  ], filterRows: [
    ["Fonte", "Biblioteca Nacional + edilizia", "Limita ai record pubblicati di questa fonte."], ["Tipo di tema", "Luogo + Salvador", "Mostra i luoghi separatamente dalle suddivisioni geografiche."], ["Lingua", "Inglese + housing", "Richiede una forma registrata in quella lingua."], ["Relazione", "Associata + edilizia", "Mostra record con questa relazione."], ["Ordinamento", "Titolo A–Z + patrimonio", "Riordina i risultati."]
  ] },
} as const;

const filterInstructions = {
  pt: { selected: "Selecione no filtro", searched: "Digite na busca" },
  en: { selected: "Choose in the filter", searched: "Type in search" },
  es: { selected: "Selecciona en el filtro", searched: "Escribe en la búsqueda" },
  de: { selected: "Im Filter wählen", searched: "In die Suche eingeben" },
  fr: { selected: "Choisir dans le filtre", searched: "Saisir dans la recherche" },
  it: { selected: "Seleziona nel filtro", searched: "Scrivi nella ricerca" },
} as const;
const filterIcons = ["document", "tag", "globe", "hierarchy", "search"] as const;
const expressionIcons = ["search", "document", "hierarchy", "hierarchy", "hierarchy", "tag", "tag", "globe"] as const;

export function AuthoritySearchHelp() {
  const { language } = useInterfaceLanguage();
  const t = copy[language];
  const instructions = filterInstructions[language];
  const dialog = useRef<HTMLDialogElement>(null);
  const filters = useRef<HTMLDetailsElement>(null);
  const advanced = useRef<HTMLDetailsElement>(null);
  const titleId = useId();
  return <div className="authority-search-help">
    <p>{t.prompt}</p><button type="button" onClick={() => { if (filters.current) filters.current.open = false; if (advanced.current) advanced.current.open = false; dialog.current?.showModal(); }} aria-haspopup="dialog"><AppIcon name="help" />{t.open}</button>
    <dialog ref={dialog} className="pronto-modal authority-search-help__dialog" aria-labelledby={titleId} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <header className="catalogue-modal__header"><div><p className="eyebrow">{t.open}</p><h2 id={titleId}><AppIcon name="help" />{t.title}</h2></div><ModalCloseButton label={t.close} onClick={() => dialog.current?.close()} /></header>
      <div className="authority-search-help__body">
        <details ref={filters} name="authority-search-help-sections" className="authority-search-help__section" onToggle={(event) => { if (event.currentTarget.open && advanced.current) advanced.current.open = false; }}><summary><AppIcon name="settings" /><span>{t.filters}</span><AppIcon name="chevronDown" /></summary><div className="authority-search-help__examples authority-search-help__examples--filters">{t.filterRows.map(([label, example, description], index) => { const [selected, searched] = example.split(" + "); return <article key={label}><h3><AppIcon name={filterIcons[index] ?? "tag"} />{label}</h3><div className="authority-search-help__filter-example"><span>{instructions.selected}<strong>{selected}</strong></span><span>{instructions.searched}<code>{searched}</code></span></div><p>{description}</p></article>; })}</div></details>
        <details ref={advanced} name="authority-search-help-sections" className="authority-search-help__section" onToggle={(event) => { if (event.currentTarget.open && filters.current) filters.current.open = false; }}><summary><AppIcon name="search" /><span>{t.expressions}</span><AppIcon name="chevronDown" /></summary><div className="authority-search-help__examples">{t.rows.map(([label, example, description], index) => <article key={label}><h3><AppIcon name={expressionIcons[index] ?? "search"} />{label}</h3><code>{example}</code><p>{description}</p></article>)}</div></details>
      </div>
    </dialog>
  </div>;
}
