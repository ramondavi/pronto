import type { InterfaceLanguage } from "@/lib/interface-language";

type Section = { title: string; paragraphs: string[] };
type PrivacyCopy = {
  version: string; updated: string; heading: string; lead: string;
  summaryLabel: string; detailsLabel: string; summary: [string, string][];
  sections: [Section, Section, Section, Section, Section];
  controllerLabel: string; controller: string; serviceLabel: string;
  officerLabel: string; officer: string; institutionalChannel: string;
  informationPrefix: string; informationLink: string; legalBasis: string;
};

export const privacyCopy: Record<InterfaceLanguage, PrivacyCopy> = {
  pt: {
    version: "Política de privacidade · versão", updated: "última atualização",
    heading: "Privacidade, em linguagem clara.",
    lead: "Aqui você encontra, sem juridiquês, como o Pronto! usa e protege as informações necessárias ao atendimento.",
    summaryLabel: "Resumo da política", detailsLabel: "Detalhes da política de privacidade",
    summary: [
      ["Só o necessário", "Dados indispensáveis para sua conta e para o atendimento."],
      ["Trabalho completo fora daqui", "O PDF completo não é enviado ao Pronto!."],
      ["Nada Consta temporário", "O arquivo de conferência é removido em 60 dias."],
    ],
    sections: [
      { title: "Dados e finalidade", paragraphs: [
        "Podemos tratar nome, e-mail institucional, CPF, data de nascimento, matrícula ou vínculo acadêmico, dados da solicitação, link público do trabalho e informações do atendimento. Senhas não são visíveis para a biblioteca.",
        "Usamos esses dados para identificar a pessoa usuária, manter a conta segura, receber e atender a solicitação de ficha, orientar o autodepósito e registrar ações necessárias à continuidade do serviço. A data completa fica salva na conta. Ao solicitar a ficha, o estudante pode autorizar o uso apenas do ano de nascimento para diferenciar pessoas com o mesmo nome. Sem essa autorização, o ano não é usado na ficha. Mesmo com autorização, a biblioteca confere o ano antes de incluí-lo.",
      ] },
      { title: "Responsáveis, base legal e contato", paragraphs: [] },
      { title: "Seus direitos", paragraphs: [
        "Você pode confirmar o tratamento, acessar e corrigir seus dados; pedir anonimização, bloqueio ou eliminação quando cabível; conhecer compartilhamentos; pedir portabilidade quando aplicável; peticionar à ANPD e opor-se a tratamento irregular.",
        "Alguns pedidos dependem da finalidade pública, das obrigações legais e das regras de conservação. A Ouvidoria orienta o atendimento.",
      ] },
      { title: "Acesso, compartilhamento e cookies", paragraphs: [
        "Você acessa seus próprios dados. A equipe autorizada vê apenas o necessário para atender a solicitação. A coordenação, quando habilitada, recebe visão limitada, sem CPF, documentos ou comentários internos.",
        "Supabase (autenticação, banco e armazenamento) e Vercel (hospedagem) atuam como operadores técnicos. O Pronto! não vende dados nem os utiliza para marketing.",
        "Cookies essenciais mantêm a sessão. O navegador pode guardar preferência de tema e rascunho local. Não usamos cookies de publicidade ou ferramentas próprias de análise de navegação.",
      ] },
      { title: "Proteção e prazos de guarda", paragraphs: [
        "Usamos conexão protegida, autenticação, controle por perfil e registros de ações para reduzir riscos. Conta, CPF, data de nascimento, e-mail e o atendimento acadêmico são mantidos enquanto houver vínculo e, no total, por 100 anos, como assentamento individual do aluno. Solicitação, metadados, ficha, pendências e homologação seguem o mesmo prazo.",
        "O Nada Consta no Pronto! é apenas arquivo de conferência e é removido 60 dias após o encerramento; o registro de longo prazo permanece no Pergamum. Auditorias administrativas e operacionais: 5 anos; logs técnicos: 6 meses; incidentes: 5 anos após apuração; backups: 90 dias, salvo preservação necessária.",
      ] },
    ],
    controllerLabel: "Controladora:", controller: "Universidade Federal da Bahia (UFBA), por meio da Biblioteca da Faculdade de Arquitetura.",
    serviceLabel: "Canal do serviço:", officerLabel: "Encarregada de Dados da UFBA:", officer: "Ana Cláudia Caldas Mendonça Semêdo",
    institutionalChannel: "canal institucional", informationPrefix: "Informações institucionais sobre proteção de dados estão disponíveis na",
    informationLink: "página de LGPD da UFBA",
    legalBasis: "O tratamento fundamenta-se no cumprimento de obrigação legal ou regulatória e atende à finalidade pública de prestar o serviço bibliotecário da UFBA.",
  },
  en: {
    version: "Privacy policy · version", updated: "last updated",
    heading: "Privacy, in plain language.",
    lead: "Here you can learn, without legal jargon, how Pronto! uses and protects the information needed to provide its service.",
    summaryLabel: "Policy summary", detailsLabel: "Privacy policy details",
    summary: [
      ["Only what is needed", "Data essential for your account and your request."],
      ["The full work stays elsewhere", "The complete PDF is not uploaded to Pronto!."],
      ["Temporary Nada Consta", "The file used for verification is deleted after 60 days."],
    ],
    sections: [
      { title: "Data and purpose", paragraphs: [
        "We may process your name, institutional email, Brazilian CPF identification number, date of birth, student registration or academic affiliation, request details, public link to your work, and service records. The library cannot see your password.",
        "We use this data to identify you, secure your account, receive and process your catalog record request, guide self-deposit, and record actions needed to continue the service. Your full date of birth is stored in your account. When requesting a record, you may authorize use of only your birth year to distinguish people with the same name. Without your authorization, the year is not used in the record. Even with authorization, the library checks the year before including it.",
      ] },
      { title: "Controller, legal basis and contact", paragraphs: [] },
      { title: "Your rights", paragraphs: [
        "You may confirm that your data is processed, access and correct it; request anonymization, restriction or deletion where applicable; learn about data sharing; request portability where applicable; petition Brazil’s data protection authority (ANPD), and object to unlawful processing.",
        "Some requests depend on the public purpose of the service, legal obligations and retention rules. The ombuds office can guide you.",
      ] },
      { title: "Access, sharing and cookies", paragraphs: [
        "You can access your own data. Authorized staff see only what they need to handle your request. When enabled, program coordinators receive a limited view without your CPF, documents or internal comments.",
        "Supabase (authentication, database and storage) and Vercel (hosting) act as technical processors. Pronto! does not sell data or use it for marketing.",
        "Essential cookies maintain your session. Your browser may store your theme preference and a local draft. We do not use advertising cookies or our own browsing analytics.",
      ] },
      { title: "Security and retention periods", paragraphs: [
        "We use secure connections, authentication, role-based access and action logs to reduce risks. Your account, CPF, date of birth, email and academic service records are retained while your relationship with the university exists and, in total, for 100 years as part of your individual student record. Requests, metadata, catalog records, pending items and approvals follow the same period.",
        "The Nada Consta in Pronto! is only a verification file and is deleted 60 days after the case closes; the long-term record remains in Pergamum. Administrative and operational audits: 5 years; technical logs: 6 months; incidents: 5 years after investigation; backups: 90 days, unless preservation is required.",
      ] },
    ],
    controllerLabel: "Controller:", controller: "Federal University of Bahia (UFBA), through the Faculty of Architecture Library.",
    serviceLabel: "Service contact:", officerLabel: "UFBA Data Protection Officer:", officer: "Ana Cláudia Caldas Mendonça Semêdo",
    institutionalChannel: "institutional contact", informationPrefix: "Institutional data protection information is available on the",
    informationLink: "UFBA LGPD page",
    legalBasis: "Processing is based on compliance with a legal or regulatory obligation and serves the public purpose of providing UFBA library services.",
  },
  es: {
    version: "Política de privacidad · versión", updated: "última actualización",
    heading: "Privacidad, en lenguaje claro.",
    lead: "Aquí puede conocer, sin jerga jurídica, cómo Pronto! utiliza y protege la información necesaria para prestar el servicio.",
    summaryLabel: "Resumen de la política", detailsLabel: "Detalles de la política de privacidad",
    summary: [
      ["Solo lo necesario", "Datos indispensables para su cuenta y su solicitud."],
      ["El trabajo completo queda fuera", "El PDF completo no se envía a Pronto!."],
      ["Nada Consta temporal", "El archivo de verificación se elimina a los 60 días."],
    ],
    sections: [
      { title: "Datos y finalidad", paragraphs: [
        "Podemos tratar su nombre, correo institucional, número de identificación brasileño CPF, fecha de nacimiento, matrícula o vínculo académico, datos de la solicitud, enlace público del trabajo e información de la atención. La biblioteca no puede ver su contraseña.",
        "Utilizamos estos datos para identificarle, proteger su cuenta, recibir y atender su solicitud de ficha catalográfica, orientar el autodepósito y registrar las acciones necesarias para mantener el servicio. La fecha de nacimiento completa se guarda en su cuenta. Al solicitar la ficha, puede autorizar el uso exclusivo del año de nacimiento para distinguir a personas con el mismo nombre. Sin esa autorización, el año no se usa en la ficha. Incluso con autorización, la biblioteca comprueba el año antes de incluirlo.",
      ] },
      { title: "Responsables, base legal y contacto", paragraphs: [] },
      { title: "Sus derechos", paragraphs: [
        "Puede confirmar el tratamiento, acceder a sus datos y corregirlos; solicitar anonimización, bloqueo o eliminación cuando corresponda; conocer las comunicaciones de datos; solicitar portabilidad cuando proceda; presentar una petición ante la autoridad brasileña de protección de datos (ANPD) y oponerse a tratamientos irregulares.",
        "Algunas solicitudes dependen de la finalidad pública, las obligaciones legales y las normas de conservación. La Defensoría universitaria puede orientarle.",
      ] },
      { title: "Acceso, intercambio y cookies", paragraphs: [
        "Puede acceder a sus propios datos. El personal autorizado ve únicamente lo necesario para atender la solicitud. Cuando esté habilitada, la coordinación recibe una vista limitada, sin CPF, documentos ni comentarios internos.",
        "Supabase (autenticación, base de datos y almacenamiento) y Vercel (alojamiento) actúan como encargados técnicos. Pronto! no vende datos ni los utiliza con fines de marketing.",
        "Las cookies esenciales mantienen la sesión. El navegador puede guardar su preferencia de tema y un borrador local. No utilizamos cookies publicitarias ni herramientas propias de análisis de navegación.",
      ] },
      { title: "Protección y plazos de conservación", paragraphs: [
        "Utilizamos conexión segura, autenticación, control de acceso por perfil y registros de acciones para reducir riesgos. La cuenta, el CPF, la fecha de nacimiento, el correo y el expediente académico se conservan mientras exista vínculo con la universidad y, en total, durante 100 años, como parte del expediente individual del estudiante. La solicitud, los metadatos, la ficha, las incidencias y la aprobación siguen el mismo plazo.",
        "El Nada Consta en Pronto! es solo un archivo de verificación y se elimina 60 días después del cierre; el registro de larga duración permanece en Pergamum. Auditorías administrativas y operativas: 5 años; registros técnicos: 6 meses; incidentes: 5 años tras su investigación; copias de seguridad: 90 días, salvo conservación necesaria.",
      ] },
    ],
    controllerLabel: "Responsable del tratamiento:", controller: "Universidad Federal de Bahía (UFBA), a través de la Biblioteca de la Facultad de Arquitectura.",
    serviceLabel: "Contacto del servicio:", officerLabel: "Delegada de Protección de Datos de la UFBA:", officer: "Ana Cláudia Caldas Mendonça Semêdo",
    institutionalChannel: "contacto institucional", informationPrefix: "La información institucional sobre protección de datos está disponible en la",
    informationLink: "página de LGPD de la UFBA",
    legalBasis: "El tratamiento se fundamenta en el cumplimiento de una obligación legal o reglamentaria y responde a la finalidad pública de prestar el servicio bibliotecario de la UFBA.",
  },
  de: {
    version: "Datenschutzerklärung · Version", updated: "letzte Aktualisierung",
    heading: "Datenschutz, verständlich erklärt.",
    lead: "Hier erfahren Sie ohne juristische Fachsprache, wie Pronto! die für den Dienst erforderlichen Daten verwendet und schützt.",
    summaryLabel: "Zusammenfassung der Datenschutzerklärung", detailsLabel: "Einzelheiten der Datenschutzerklärung",
    summary: [
      ["Nur das Nötige", "Daten, die für Ihr Konto und Ihre Anfrage erforderlich sind."],
      ["Die vollständige Arbeit bleibt extern", "Das vollständige PDF wird nicht an Pronto! übermittelt."],
      ["Nada Consta nur vorübergehend", "Die Prüfdatei wird nach 60 Tagen gelöscht."],
    ],
    sections: [
      { title: "Daten und Zweck", paragraphs: [
        "Wir können Ihren Namen, Ihre institutionelle E-Mail-Adresse, Ihre brasilianische CPF-Identifikationsnummer, Ihr Geburtsdatum, Ihre Matrikelnummer oder Hochschulzugehörigkeit, Angaben zur Anfrage, den öffentlichen Link zur Arbeit und Informationen zur Bearbeitung verarbeiten. Ihr Passwort ist für die Bibliothek nicht sichtbar.",
        "Diese Daten dienen dazu, Sie zu identifizieren, Ihr Konto zu schützen, Ihre Anfrage für einen Katalogeintrag entgegenzunehmen und zu bearbeiten, die Selbsteinreichung zu begleiten und die für den weiteren Dienst erforderlichen Vorgänge zu dokumentieren. Das vollständige Geburtsdatum wird in Ihrem Konto gespeichert. Bei der Anfrage können Sie die Verwendung nur Ihres Geburtsjahres erlauben, um Personen gleichen Namens zu unterscheiden. Ohne diese Erlaubnis wird das Jahr nicht im Eintrag verwendet. Auch bei erteilter Erlaubnis prüft die Bibliothek das Jahr vor der Aufnahme.",
      ] },
      { title: "Verantwortliche, Rechtsgrundlage und Kontakt", paragraphs: [] },
      { title: "Ihre Rechte", paragraphs: [
        "Sie können die Verarbeitung bestätigen lassen, auf Ihre Daten zugreifen und sie berichtigen; gegebenenfalls Anonymisierung, Sperrung oder Löschung beantragen; Auskunft über Weitergaben erhalten; gegebenenfalls Datenübertragbarkeit beantragen; sich an die brasilianische Datenschutzbehörde (ANPD) wenden und einer unrechtmäßigen Verarbeitung widersprechen.",
        "Einige Anträge unterliegen dem öffentlichen Zweck des Dienstes, gesetzlichen Pflichten und Aufbewahrungsregeln. Die Ombudsstelle berät Sie dabei.",
      ] },
      { title: "Zugang, Weitergabe und Cookies", paragraphs: [
        "Sie können auf Ihre eigenen Daten zugreifen. Befugte Mitarbeitende sehen nur die zur Bearbeitung erforderlichen Angaben. Wenn freigeschaltet, erhält die Studiengangskoordination eine eingeschränkte Ansicht ohne CPF, Dokumente oder interne Kommentare.",
        "Supabase (Authentifizierung, Datenbank und Speicherung) und Vercel (Hosting) sind technische Dienstleister. Pronto! verkauft keine Daten und nutzt sie nicht für Marketing.",
        "Notwendige Cookies erhalten Ihre Sitzung. Der Browser kann Ihre Designeinstellung und einen lokalen Entwurf speichern. Wir nutzen keine Werbe-Cookies und keine eigenen Werkzeuge zur Analyse Ihres Surfverhaltens.",
      ] },
      { title: "Schutz und Aufbewahrungsfristen", paragraphs: [
        "Wir verwenden geschützte Verbindungen, Authentifizierung, rollenbasierten Zugriff und Aktionsprotokolle zur Risikominderung. Konto, CPF, Geburtsdatum, E-Mail und akademische Vorgänge werden während Ihrer Zugehörigkeit zur Universität und insgesamt 100 Jahre als Teil Ihrer individuellen Studierendenakte aufbewahrt. Für Anfrage, Metadaten, Katalogeintrag, offene Punkte und Freigabe gilt dieselbe Frist.",
        "Das Nada Consta in Pronto! dient nur der Prüfung und wird 60 Tage nach Abschluss des Vorgangs gelöscht; der langfristige Nachweis verbleibt in Pergamum. Verwaltungs- und Betriebsprüfungen: 5 Jahre; technische Protokolle: 6 Monate; Vorfälle: 5 Jahre nach Untersuchung; Sicherungen: 90 Tage, sofern keine längere Aufbewahrung erforderlich ist.",
      ] },
    ],
    controllerLabel: "Verantwortliche Stelle:", controller: "Bundesuniversität Bahia (UFBA), vertreten durch die Bibliothek der Fakultät für Architektur.",
    serviceLabel: "Kontakt des Dienstes:", officerLabel: "Datenschutzbeauftragte der UFBA:", officer: "Ana Cláudia Caldas Mendonça Semêdo",
    institutionalChannel: "institutioneller Kontakt", informationPrefix: "Informationen der Universität zum Datenschutz finden Sie auf der",
    informationLink: "LGPD-Seite der UFBA",
    legalBasis: "Die Verarbeitung beruht auf der Erfüllung einer gesetzlichen oder regulatorischen Pflicht und dient dem öffentlichen Auftrag der UFBA-Bibliothek.",
  },
  fr: {
    version: "Politique de confidentialité · version", updated: "dernière mise à jour",
    heading: "La confidentialité, en termes clairs.",
    lead: "Découvrez ici, sans jargon juridique, comment Pronto! utilise et protège les informations nécessaires au service.",
    summaryLabel: "Résumé de la politique", detailsLabel: "Détails de la politique de confidentialité",
    summary: [
      ["Seulement le nécessaire", "Les données indispensables à votre compte et à votre demande."],
      ["Le travail complet reste ailleurs", "Le PDF complet n’est pas envoyé à Pronto!."],
      ["Nada Consta temporaire", "Le fichier de vérification est supprimé après 60 jours."],
    ],
    sections: [
      { title: "Données et finalités", paragraphs: [
        "Nous pouvons traiter votre nom, adresse électronique institutionnelle, numéro d’identification brésilien CPF, date de naissance, inscription ou lien universitaire, données de la demande, lien public vers le travail et informations relatives au service. La bibliothèque ne peut pas voir votre mot de passe.",
        "Ces données servent à vous identifier, à sécuriser votre compte, à recevoir et traiter votre demande de notice de catalogage, à guider l’auto-dépôt et à enregistrer les actions nécessaires à la continuité du service. Votre date de naissance complète est conservée dans votre compte. Lors de la demande, vous pouvez autoriser l’utilisation de votre seule année de naissance pour distinguer des personnes portant le même nom. Sans cette autorisation, l’année ne figure pas dans la notice. Même avec autorisation, la bibliothèque vérifie l’année avant de l’inclure.",
      ] },
      { title: "Responsable, base juridique et contact", paragraphs: [] },
      { title: "Vos droits", paragraphs: [
        "Vous pouvez confirmer le traitement, accéder à vos données et les corriger ; demander leur anonymisation, leur blocage ou leur suppression lorsque cela s’applique ; connaître les partages ; demander la portabilité si elle s’applique ; saisir l’autorité brésilienne de protection des données (ANPD) et vous opposer à un traitement irrégulier.",
        "Certaines demandes dépendent de la mission de service public, des obligations légales et des règles de conservation. Le service de médiation peut vous orienter.",
      ] },
      { title: "Accès, partage et cookies", paragraphs: [
        "Vous accédez à vos propres données. Le personnel autorisé ne voit que les informations nécessaires au traitement de la demande. Lorsqu’elle y est habilitée, la coordination dispose d’une vue limitée, sans CPF, documents ni commentaires internes.",
        "Supabase (authentification, base de données et stockage) et Vercel (hébergement) agissent comme prestataires techniques. Pronto! ne vend pas les données et ne les utilise pas à des fins commerciales.",
        "Les cookies essentiels maintiennent votre session. Le navigateur peut conserver votre préférence de thème et un brouillon local. Nous n’utilisons ni cookies publicitaires ni outils propres d’analyse de navigation.",
      ] },
      { title: "Protection et durées de conservation", paragraphs: [
        "Nous utilisons une connexion sécurisée, l’authentification, un contrôle d’accès par profil et des journaux d’actions pour réduire les risques. Le compte, le CPF, la date de naissance, l’adresse électronique et le dossier universitaire sont conservés tant que le lien avec l’université existe et, au total, pendant 100 ans, comme dossier individuel de l’étudiant. La demande, les métadonnées, la notice, les éléments en attente et l’homologation suivent la même durée.",
        "Dans Pronto!, le Nada Consta n’est qu’un fichier de vérification, supprimé 60 jours après la clôture ; l’enregistrement durable reste dans Pergamum. Audits administratifs et opérationnels : 5 ans ; journaux techniques : 6 mois ; incidents : 5 ans après investigation ; sauvegardes : 90 jours, sauf nécessité de conservation.",
      ] },
    ],
    controllerLabel: "Responsable du traitement :", controller: "Université fédérale de Bahia (UFBA), par l’intermédiaire de la Bibliothèque de la Faculté d’architecture.",
    serviceLabel: "Contact du service :", officerLabel: "Déléguée à la protection des données de l’UFBA :", officer: "Ana Cláudia Caldas Mendonça Semêdo",
    institutionalChannel: "contact institutionnel", informationPrefix: "Les informations institutionnelles sur la protection des données figurent sur la",
    informationLink: "page LGPD de l’UFBA",
    legalBasis: "Le traitement repose sur le respect d’une obligation légale ou réglementaire et répond à la mission de service public de la bibliothèque de l’UFBA.",
  },
  it: {
    version: "Informativa sulla privacy · versione", updated: "ultimo aggiornamento",
    heading: "La privacy, spiegata con chiarezza.",
    lead: "Qui trovi, senza linguaggio giuridico, come Pronto! utilizza e protegge le informazioni necessarie al servizio.",
    summaryLabel: "Riepilogo dell’informativa", detailsLabel: "Dettagli dell’informativa sulla privacy",
    summary: [
      ["Solo il necessario", "Dati indispensabili per il tuo account e la tua richiesta."],
      ["Il lavoro completo resta altrove", "Il PDF completo non viene inviato a Pronto!."],
      ["Nada Consta temporaneo", "Il file di verifica viene eliminato dopo 60 giorni."],
    ],
    sections: [
      { title: "Dati e finalità", paragraphs: [
        "Possiamo trattare nome, e-mail istituzionale, numero identificativo brasiliano CPF, data di nascita, matricola o rapporto accademico, dati della richiesta, link pubblico al lavoro e informazioni sul servizio. La biblioteca non può vedere la tua password.",
        "Usiamo questi dati per identificarti, proteggere il tuo account, ricevere e gestire la richiesta della scheda catalografica, guidare l’autodeposito e registrare le azioni necessarie alla continuità del servizio. La data di nascita completa è conservata nell’account. Quando richiedi la scheda, puoi autorizzare l’uso del solo anno di nascita per distinguere persone con lo stesso nome. Senza tale autorizzazione, l’anno non viene usato nella scheda. Anche con l’autorizzazione, la biblioteca verifica l’anno prima di inserirlo.",
      ] },
      { title: "Titolare, base giuridica e contatti", paragraphs: [] },
      { title: "I tuoi diritti", paragraphs: [
        "Puoi ottenere conferma del trattamento, accedere ai dati e correggerli; chiedere anonimizzazione, blocco o cancellazione nei casi previsti; conoscere le comunicazioni dei dati; chiedere la portabilità quando applicabile; presentare un’istanza all’autorità brasiliana per la protezione dei dati (ANPD) e opporti a trattamenti irregolari.",
        "Alcune richieste dipendono dalla finalità pubblica, dagli obblighi di legge e dalle regole di conservazione. L’ufficio del difensore civico può fornire orientamento.",
      ] },
      { title: "Accesso, condivisione e cookie", paragraphs: [
        "Puoi accedere ai tuoi dati. Il personale autorizzato vede solo quanto serve per gestire la richiesta. Se abilitato, il coordinamento riceve una vista limitata, senza CPF, documenti o commenti interni.",
        "Supabase (autenticazione, database e archiviazione) e Vercel (hosting) agiscono come fornitori tecnici. Pronto! non vende i dati e non li usa per marketing.",
        "I cookie essenziali mantengono la sessione. Il browser può conservare la preferenza del tema e una bozza locale. Non usiamo cookie pubblicitari né strumenti propri di analisi della navigazione.",
      ] },
      { title: "Protezione e tempi di conservazione", paragraphs: [
        "Usiamo connessioni protette, autenticazione, controllo degli accessi per ruolo e registri delle azioni per ridurre i rischi. Account, CPF, data di nascita, e-mail e pratica accademica sono conservati finché dura il rapporto con l’università e, complessivamente, per 100 anni come parte del fascicolo individuale dello studente. Richiesta, metadati, scheda, pendenze e approvazione seguono lo stesso termine.",
        "Il Nada Consta in Pronto! è soltanto un file di verifica e viene eliminato 60 giorni dopo la chiusura; il registro a lungo termine resta in Pergamum. Verifiche amministrative e operative: 5 anni; log tecnici: 6 mesi; incidenti: 5 anni dopo l’indagine; backup: 90 giorni, salvo necessità di conservazione.",
      ] },
    ],
    controllerLabel: "Titolare del trattamento:", controller: "Università Federale di Bahia (UFBA), tramite la Biblioteca della Facoltà di Architettura.",
    serviceLabel: "Contatto del servizio:", officerLabel: "Responsabile della protezione dei dati UFBA:", officer: "Ana Cláudia Caldas Mendonça Semêdo",
    institutionalChannel: "contatto istituzionale", informationPrefix: "Le informazioni istituzionali sulla protezione dei dati sono disponibili nella",
    informationLink: "pagina LGPD della UFBA",
    legalBasis: "Il trattamento si fonda sull’adempimento di un obbligo legale o regolamentare e risponde alla finalità pubblica di erogare il servizio bibliotecario della UFBA.",
  },
};
