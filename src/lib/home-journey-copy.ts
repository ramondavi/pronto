import type { InterfaceLanguage } from "@/lib/interface-language";

type JourneyDetail = { points: [string, string]; result: string; help: string; href: string };
export type HomeJourneyCopy = {
  intro: string;
  stepLabel: string;
  detailLabel: string;
  resultLabel: string;
  last: { title: string; summary: string };
  details: [JourneyDetail, JourneyDetail, JourneyDetail, JourneyDetail];
};

export const homeJourneyCopy: Record<InterfaceLanguage, HomeJourneyCopy> = {
  pt: {
    intro: "Selecione uma etapa para ver o que fazer e o que acontece em seguida.", stepLabel: "Etapa", detailLabel: "O que acontece nesta etapa", resultLabel: "Depois desta etapa",
    last: { title: "Conclua o autodepósito", summary: "Quando seu curso exigir, publique o trabalho no RI/UFBA com o apoio do guia." },
    details: [
      { points: ["Separe a versão final, defendida e aprovada, com folha de aprovação quando aplicável.", "Informe os dados e um link público que permita à biblioteca abrir o trabalho. O rascunho pode ser retomado."], result: "Ao enviar a solicitação, você acompanha o protocolo no painel.", help: "Como preparar a solicitação", href: "/ajuda/artigos/preparar-solicitacao" },
      { points: ["A biblioteca confere os dados e, se necessário, indica exatamente o que corrigir.", "Quando solicitado, envie o Nada Consta. Emita-o ao concluir o curso: ele encerra seu cadastro para empréstimos nas bibliotecas."], result: "Você vê as pendências e o andamento da análise no painel.", help: "Como obter o Nada Consta", href: "/ajuda/artigos/emitir-nada-consta" },
      { points: ["Após a homologação da ficha e a aprovação do Nada Consta, escolha a apresentação da ficha.", "Gere e baixe o trabalho com a ficha no seu navegador. O PDF completo não é enviado ao Pronto!."], result: "O arquivo fica pronto para a próxima etapa, quando ela se aplicar ao seu curso.", help: "Entenda a liberação da ficha", href: "/ajuda" },
      { points: ["Se o autodepósito for exigido para seu curso, siga o guia e solicite acesso ao RI/UFBA antes de depositar.", "Depois da publicação, informe à biblioteca o endereço permanente do trabalho no repositório."], result: "A biblioteca confere a publicação e conclui o atendimento.", help: "Como concluir o autodepósito", href: "/ajuda/artigos/concluir-autodeposito" },
    ],
  },
  en: {
    intro: "Select a step to see what to do and what happens next.", stepLabel: "Step", detailLabel: "What happens at this step", resultLabel: "After this step",
    last: { title: "Complete self-deposit", summary: "If your course requires it, publish the work in RI/UFBA with help from the guide." },
    details: [
      { points: ["Prepare the approved final version, with the approval page when applicable.", "Enter the details and a public link that lets the library open the work. You can resume your draft later."], result: "After submitting, follow your request in the dashboard.", help: "Prepare your request", href: "/ajuda/artigos/preparar-solicitacao" },
      { points: ["The library reviews the details and identifies exactly what needs correction.", "Submit the Nada Consta when requested. Obtain it when finishing your course: it closes your library borrowing registration."], result: "You can track pending items and the review in your dashboard.", help: "Obtain the Nada Consta", href: "/ajuda/artigos/emitir-nada-consta" },
      { points: ["Once the catalog record is approved and the Nada Consta accepted, choose how the record will appear.", "Generate and download the work with the record in your browser. The full PDF is not uploaded to Pronto!."], result: "Your file is ready for the next step if it applies to your course.", help: "Learn about record release", href: "/ajuda" },
      { points: ["If your course requires self-deposit, follow the guide and request RI/UFBA access before depositing.", "After publication, send the permanent repository link to the library."], result: "The library checks the publication and completes the request.", help: "Complete self-deposit", href: "/ajuda/artigos/concluir-autodeposito" },
    ],
  },
  es: {
    intro: "Seleccione una etapa para saber qué hacer y qué ocurre después.", stepLabel: "Etapa", detailLabel: "Qué ocurre en esta etapa", resultLabel: "Después de esta etapa",
    last: { title: "Complete el autodepósito", summary: "Si su curso lo requiere, publique el trabajo en el RI/UFBA con ayuda de la guía." },
    details: [
      { points: ["Prepare la versión final aprobada, con la hoja de aprobación cuando corresponda.", "Indique los datos y un enlace público que permita a la biblioteca abrir el trabajo. Puede retomar el borrador."], result: "Tras enviar la solicitud, siga el expediente en el panel.", help: "Prepare su solicitud", href: "/ajuda/artigos/preparar-solicitacao" },
      { points: ["La biblioteca revisa los datos e indica exactamente qué debe corregirse.", "Envíe el Nada Consta cuando se solicite. Emítalo al terminar el curso: cierra su registro de préstamos en las bibliotecas."], result: "Consulte los pendientes y el avance de la revisión en el panel.", help: "Obtenga el Nada Consta", href: "/ajuda/artigos/emitir-nada-consta" },
      { points: ["Tras la aprobación de la ficha y del Nada Consta, elija cómo se presentará la ficha.", "Genere y descargue el trabajo con la ficha en su navegador. El PDF completo no se envía a Pronto!."], result: "El archivo queda listo para la siguiente etapa si corresponde a su curso.", help: "Conozca la liberación de la ficha", href: "/ajuda" },
      { points: ["Si su curso exige el autodepósito, siga la guía y solicite acceso al RI/UFBA antes de depositar.", "Después de publicar, informe a la biblioteca del enlace permanente del trabajo."], result: "La biblioteca comprueba la publicación y concluye la solicitud.", help: "Complete el autodepósito", href: "/ajuda/artigos/concluir-autodeposito" },
    ],
  },
  de: {
    intro: "Wählen Sie einen Schritt, um die nächsten Aufgaben und den weiteren Ablauf zu sehen.", stepLabel: "Schritt", detailLabel: "Was in diesem Schritt geschieht", resultLabel: "Nach diesem Schritt",
    last: { title: "Selbsteinreichung abschließen", summary: "Falls Ihr Studiengang es verlangt, veröffentlichen Sie die Arbeit mithilfe der Anleitung im RI/UFBA." },
    details: [
      { points: ["Bereiten Sie die genehmigte Endfassung mit Genehmigungsblatt vor, falls erforderlich.", "Geben Sie die Daten und einen öffentlichen Link an, über den die Bibliothek die Arbeit öffnen kann. Ihren Entwurf können Sie später fortsetzen."], result: "Nach dem Absenden verfolgen Sie Ihre Anfrage im Dashboard.", help: "Anfrage vorbereiten", href: "/ajuda/artigos/preparar-solicitacao" },
      { points: ["Die Bibliothek prüft die Angaben und nennt genau die erforderlichen Korrekturen.", "Reichen Sie das Nada Consta ein, wenn Sie dazu aufgefordert werden. Beantragen Sie es zum Studienabschluss: Es beendet Ihre Ausleihregistrierung."], result: "Offene Punkte und den Prüfstand sehen Sie im Dashboard.", help: "Nada Consta erhalten", href: "/ajuda/artigos/emitir-nada-consta" },
      { points: ["Nach Freigabe des Katalogeintrags und des Nada Consta wählen Sie die Darstellung des Eintrags.", "Erstellen und laden Sie die Arbeit mit dem Eintrag im Browser herunter. Das vollständige PDF wird nicht an Pronto! gesendet."], result: "Die Datei ist für den nächsten Schritt bereit, sofern er für Ihren Studiengang gilt.", help: "Mehr zur Freigabe", href: "/ajuda" },
      { points: ["Falls Ihr Studiengang die Selbsteinreichung verlangt, folgen Sie der Anleitung und beantragen Sie vorher den Zugang zum RI/UFBA.", "Teilen Sie der Bibliothek nach der Veröffentlichung den dauerhaften Link mit."], result: "Die Bibliothek prüft die Veröffentlichung und schließt den Vorgang ab.", help: "Selbsteinreichung abschließen", href: "/ajuda/artigos/concluir-autodeposito" },
    ],
  },
  fr: {
    intro: "Sélectionnez une étape pour voir quoi faire et ce qui suit.", stepLabel: "Étape", detailLabel: "Ce qui se passe à cette étape", resultLabel: "Après cette étape",
    last: { title: "Terminez l’auto-dépôt", summary: "Si votre cursus l’exige, publiez le travail dans le RI/UFBA avec l’aide du guide." },
    details: [
      { points: ["Préparez la version finale approuvée, avec la page d’approbation si nécessaire.", "Indiquez les données et un lien public permettant à la bibliothèque d’ouvrir le travail. Vous pourrez reprendre votre brouillon."], result: "Après l’envoi, suivez votre demande dans le tableau de bord.", help: "Préparer votre demande", href: "/ajuda/artigos/preparar-solicitacao" },
      { points: ["La bibliothèque vérifie les données et précise les corrections nécessaires.", "Envoyez le Nada Consta lorsqu’il est demandé. Obtenez-le à la fin du cursus : il met fin à votre inscription pour les emprunts."], result: "Suivez les points en attente et l’examen dans le tableau de bord.", help: "Obtenir le Nada Consta", href: "/ajuda/artigos/emitir-nada-consta" },
      { points: ["Après validation de la notice et du Nada Consta, choisissez la présentation de la notice.", "Générez et téléchargez le travail avec la notice dans votre navigateur. Le PDF complet n’est pas envoyé à Pronto!."], result: "Le fichier est prêt pour la suite, si celle-ci s’applique à votre cursus.", help: "Comprendre la mise à disposition", href: "/ajuda" },
      { points: ["Si votre cursus exige l’auto-dépôt, suivez le guide et demandez l’accès au RI/UFBA avant le dépôt.", "Après publication, transmettez à la bibliothèque le lien permanent vers le travail."], result: "La bibliothèque vérifie la publication et termine le traitement.", help: "Terminer l’auto-dépôt", href: "/ajuda/artigos/concluir-autodeposito" },
    ],
  },
  it: {
    intro: "Seleziona una fase per vedere cosa fare e cosa succede dopo.", stepLabel: "Fase", detailLabel: "Cosa succede in questa fase", resultLabel: "Dopo questa fase",
    last: { title: "Completa l’autodeposito", summary: "Se il tuo corso lo richiede, pubblica il lavoro nel RI/UFBA seguendo la guida." },
    details: [
      { points: ["Prepara la versione finale approvata, con la pagina di approvazione se prevista.", "Inserisci i dati e un link pubblico che permetta alla biblioteca di aprire il lavoro. Puoi riprendere la bozza in seguito."], result: "Dopo l’invio, segui la richiesta nel pannello.", help: "Prepara la richiesta", href: "/ajuda/artigos/preparar-solicitacao" },
      { points: ["La biblioteca controlla i dati e indica con precisione le correzioni necessarie.", "Invia il Nada Consta quando richiesto. Ottienilo alla fine del corso: chiude la tua iscrizione ai prestiti bibliotecari."], result: "Nel pannello puoi seguire le pendenze e la verifica.", help: "Ottieni il Nada Consta", href: "/ajuda/artigos/emitir-nada-consta" },
      { points: ["Dopo l’approvazione della scheda e del Nada Consta, scegli la presentazione della scheda.", "Genera e scarica il lavoro con la scheda nel browser. Il PDF completo non viene inviato a Pronto!."], result: "Il file è pronto per la fase successiva, se prevista dal tuo corso.", help: "Informazioni sul rilascio", href: "/ajuda" },
      { points: ["Se il corso richiede l’autodeposito, segui la guida e chiedi l’accesso al RI/UFBA prima di depositare.", "Dopo la pubblicazione, comunica alla biblioteca il link permanente al lavoro."], result: "La biblioteca verifica la pubblicazione e conclude la richiesta.", help: "Completa l’autodeposito", href: "/ajuda/artigos/concluir-autodeposito" },
    ],
  },
};
