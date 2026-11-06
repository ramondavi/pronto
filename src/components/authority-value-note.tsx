import { AppIcon } from "@/components/app-icon";
import type { InterfaceLanguage } from "@/lib/interface-language";

const copy: Record<InterfaceLanguage, { eyebrow: string; title: string; intro: string; publicTitle: string; publicText: string; librarianTitle: string; librarianText: string; closing: string }> = {
  pt: {
    eyebrow: "O valor de uma palavra bem escolhida", title: "Por que usar as autoridades do Pronto!?",
    intro: "Os trabalhos da Faculdade de Arquitetura não tratam de um único lugar ou de uma única ideia. Para que cada pesquisa possa ser encontrada e relacionada a outras, a Biblioteca da FAUFBA cuida das palavras que as descrevem.",
    publicTitle: "Para quem pesquisa, estuda ou tem curiosidade", publicText: "Um mesmo assunto pode aparecer com nomes diferentes. Aqui, você encontra uma forma de referência, outras maneiras de buscá-la e caminhos para descobrir temas e lugares próximos. É uma porta de entrada para explorar o que se produz na Faculdade, mesmo quando você ainda não sabe o termo exato.",
    librarianTitle: "Para bibliotecários e outras instituições", librarianText: "Cada autoridade publicada passa pela revisão técnica de bibliotecários especializados em arquitetura e urbanismo. Eles conferem a forma do termo, suas variantes, relações, origem e condições de uso. Esse trabalho torna a descrição mais consistente, facilita a recuperação da informação e oferece registros em formatos que podem apoiar o intercâmbio entre catálogos.",
    closing: "O vocabulário cresce com a produção acadêmica e com a revisão da Biblioteca: conhecimento organizado por pessoas, para ajudar outras pessoas a encontrá-lo.",
  },
  en: {
    eyebrow: "The value of a well-chosen term", title: "Why use Pronto! authorities?",
    intro: "Research at the Faculty of Architecture spans many places and ideas. To help each work be found and connected to others, the FAUFBA Library carefully maintains the terms that describe it.",
    publicTitle: "For researchers, students and curious visitors", publicText: "The same subject may have different names. Here you can find a preferred form, other ways to search for it, and paths to related themes and places. It is a starting point for exploring the Faculty’s work, even when you do not know the exact term.",
    librarianTitle: "For librarians and other institutions", librarianText: "Each published authority is technically reviewed by librarians specializing in architecture and urbanism. They check the term, its variants, relationships, source and terms of use. This work makes descriptions more consistent, improves discovery and provides records in formats that can support exchange between catalogues.",
    closing: "The vocabulary grows with academic work and the Library’s review: knowledge organized by people to help others find it.",
  },
  es: {
    eyebrow: "El valor de un término bien elegido", title: "¿Por qué usar las autoridades de Pronto!?",
    intro: "Los trabajos de la Facultad de Arquitectura abarcan muchos lugares e ideas. Para que cada investigación pueda encontrarse y relacionarse con otras, la Biblioteca FAUFBA cuida los términos que la describen.",
    publicTitle: "Para investigadores, estudiantes y curiosos", publicText: "Un mismo asunto puede tener distintos nombres. Aquí encontrará una forma de referencia, otras maneras de buscarla y caminos hacia temas y lugares relacionados. Es un punto de partida para explorar la producción de la Facultad, aun sin conocer el término exacto.",
    librarianTitle: "Para bibliotecarios y otras instituciones", librarianText: "Cada autoridad publicada recibe una revisión técnica de bibliotecarios especializados en arquitectura y urbanismo. Verifican el término, sus variantes, relaciones, origen y condiciones de uso. Este trabajo hace más coherente la descripción, facilita la recuperación y ofrece registros en formatos que apoyan el intercambio entre catálogos.",
    closing: "El vocabulario crece con la producción académica y la revisión de la Biblioteca: conocimiento organizado por personas para ayudar a otras a encontrarlo.",
  },
  de: {
    eyebrow: "Der Wert eines gut gewählten Begriffs", title: "Warum die Normdaten von Pronto! nutzen?",
    intro: "Die Arbeiten der Fakultät für Architektur befassen sich mit vielen Orten und Ideen. Damit jede Forschung gefunden und mit anderer verbunden werden kann, pflegt die FAUFBA-Bibliothek die beschreibenden Begriffe.",
    publicTitle: "Für Forschende, Studierende und Interessierte", publicText: "Dasselbe Thema kann verschiedene Namen haben. Hier finden Sie eine bevorzugte Form, weitere Suchmöglichkeiten und Wege zu verwandten Themen und Orten. So können Sie die Arbeiten der Fakultät entdecken, auch ohne den genauen Begriff zu kennen.",
    librarianTitle: "Für Bibliotheken und andere Einrichtungen", librarianText: "Jeder veröffentlichte Normdatensatz wird von auf Architektur und Städtebau spezialisierten Bibliotheksfachkräften fachlich geprüft. Sie kontrollieren Begriff, Varianten, Beziehungen, Herkunft und Nutzungsbedingungen. Das sorgt für konsistentere Beschreibungen, erleichtert das Auffinden und bietet Datensätze in Formaten für den Austausch zwischen Katalogen.",
    closing: "Das Vokabular wächst mit den wissenschaftlichen Arbeiten und der Prüfung durch die Bibliothek: von Menschen geordnetes Wissen, das andere Menschen finden können.",
  },
  fr: {
    eyebrow: "La valeur d’un terme bien choisi", title: "Pourquoi utiliser les autorités de Pronto! ?",
    intro: "Les travaux de la Faculté d’architecture portent sur de nombreux lieux et idées. Pour que chaque recherche soit trouvée et reliée à d’autres, la bibliothèque de la FAUFBA veille aux termes qui la décrivent.",
    publicTitle: "Pour les chercheurs, les étudiants et les curieux", publicText: "Un même sujet peut porter plusieurs noms. Vous trouverez ici une forme de référence, d’autres façons de la rechercher et des pistes vers des thèmes et lieux proches. C’est une porte d’entrée vers les travaux de la Faculté, même sans connaître le terme exact.",
    librarianTitle: "Pour les bibliothécaires et les autres institutions", librarianText: "Chaque autorité publiée fait l’objet d’une révision technique par des bibliothécaires spécialisés en architecture et en urbanisme. Ils vérifient le terme, ses variantes, ses relations, son origine et ses conditions d’utilisation. Ce travail rend les descriptions plus cohérentes, facilite la recherche et fournit des notices dans des formats favorisant l’échange entre catalogues.",
    closing: "Le vocabulaire grandit avec les travaux universitaires et la révision de la bibliothèque : un savoir organisé par des personnes pour aider d’autres personnes à le trouver.",
  },
  it: {
    eyebrow: "Il valore di un termine ben scelto", title: "Perché usare le autorità di Pronto!?",
    intro: "I lavori della Facoltà di Architettura riguardano molti luoghi e idee. Per aiutare a trovare ogni ricerca e a collegarla alle altre, la Biblioteca FAUFBA cura i termini che la descrivono.",
    publicTitle: "Per ricercatori, studenti e curiosi", publicText: "Uno stesso argomento può avere nomi diversi. Qui trovi una forma di riferimento, altri modi per cercarla e percorsi verso temi e luoghi collegati. È un punto di partenza per esplorare i lavori della Facoltà, anche senza conoscere il termine esatto.",
    librarianTitle: "Per bibliotecari e altre istituzioni", librarianText: "Ogni autorità pubblicata è sottoposta alla revisione tecnica di bibliotecari specializzati in architettura e urbanistica. Verificano il termine, le varianti, le relazioni, la provenienza e le condizioni d’uso. Questo lavoro rende le descrizioni più coerenti, facilita la ricerca e offre record in formati utili allo scambio tra cataloghi.",
    closing: "Il vocabolario cresce con la produzione accademica e la revisione della Biblioteca: conoscenza organizzata da persone per aiutare altre persone a trovarla.",
  },
};

export function AuthorityValueNote({ language }: { language: InterfaceLanguage }) {
  const t = copy[language];
  return <section className="authority-value-note" aria-labelledby="authority-value-note-title">
    <div className="authority-value-note__heading"><p className="eyebrow">{t.eyebrow}</p><h2 id="authority-value-note-title">{t.title}</h2><p>{t.intro}</p></div>
    <div className="authority-value-note__audiences"><div><AppIcon name="search" aria-hidden="true" /><h3>{t.publicTitle}</h3><p>{t.publicText}</p></div><div><AppIcon name="book" aria-hidden="true" /><h3>{t.librarianTitle}</h3><p>{t.librarianText}</p></div></div>
    <p className="authority-value-note__closing">{t.closing}</p>
  </section>;
}
