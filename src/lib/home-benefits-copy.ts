import type { InterfaceLanguage } from "@/lib/interface-language";
import type { AppIconName } from "@/components/app-icon";

type Benefit = { title: string; description: string };
type BenefitsCopy = { eyebrow: string; title: string; introduction: string; items: [Benefit, Benefit, Benefit, Benefit, Benefit, Benefit, Benefit] };

export const benefitIcons = ["shield", "edit", "eye", "review", "lock", "document", "upload"] as const satisfies readonly AppIconName[];

export const homeBenefitsCopy: Record<InterfaceLanguage, BenefitsCopy> = {
  pt: {
    eyebrow: "Por que usar o Pronto!", title: "Seu trabalho merece um caminho mais simples.", introduction: "Da solicitação à entrega, você sabe o que fazer e conta com a biblioteca nas decisões que exigem cuidado técnico.",
    items: [
      { title: "Validação por bibliotecário", description: "A ficha é analisada e homologada por um profissional da BIB/FAUFBA antes de ser liberada para você." },
      { title: "Rascunho retomável", description: "Preencha no seu ritmo. O formulário salva o progresso para você voltar quando precisar." },
      { title: "Acompanhamento claro", description: "Veja o andamento, os prazos e sua próxima ação em um só lugar." },
      { title: "Correções sem recomeçar", description: "Se houver ajustes, a biblioteca aponta os campos necessários e explica cada pedido." },
      { title: "PDF completo no seu dispositivo", description: "Compartilhe um link para análise. Ao inserir a ficha, o trabalho completo é processado no seu navegador." },
      { title: "Ficha alinhada ao trabalho", description: "Ajuste tipografia e cores, e gere a página da ficha nas dimensões do seu PDF." },
      { title: "Guia para o RI/UFBA", description: "Quando seu curso exigir autodepósito, reaproveite os dados conferidos e siga orientações para publicar." },
    ],
  },
  en: {
    eyebrow: "Why use Pronto!", title: "A simpler path for your work.", introduction: "From request to delivery, you know what to do and have the library’s support for decisions that need professional care.",
    items: [
      { title: "Librarian-approved record", description: "A BIB/FAUFBA librarian reviews and approves the catalog record before it is released to you." },
      { title: "A draft you can resume", description: "Work at your own pace. The form saves your progress so you can return later." },
      { title: "Clear progress", description: "See your request status, deadlines and next action in one place." },
      { title: "Targeted corrections", description: "If changes are needed, the library identifies the relevant fields and explains each request." },
      { title: "Full PDF stays on your device", description: "Share a link for review. The complete work is processed in your browser when you insert the record." },
      { title: "A record that fits your work", description: "Choose typeface and colors, and generate the record page to match your PDF’s dimensions." },
      { title: "RI/UFBA guidance", description: "If your course requires self-deposit, reuse the reviewed details and follow the publication guide." },
    ],
  },
  es: {
    eyebrow: "Por qué usar Pronto!", title: "Un camino más sencillo para su trabajo.", introduction: "Desde la solicitud hasta la entrega, sabrá qué hacer y contará con la biblioteca para las decisiones que requieren atención profesional.",
    items: [
      { title: "Ficha validada por bibliotecario", description: "Un profesional de BIB/FAUFBA revisa y aprueba la ficha antes de ponerla a su disposición." },
      { title: "Borrador recuperable", description: "Avance a su ritmo. El formulario guarda el progreso para que pueda volver después." },
      { title: "Seguimiento claro", description: "Consulte el estado, los plazos y su siguiente acción en un solo lugar." },
      { title: "Correcciones puntuales", description: "Si hay ajustes, la biblioteca señala los campos necesarios y explica cada solicitud." },
      { title: "PDF completo en su dispositivo", description: "Comparta un enlace para la revisión. Al insertar la ficha, el trabajo completo se procesa en su navegador." },
      { title: "Ficha adaptada al trabajo", description: "Elija tipografía y colores, y genere la página de la ficha con las dimensiones de su PDF." },
      { title: "Guía para el RI/UFBA", description: "Si su curso exige el autodepósito, reutilice los datos revisados y siga la guía de publicación." },
    ],
  },
  de: {
    eyebrow: "Warum Pronto! nutzen", title: "Ein einfacherer Weg für Ihre Arbeit.", introduction: "Von der Anfrage bis zur Abgabe wissen Sie, was zu tun ist, und werden bei fachlichen Entscheidungen von der Bibliothek unterstützt.",
    items: [
      { title: "Von Fachpersonal geprüft", description: "Eine Bibliotheksfachkraft der BIB/FAUFBA prüft und genehmigt den Katalogeintrag vor der Freigabe." },
      { title: "Entwurf fortsetzen", description: "Arbeiten Sie in Ihrem Tempo. Das Formular speichert den Fortschritt für später." },
      { title: "Klarer Überblick", description: "Sehen Sie Status, Fristen und Ihren nächsten Schritt an einem Ort." },
      { title: "Gezielte Korrekturen", description: "Bei Änderungen nennt die Bibliothek die betreffenden Felder und erklärt jede Anfrage." },
      { title: "Vollständiges PDF bleibt bei Ihnen", description: "Teilen Sie zur Prüfung einen Link. Beim Einfügen des Eintrags wird die ganze Arbeit im Browser verarbeitet." },
      { title: "Eintrag passend zur Arbeit", description: "Wählen Sie Schrift und Farben und erstellen Sie die Seite im Format Ihres PDFs." },
      { title: "Anleitung für RI/UFBA", description: "Falls Ihr Studiengang die Selbsteinreichung verlangt, übernehmen Sie geprüfte Daten und folgen der Anleitung." },
    ],
  },
  fr: {
    eyebrow: "Pourquoi utiliser Pronto!", title: "Un parcours plus simple pour votre travail.", introduction: "De la demande à la remise, vous savez quoi faire et bénéficiez de l’aide de la bibliothèque pour les décisions techniques.",
    items: [
      { title: "Notice validée par un bibliothécaire", description: "Une personne qualifiée de la BIB/FAUFBA vérifie et approuve la notice avant sa mise à disposition." },
      { title: "Brouillon à reprendre", description: "Avancez à votre rythme. Le formulaire enregistre votre progression pour plus tard." },
      { title: "Suivi clair", description: "Consultez l’état, les délais et votre prochaine action au même endroit." },
      { title: "Corrections ciblées", description: "Si des changements sont nécessaires, la bibliothèque indique les champs concernés et explique chaque demande." },
      { title: "PDF complet sur votre appareil", description: "Partagez un lien pour l’examen. Le travail complet est traité dans votre navigateur lors de l’insertion de la notice." },
      { title: "Notice adaptée au travail", description: "Choisissez police et couleurs, puis créez la page aux dimensions de votre PDF." },
      { title: "Guide pour le RI/UFBA", description: "Si votre cursus exige l’auto-dépôt, réutilisez les données vérifiées et suivez le guide de publication." },
    ],
  },
  it: {
    eyebrow: "Perché usare Pronto!", title: "Un percorso più semplice per il tuo lavoro.", introduction: "Dalla richiesta alla consegna, sai cosa fare e hai il supporto della biblioteca per le decisioni che richiedono competenza.",
    items: [
      { title: "Scheda validata da bibliotecari", description: "Un professionista BIB/FAUFBA verifica e approva la scheda prima di renderla disponibile." },
      { title: "Bozza da riprendere", description: "Procedi con i tuoi tempi. Il modulo salva i progressi per consentirti di tornare in seguito." },
      { title: "Stato sempre chiaro", description: "Consulta avanzamento, scadenze e prossima azione in un unico posto." },
      { title: "Correzioni mirate", description: "Se servono modifiche, la biblioteca indica i campi interessati e spiega ogni richiesta." },
      { title: "PDF completo sul tuo dispositivo", description: "Condividi un link per la verifica. Quando inserisci la scheda, il lavoro completo viene elaborato nel browser." },
      { title: "Scheda adatta al lavoro", description: "Scegli carattere e colori e genera la pagina nelle dimensioni del tuo PDF." },
      { title: "Guida per il RI/UFBA", description: "Se il corso richiede l’autodeposito, riutilizza i dati verificati e segui la guida alla pubblicazione." },
    ],
  },
};
