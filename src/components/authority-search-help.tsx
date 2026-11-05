"use client";

import { useId, useRef } from "react";
import { AppIcon } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { useInterfaceLanguage } from "./interface-language";

const copy = {
  pt: { prompt: "Combine palavras e refine a busca.", open: "Como pesquisar?", title: "Como pesquisar temas", intro: "Digite para ver uma prévia dos resultados. Use Buscar tema para aplicar a expressão completa e os filtros selecionados.", expressions: "Escreva sua busca", filters: "Combine com filtros", example: "Exemplo", result: "O que acontece", close: "Fechar ajuda", rows: [
    ["Palavra ou lugar", "habitação", "Encontra registros que contêm a palavra, inclusive em variantes."], ["Expressão exata", '"habitação social"', "Mantém as palavras juntas e nessa ordem."], ["AND", "habitação AND Salvador", "Exige as duas expressões no mesmo registro."], ["OR", "habitação OR patrimônio", "Aceita registros com qualquer uma das expressões."], ["NOT", "habitação NOT rural", "Exclui registros que contêm a expressão seguinte."], ["* Vários caracteres", "urban*", "Encontra urbanismo, urbano e outras continuações."], ["? Um caractere", "urban?", "Encontra urbano ou urbana, com uma letra no lugar de ?."], ["Coordenadas", "-12.9711, -38.5108", "Busca pontos revisados a até 100 metros destas coordenadas."]
  ], filterRows: [
    ["Fonte", "Biblioteca Nacional + habitação", "Limita aos registros publicados dessa fonte."], ["Tipo de autoridade", "151 · Lugar + Salvador", "Limita ao tipo MARC escolhido; 181 identifica subdivisões geográficas."], ["Idioma", "Inglês + housing", "Exige uma forma registrada nesse idioma."], ["Relação", "Associativa + habitação", "Mostra apenas registros com essa relação."], ["Ordenação", "Título A–Z + patrimônio", "Reorganiza os resultados encontrados."]
  ] },
  en: { prompt: "Combine words and refine your search.", open: "How to search?", title: "How to search themes", intro: "Type to preview results. Select Search themes to apply the full expression and chosen filters.", expressions: "Write your search", filters: "Combine with filters", example: "Example", result: "What happens", close: "Close help", rows: [
    ["Word or place", "habitação", "Finds records containing the word, including variants."], ["Exact phrase", '"habitação social"', "Keeps the words together in this order."], ["AND", "habitação AND Salvador", "Requires both expressions in one record."], ["OR", "habitação OR patrimônio", "Accepts either expression."], ["NOT", "habitação NOT rural", "Excludes records containing the next expression."], ["* Multiple characters", "urban*", "Finds urbanismo, urbano and other endings."], ["? One character", "urban?", "Finds urbano or urbana with one letter replacing ?."], ["Coordinates", "-12.9711, -38.5108", "Finds reviewed points within 100 metres."]
  ], filterRows: [
    ["Source", "Biblioteca Nacional + habitação", "Limits results to this published source."], ["Authority type", "151 · Lugar + Salvador", "Limits results to the MARC type; 181 is a geographic subdivision."], ["Language", "English + housing", "Requires a recorded form in that language."], ["Relation", "Related + habitação", "Shows records with that relation."], ["Sort", "Title A–Z + patrimônio", "Reorders the matching results."]
  ] },
  es: { prompt: "Combina palabras y afina la búsqueda.", open: "¿Cómo buscar?", title: "Cómo buscar temas", intro: "Escribe para ver una vista previa. Pulsa Buscar temas para aplicar la expresión completa y los filtros.", expressions: "Escribe tu búsqueda", filters: "Combina con filtros", example: "Ejemplo", result: "Qué sucede", close: "Cerrar ayuda", rows: [
    ["Palabra o lugar", "habitação", "Encuentra registros con la palabra, incluso en variantes."], ["Frase exacta", '"habitação social"', "Mantiene las palabras juntas y en ese orden."], ["AND", "habitação AND Salvador", "Exige ambas expresiones."], ["OR", "habitação OR patrimônio", "Acepta cualquiera de las dos."], ["NOT", "habitação NOT rural", "Excluye los registros con la expresión siguiente."], ["* Varios caracteres", "urban*", "Encuentra urbanismo, urbano y otras terminaciones."], ["? Un carácter", "urban?", "Encuentra urbano o urbana sustituyendo una letra."], ["Coordenadas", "-12.9711, -38.5108", "Busca puntos revisados a menos de 100 metros."]
  ], filterRows: [
    ["Fuente", "Biblioteca Nacional + habitação", "Limita los registros publicados a esa fuente."], ["Tipo de autoridad", "151 · Lugar + Salvador", "Limita al tipo MARC; 181 es subdivisión geográfica."], ["Idioma", "Inglés + housing", "Exige una forma registrada en ese idioma."], ["Relación", "Asociativa + habitação", "Muestra registros con esa relación."], ["Orden", "Título A–Z + patrimônio", "Reordena los resultados."]
  ] },
  de: { prompt: "Wörter kombinieren und Suche verfeinern.", open: "Wie suchen?", title: "Themen suchen", intro: "Beim Tippen erscheint eine Vorschau. Mit Themen suchen werden Ausdruck und Filter angewendet.", expressions: "Suchausdruck", filters: "Filter kombinieren", example: "Beispiel", result: "Ergebnis", close: "Hilfe schließen", rows: [
    ["Wort oder Ort", "habitação", "Findet das Wort auch in Varianten."], ["Genaue Wortfolge", '"habitação social"', "Sucht die Wörter gemeinsam in dieser Reihenfolge."], ["AND", "habitação AND Salvador", "Verlangt beide Ausdrücke."], ["OR", "habitação OR patrimônio", "Akzeptiert einen der Ausdrücke."], ["NOT", "habitação NOT rural", "Schließt den folgenden Ausdruck aus."], ["* Mehrere Zeichen", "urban*", "Findet urbanismo, urbano und weitere Endungen."], ["? Ein Zeichen", "urban?", "Findet urbano oder urbana mit einem Ersatzbuchstaben."], ["Koordinaten", "-12.9711, -38.5108", "Findet geprüfte Punkte im Umkreis von 100 Metern."]
  ], filterRows: [
    ["Quelle", "Biblioteca Nacional + habitação", "Beschränkt auf veröffentlichte Einträge dieser Quelle."], ["Normdatentyp", "151 · Lugar + Salvador", "Beschränkt auf den MARC-Typ; 181 ist eine geografische Unterteilung."], ["Sprache", "Englisch + housing", "Erfordert eine Form in dieser Sprache."], ["Beziehung", "Assoziativ + habitação", "Zeigt Einträge mit dieser Beziehung."], ["Sortierung", "Titel A–Z + patrimônio", "Ordnet die Ergebnisse neu."]
  ] },
  fr: { prompt: "Combinez des mots et affinez la recherche.", open: "Comment chercher ?", title: "Comment chercher des thèmes", intro: "La saisie affiche un aperçu. Lancez la recherche pour appliquer l’expression complète et les filtres.", expressions: "Saisir la recherche", filters: "Combiner les filtres", example: "Exemple", result: "Effet", close: "Fermer l’aide", rows: [
    ["Mot ou lieu", "habitação", "Trouve le mot, y compris dans les variantes."], ["Expression exacte", '"habitação social"', "Garde les mots ensemble dans cet ordre."], ["AND", "habitação AND Salvador", "Exige les deux expressions."], ["OR", "habitação OR patrimônio", "Accepte l’une ou l’autre."], ["NOT", "habitação NOT rural", "Exclut l’expression suivante."], ["* Plusieurs caractères", "urban*", "Trouve urbanismo, urbano et d’autres terminaisons."], ["? Un caractère", "urban?", "Trouve urbano ou urbana avec une lettre remplacée."], ["Coordonnées", "-12.9711, -38.5108", "Trouve les points vérifiés à moins de 100 mètres."]
  ], filterRows: [
    ["Source", "Biblioteca Nacional + habitação", "Limite aux notices publiées de cette source."], ["Type d’autorité", "151 · Lugar + Salvador", "Limite au type MARC ; 181 est une subdivision géographique."], ["Langue", "Anglais + housing", "Exige une forme enregistrée dans cette langue."], ["Relation", "Associative + habitação", "Affiche les notices avec cette relation."], ["Tri", "Titre A–Z + patrimônio", "Réorganise les résultats."]
  ] },
  it: { prompt: "Combina parole e affina la ricerca.", open: "Come cercare?", title: "Come cercare i temi", intro: "Durante la digitazione appare un’anteprima. Premi Cerca temi per applicare l’espressione completa e i filtri.", expressions: "Scrivi la ricerca", filters: "Combina i filtri", example: "Esempio", result: "Cosa succede", close: "Chiudi guida", rows: [
    ["Parola o luogo", "habitação", "Trova la parola anche nelle varianti."], ["Frase esatta", '"habitação social"', "Mantiene le parole unite e in quest’ordine."], ["AND", "habitação AND Salvador", "Richiede entrambe le espressioni."], ["OR", "habitação OR patrimônio", "Accetta una delle espressioni."], ["NOT", "habitação NOT rural", "Esclude l’espressione successiva."], ["* Più caratteri", "urban*", "Trova urbanismo, urbano e altre terminazioni."], ["? Un carattere", "urban?", "Trova urbano o urbana sostituendo una lettera."], ["Coordinate", "-12.9711, -38.5108", "Trova i punti verificati entro 100 metri."]
  ], filterRows: [
    ["Fonte", "Biblioteca Nacional + habitação", "Limita ai record pubblicati di questa fonte."], ["Tipo di autorità", "151 · Lugar + Salvador", "Limita al tipo MARC; 181 è una suddivisione geografica."], ["Lingua", "Inglese + housing", "Richiede una forma registrata in quella lingua."], ["Relazione", "Associativa + habitação", "Mostra record con questa relazione."], ["Ordinamento", "Titolo A–Z + patrimônio", "Riordina i risultati."]
  ] },
} as const;

export function AuthoritySearchHelp() {
  const { language } = useInterfaceLanguage();
  const t = copy[language];
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <div className="authority-search-help">
    <p>{t.prompt}</p><button type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog"><AppIcon name="help" />{t.open}</button>
    <dialog ref={dialog} className="pronto-modal authority-search-help__dialog" aria-labelledby={titleId} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <ModalCloseButton label={t.close} onClick={() => dialog.current?.close()} />
      <header><p className="eyebrow">{t.open}</p><h2 id={titleId}>{t.title}</h2><p>{t.intro}</p></header>
      <section><h3>{t.expressions}</h3><div className="authority-search-help__examples">{t.rows.map(([label, example, description]) => <article key={label}><h4>{label}</h4><code>{example}</code><p>{description}</p></article>)}</div></section>
      <section><h3>{t.filters}</h3><div className="authority-search-help__examples">{t.filterRows.map(([label, example, description]) => <article key={label}><h4>{label}</h4><code>{example}</code><p>{description}</p></article>)}</div></section>
    </dialog>
  </div>;
}
