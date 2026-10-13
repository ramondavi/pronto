import { articleHtml, helpArticles, type KnowledgeEntry, type KnowledgeItem, type KnowledgeSection, type KnowledgeTranslation } from "@/lib/knowledge-base";
import type { InterfaceLanguage } from "@/lib/interface-language";

type OtherLanguage = Exclude<InterfaceLanguage, "pt">;
type ShortCopy = { title: string; summary: string; body?: string[] };
type SectionCopy = { title: string; paragraphs?: string[]; steps?: string[]; links?: string[] };
type ArticleCopy = { title: string; summary: string; sections: SectionCopy[] };

const shortCopy: Record<string, Record<OtherLanguage, ShortCopy>> = {
  "Preciso enviar o PDF do trabalho?": {
    en: { title: "Do I need to upload the work PDF?", summary: "No. Provide a public link to the final work; the full PDF is not uploaded to Pronto!." },
    es: { title: "¿Debo enviar el PDF del trabajo?", summary: "No. Proporcione un enlace público al trabajo final; el PDF completo no se envía a Pronto!." },
    de: { title: "Muss ich die PDF-Datei der Arbeit hochladen?", summary: "Nein. Geben Sie einen öffentlichen Link zur endgültigen Arbeit an; das vollständige PDF wird nicht an Pronto! gesendet." },
    fr: { title: "Dois-je envoyer le PDF du travail ?", summary: "Non. Indiquez un lien public vers le travail final ; le PDF complet n’est pas envoyé à Pronto!." },
    it: { title: "Devo inviare il PDF del lavoro?", summary: "No. Fornisci un link pubblico al lavoro finale; il PDF completo non viene inviato a Pronto!." },
  },
  "Quando a ficha fica disponível?": {
    en: { title: "When is the catalog record available?", summary: "After the library approves the record and accepts the Nada Consta." },
    es: { title: "¿Cuándo está disponible la ficha?", summary: "Después de que la biblioteca apruebe la ficha y el Nada Consta." },
    de: { title: "Wann ist der Katalogeintrag verfügbar?", summary: "Nachdem die Bibliothek den Eintrag und das Nada Consta genehmigt hat." },
    fr: { title: "Quand la notice est-elle disponible ?", summary: "Après validation de la notice et du Nada Consta par la bibliothèque." },
    it: { title: "Quando è disponibile la scheda?", summary: "Dopo che la biblioteca ha approvato la scheda e il Nada Consta." },
  },
  "Quem pode usar o Pronto!?": {
    en: { title: "Who can use Pronto!?", summary: "UFBA students who need a catalog record and self-deposit guidance, as well as authorized BIB/FA staff." },
    es: { title: "¿Quién puede usar Pronto!?", summary: "Estudiantes de la UFBA que necesitan una ficha catalográfica y orientación para el autodepósito, además del personal autorizado de BIB/FA." },
    de: { title: "Wer kann Pronto! nutzen?", summary: "UFBA-Studierende, die einen Katalogeintrag und Hilfe bei der Selbsteinreichung benötigen, sowie befugtes BIB/FA-Personal." },
    fr: { title: "Qui peut utiliser Pronto! ?", summary: "Les étudiants de l’UFBA ayant besoin d’une notice de catalogage et d’aide à l’auto-dépôt, ainsi que le personnel autorisé de la BIB/FA." },
    it: { title: "Chi può usare Pronto!?", summary: "Gli studenti UFBA che hanno bisogno di una scheda catalografica e di indicazioni per l’autodeposito, oltre al personale BIB/FA autorizzato." },
  },
  "O trabalho completo é enviado ao Pronto!?": {
    en: { title: "Is the full work uploaded to Pronto!?", summary: "No. You provide a public link for review. The full PDF stays on your device when the catalog record is inserted." },
    es: { title: "¿Se envía el trabajo completo a Pronto!?", summary: "No. Proporcione un enlace público para la revisión. El PDF completo permanece en su dispositivo al insertar la ficha." },
    de: { title: "Wird die vollständige Arbeit an Pronto! gesendet?", summary: "Nein. Sie geben einen öffentlichen Link zur Prüfung an. Das vollständige PDF bleibt beim Einfügen des Katalogeintrags auf Ihrem Gerät." },
    fr: { title: "Le travail complet est-il envoyé à Pronto! ?", summary: "Non. Vous fournissez un lien public pour l’examen. Le PDF complet reste sur votre appareil lors de l’insertion de la notice." },
    it: { title: "Il lavoro completo viene inviato a Pronto!?", summary: "No. Fornisci un link pubblico per la verifica. Il PDF completo resta sul tuo dispositivo quando inserisci la scheda." },
  },
  "Quando posso baixar a ficha?": {
    en: { title: "When can I download the catalog record?", summary: "After the library approves the record and the Nada Consta is accepted." },
    es: { title: "¿Cuándo puedo descargar la ficha?", summary: "Después de que la biblioteca apruebe la ficha y valide el Nada Consta." },
    de: { title: "Wann kann ich den Katalogeintrag herunterladen?", summary: "Nachdem die Bibliothek den Eintrag und das Nada Consta genehmigt hat." },
    fr: { title: "Quand puis-je télécharger la notice ?", summary: "Après validation de la notice et du Nada Consta par la bibliothèque." },
    it: { title: "Quando posso scaricare la scheda?", summary: "Dopo l’approvazione della scheda e del Nada Consta da parte della biblioteca." },
  },
  "O sistema deposita o trabalho automaticamente no RI/UFBA?": {
    en: { title: "Does Pronto! deposit the work in RI/UFBA automatically?", summary: "No. Pronto! provides guidance and reuses metadata, but you deposit the work and choose its license in the Institutional Repository." },
    es: { title: "¿Pronto! deposita el trabajo automáticamente en el RI/UFBA?", summary: "No. Pronto! orienta y reutiliza metadatos, pero usted deposita el trabajo y elige la licencia en el Repositorio Institucional." },
    de: { title: "Reicht Pronto! die Arbeit automatisch im RI/UFBA ein?", summary: "Nein. Pronto! bietet Anleitung und übernimmt Metadaten, aber Sie reichen die Arbeit selbst ein und wählen die Lizenz im Repositorium." },
    fr: { title: "Pronto! dépose-t-il automatiquement le travail dans le RI/UFBA ?", summary: "Non. Pronto! vous guide et reprend des métadonnées, mais vous déposez le travail et choisissez la licence dans le dépôt institutionnel." },
    it: { title: "Pronto! deposita automaticamente il lavoro nel RI/UFBA?", summary: "No. Pronto! offre indicazioni e riutilizza i metadati, ma sei tu a depositare il lavoro e scegliere la licenza nel repository." },
  },
  "O PDF final é automaticamente certificado como PDF/A?": {
    en: { title: "Is the final PDF automatically certified as PDF/A?", summary: "No. The browser generates the final file, but you must check or convert it to PDF/A if required by RI/UFBA." },
    es: { title: "¿El PDF final se certifica automáticamente como PDF/A?", summary: "No. El navegador genera el archivo final, pero usted debe comprobarlo o convertirlo a PDF/A si el RI/UFBA lo exige." },
    de: { title: "Wird das endgültige PDF automatisch als PDF/A zertifiziert?", summary: "Nein. Der Browser erstellt die Datei; falls RI/UFBA PDF/A verlangt, müssen Sie sie prüfen oder konvertieren." },
    fr: { title: "Le PDF final est-il automatiquement certifié PDF/A ?", summary: "Non. Le navigateur produit le fichier final, mais vous devez le vérifier ou le convertir en PDF/A si le RI/UFBA l’exige." },
    it: { title: "Il PDF finale è certificato automaticamente come PDF/A?", summary: "No. Il browser genera il file finale, ma devi verificarlo o convertirlo in PDF/A se richiesto dal RI/UFBA." },
  },
  "Como acompanho uma correção solicitada?": {
    en: { title: "How do I follow a requested correction?", summary: "Open your request in the dashboard. Only the fields returned by the library will be available for correction." },
    es: { title: "¿Cómo sigo una corrección solicitada?", summary: "Abra su solicitud en el panel. Solo los campos devueltos por la biblioteca estarán disponibles para corrección." },
    de: { title: "Wie verfolge ich eine angeforderte Korrektur?", summary: "Öffnen Sie Ihre Anfrage im Dashboard. Nur die von der Bibliothek zurückgegebenen Felder können korrigiert werden." },
    fr: { title: "Comment suivre une correction demandée ?", summary: "Ouvrez votre demande dans le tableau de bord. Seuls les champs renvoyés par la bibliothèque pourront être corrigés." },
    it: { title: "Come seguo una correzione richiesta?", summary: "Apri la richiesta nel pannello. Solo i campi restituiti dalla biblioteca saranno modificabili." },
  },
  "Por que preciso informar a matrícula em cada nova solicitação?": {
    en: { title: "Why must I enter my student registration number for every new request?", summary: "The number identifies the academic program linked to that request. You can use the same account with another number if you start a different course or degree.", body: ["The registration number identifies the academic affiliation to which that catalog record belongs. Your Pronto! account stays the same, but your number may change if you start another course or degree.", "Enter the number for your current affiliation in each new request. This keeps each case linked to the correct course and registration without changing your account or earlier requests."] },
    es: { title: "¿Por qué debo indicar la matrícula en cada nueva solicitud?", summary: "La matrícula identifica el vínculo académico de esa solicitud. Puede usar la misma cuenta con otra matrícula si inicia otro curso o grado.", body: ["La matrícula identifica el vínculo académico al que corresponde la ficha de esa solicitud. Su cuenta de Pronto! sigue siendo la misma, pero la matrícula puede cambiar si inicia otro curso o grado.", "Indique la matrícula de su vínculo actual en cada nueva solicitud. Así cada expediente queda asociado al curso y matrícula correctos sin modificar su cuenta ni las solicitudes anteriores."] },
    de: { title: "Warum muss ich bei jeder neuen Anfrage meine Matrikelnummer angeben?", summary: "Die Nummer kennzeichnet den Studiengang der Anfrage. Sie können dasselbe Konto mit einer anderen Nummer für einen neuen Studiengang nutzen.", body: ["Die Matrikelnummer kennzeichnet die akademische Zugehörigkeit, auf die sich der Katalogeintrag bezieht. Ihr Pronto!-Konto bleibt gleich; die Nummer kann sich bei einem neuen Studiengang oder Abschluss ändern.", "Geben Sie bei jeder neuen Anfrage die aktuelle Nummer an. So bleibt jeder Vorgang dem richtigen Studiengang zugeordnet, ohne Ihr Konto oder frühere Anfragen zu ändern."] },
    fr: { title: "Pourquoi indiquer mon numéro d’inscription à chaque nouvelle demande ?", summary: "Ce numéro identifie le cursus lié à la demande. Vous pouvez garder le même compte avec un autre numéro pour une nouvelle formation.", body: ["Le numéro d’inscription identifie le lien universitaire auquel se rapporte la notice de cette demande. Votre compte Pronto! reste le même, mais ce numéro peut changer si vous commencez une autre formation ou un autre diplôme.", "Indiquez le numéro correspondant à votre inscription actuelle dans chaque nouvelle demande. Chaque dossier reste ainsi lié au bon cursus sans modifier votre compte ni les demandes précédentes."] },
    it: { title: "Perché devo indicare la matricola in ogni nuova richiesta?", summary: "La matricola identifica il percorso accademico della richiesta. Puoi usare lo stesso account con un’altra matricola se inizi un nuovo corso o grado.", body: ["La matricola identifica il percorso accademico a cui si riferisce la scheda. L’account Pronto! resta lo stesso, ma la matricola può cambiare se inizi un altro corso o grado.", "Inserisci la matricola del percorso attuale in ogni nuova richiesta. Ogni pratica rimane così collegata al corso corretto senza modificare l’account o le richieste precedenti."] },
  },
  "Preciso informar a matrícula novamente?": {
    en: { title: "Do I need to enter my registration number again?", summary: "Yes. Each request uses the number for your current academic affiliation; your account and earlier requests stay the same.", body: ["Yes. Enter the number for the course or degree linked to the new request. It may change during your studies, while your Pronto! account and earlier requests remain."] },
    es: { title: "¿Debo indicar la matrícula de nuevo?", summary: "Sí. Cada solicitud utiliza la matrícula de su vínculo académico actual; su cuenta y solicitudes anteriores no cambian.", body: ["Sí. Indique la matrícula del curso o grado correspondiente a la nueva solicitud. Puede cambiar durante sus estudios, mientras su cuenta y expedientes anteriores permanecen en Pronto!."] },
    de: { title: "Muss ich die Matrikelnummer erneut angeben?", summary: "Ja. Jede Anfrage nutzt die Nummer Ihres aktuellen Studiengangs; Ihr Konto und frühere Vorgänge bleiben bestehen.", body: ["Ja. Geben Sie die Nummer des Studiengangs oder Abschlusses für die neue Anfrage an. Sie kann sich im Lauf Ihres Studiums ändern; Ihr Konto und frühere Vorgänge bleiben erhalten."] },
    fr: { title: "Dois-je saisir à nouveau mon numéro d’inscription ?", summary: "Oui. Chaque demande utilise le numéro de votre cursus actuel ; votre compte et vos demandes précédentes restent inchangés.", body: ["Oui. Indiquez le numéro du cursus ou du diplôme concerné par la nouvelle demande. Il peut changer pendant vos études, tandis que votre compte et vos dossiers précédents restent dans Pronto!."] },
    it: { title: "Devo indicare di nuovo la matricola?", summary: "Sì. Ogni richiesta usa la matricola del percorso attuale; il tuo account e le richieste precedenti restano invariati.", body: ["Sì. Inserisci la matricola del corso o grado della nuova richiesta. Può cambiare nel tempo, mentre account e richieste precedenti rimangono in Pronto!."] },
  },
};

const section = (title: string, paragraphs?: string[], steps?: string[], links?: string[]): SectionCopy => ({ title, paragraphs, steps, links });
const articleCopy: Record<string, Record<OtherLanguage, ArticleCopy>> = {
  "compartilhar-link-publico": {
    en: { title: "How to share a public link to your work", summary: "Create a link that lets the library open the PDF without requesting access.", sections: [
      section("Before sharing", ["Use the final PDF. Share only that file or a folder containing only that file. Anyone with the public link can open it; do not expose other documents."]),
      section("Correct permissions", ["Allow anyone with the link to view, without editing. Test the link in a private browser window before adding it to the form."]),
      section("Avoid these settings", ["Do not restrict access to your email or UFBA, allow editing, or require a password, code or expiry date. If public sharing is blocked, use another permitted service."]),
      section("Google Drive", undefined, ["Select the PDF and choose Share.", "Under General access, choose Anyone with the link.", "Set the role to Viewer, without editing rights.", "Choose Copy link, then Done."], ["Official Google Drive instructions"]),
      section("Microsoft OneDrive", ["Institutional accounts may block the Anyone option. If it is unavailable, use another permitted service."], ["Select the PDF and choose Share.", "Open link settings and choose Anyone.", "Turn off Allow editing; keep view access only.", "Choose Apply, then Copy link."], ["Official OneDrive instructions"]),
      section("Dropbox", undefined, ["Select the PDF and choose Share.", "Choose Copy link and open Manage in the link options.", "Choose Link for viewing, without editing.", "Copy the viewing link."], ["Official Dropbox instructions"]),
      section("iCloud Drive", undefined, ["Open the PDF menu in iCloud Drive and choose Share.", "Choose Anyone with the link for access.", "Choose View and download only.", "Create and copy the link."], ["Official iCloud Drive instructions"]),
      section("Proton Drive", ["Do not enable a password or expiry date: the library must be able to open the file."], ["Select the PDF and choose Share.", "Enable Create public link.", "Choose Viewer, not Editor.", "Choose Copy link."], ["Official Proton Drive instructions"]),
      section("Nextcloud", ["Options depend on the server. If public links are disabled, contact its administrator or use another permitted service."], ["Select the PDF and open Share.", "Create a public link.", "Choose read-only access, without editing or uploads.", "Copy the public link."], ["Official Nextcloud sharing manual"]),
      section("Test before submitting", undefined, ["Open a private browser window without signing in.", "Check that the PDF opens without login, approval, password or emailed code.", "Confirm it is the complete final version.", "Paste the https:// address into the Public link to full work field and submit your request."]),
      section("If the test fails", ["Review permissions and create a new link. Do not submit one that only you can open or that requires approval or a private password. Pronto! receives only the link and does not store the full PDF."]),
    ] },
    es: { title: "Cómo compartir el enlace público del trabajo", summary: "Cree un enlace que permita a la biblioteca abrir el PDF sin solicitar acceso.", sections: [
      section("Antes de compartir", ["Use el PDF final. Comparta solo ese archivo o una carpeta que lo contenga exclusivamente. Cualquiera con el enlace público podrá abrirlo; no exponga otros documentos."]),
      section("Permisos correctos", ["Permita que cualquier persona con el enlace lo vea, sin editarlo. Pruebe el enlace en una ventana privada antes de indicarlo en el formulario."]),
      section("Evite estas configuraciones", ["No limite el acceso a su correo o a la UFBA, ni permita editar, exija contraseña o código, ni configure vencimiento. Si el acceso público está bloqueado, use otro servicio permitido."]),
      section("Google Drive", undefined, ["Seleccione el PDF y pulse Compartir.", "En Acceso general, elija Cualquier persona con el enlace.", "Elija Lector, sin permiso de edición.", "Pulse Copiar enlace y luego Listo."], ["Instrucciones oficiales de Google Drive"]),
      section("Microsoft OneDrive", ["Las cuentas institucionales pueden bloquear la opción Cualquier persona. Si no aparece, use otro servicio permitido."], ["Seleccione el PDF y pulse Compartir.", "Abra la configuración del enlace y elija Cualquier persona.", "Desactive Permitir edición.", "Pulse Aplicar y luego Copiar enlace."], ["Instrucciones oficiales de OneDrive"]),
      section("Dropbox", undefined, ["Seleccione el PDF y pulse Compartir.", "Pulse Copiar enlace y abra Administrar en las opciones.", "Elija Enlace para visualización, sin edición.", "Copie el enlace de visualización."], ["Instrucciones oficiales de Dropbox"]),
      section("iCloud Drive", undefined, ["Abra el menú del PDF en iCloud Drive y elija Compartir.", "Elija Cualquier persona con el enlace.", "Elija Solo ver y descargar.", "Cree y copie el enlace."], ["Instrucciones oficiales de iCloud Drive"]),
      section("Proton Drive", ["No active contraseña ni fecha de vencimiento: la biblioteca debe poder abrir el archivo."], ["Seleccione el PDF y pulse Compartir.", "Active Crear enlace público.", "Elija Visualizador, no Editor.", "Pulse Copiar enlace."], ["Instrucciones oficiales de Proton Drive"]),
      section("Nextcloud", ["Las opciones dependen del servidor. Si se desactivaron los enlaces públicos, contacte al administrador o use otro servicio permitido."], ["Seleccione el PDF y abra Compartir.", "Cree un enlace público.", "Elija Solo lectura, sin edición ni carga.", "Copie el enlace público."], ["Manual oficial de Nextcloud"]),
      section("Pruebe antes de enviar", undefined, ["Abra una ventana privada sin iniciar sesión.", "Compruebe que el PDF se abre sin inicio de sesión, autorización, contraseña o código por correo.", "Confirme que es la versión final y completa.", "Pegue el enlace https:// en el campo Enlace público del trabajo completo y envíe la solicitud."]),
      section("Si falla la prueba", ["Revise los permisos y cree otro enlace. No envíe uno que solo usted pueda abrir o que requiera autorización o contraseña privada. Pronto! recibe únicamente el enlace y no almacena el PDF completo."]),
    ] },
    de: { title: "So teilen Sie einen öffentlichen Link zur Arbeit", summary: "Erstellen Sie einen Link, mit dem die Bibliothek das PDF ohne Freigabeanfrage öffnen kann.", sections: [
      section("Vor dem Teilen", ["Verwenden Sie das endgültige PDF. Teilen Sie nur diese Datei oder einen Ordner, der ausschließlich sie enthält. Jeder mit dem öffentlichen Link kann sie öffnen; geben Sie keine weiteren Dokumente frei."]),
      section("Richtige Berechtigungen", ["Erlauben Sie jedem mit dem Link nur die Ansicht. Testen Sie den Link in einem privaten Browserfenster, bevor Sie ihn im Formular angeben."]),
      section("Diese Einstellungen vermeiden", ["Beschränken Sie den Zugriff nicht auf Ihre E-Mail oder die UFBA. Erlauben Sie keine Bearbeitung und verlangen Sie weder Passwort noch Code oder Ablaufdatum. Wenn öffentliche Links gesperrt sind, nutzen Sie einen anderen zulässigen Dienst."]),
      section("Google Drive", undefined, ["Wählen Sie das PDF und dann Teilen.", "Wählen Sie unter Allgemeiner Zugriff Jeder mit dem Link.", "Wählen Sie Betrachter ohne Bearbeitungsrecht.", "Klicken Sie auf Link kopieren und Fertig."], ["Offizielle Google-Drive-Anleitung"]),
      section("Microsoft OneDrive", ["Bei institutionellen Konten kann die Option Jeder gesperrt sein. Nutzen Sie dann einen anderen zulässigen Dienst."], ["Wählen Sie das PDF und Teilen.", "Öffnen Sie die Linkeinstellungen und wählen Sie Jeder.", "Deaktivieren Sie Bearbeitung zulassen.", "Klicken Sie auf Anwenden und Link kopieren."], ["Offizielle OneDrive-Anleitung"]),
      section("Dropbox", undefined, ["Wählen Sie das PDF und Teilen.", "Kopieren Sie den Link und öffnen Sie Verwalten.", "Wählen Sie einen Link zum Ansehen ohne Bearbeitungsrecht.", "Kopieren Sie diesen Link."], ["Offizielle Dropbox-Anleitung"]),
      section("iCloud Drive", undefined, ["Öffnen Sie das PDF-Menü in iCloud Drive und wählen Sie Teilen.", "Wählen Sie Jeder mit dem Link.", "Wählen Sie Nur anzeigen und laden.", "Erstellen und kopieren Sie den Link."], ["Offizielle iCloud-Drive-Anleitung"]),
      section("Proton Drive", ["Aktivieren Sie weder Passwort noch Ablaufdatum: Die Bibliothek muss die Datei öffnen können."], ["Wählen Sie das PDF und Teilen.", "Aktivieren Sie Öffentlichen Link erstellen.", "Wählen Sie Betrachter, nicht Editor.", "Kopieren Sie den Link."], ["Offizielle Proton-Drive-Anleitung"]),
      section("Nextcloud", ["Die Optionen hängen vom Server ab. Falls öffentliche Links deaktiviert sind, kontaktieren Sie die Verwaltung oder nutzen Sie einen anderen zulässigen Dienst."], ["Wählen Sie das PDF und Teilen.", "Erstellen Sie einen öffentlichen Link.", "Wählen Sie Nur lesen ohne Bearbeitung oder Upload.", "Kopieren Sie den öffentlichen Link."], ["Offizielles Nextcloud-Handbuch"]),
      section("Link vor dem Absenden testen", undefined, ["Öffnen Sie ein privates Browserfenster ohne Anmeldung.", "Prüfen Sie, ob das PDF ohne Login, Freigabe, Passwort oder E-Mail-Code öffnet.", "Prüfen Sie die vollständige Endfassung.", "Fügen Sie die https://-Adresse im Feld Öffentlicher Link zur vollständigen Arbeit ein und senden Sie die Anfrage ab."]),
      section("Wenn der Test fehlschlägt", ["Überprüfen Sie die Berechtigungen und erstellen Sie einen neuen Link. Reichen Sie keinen Link ein, der nur für Sie funktioniert oder Freigabe beziehungsweise ein privates Passwort erfordert. Pronto! erhält nur den Link und speichert das vollständige PDF nicht."]),
    ] },
    fr: { title: "Comment partager le lien public du travail", summary: "Créez un lien permettant à la bibliothèque d’ouvrir le PDF sans demander d’accès.", sections: [
      section("Avant le partage", ["Utilisez le PDF définitif. Partagez uniquement ce fichier ou un dossier qui ne contient que lui. Toute personne disposant du lien public peut l’ouvrir ; n’exposez pas d’autres documents."]),
      section("Autorisations correctes", ["Autorisez toute personne ayant le lien à consulter le fichier, sans modification. Testez le lien dans une fenêtre privée avant de l’indiquer dans le formulaire."]),
      section("Réglages à éviter", ["Ne limitez pas l’accès à votre adresse ou à l’UFBA. N’autorisez pas la modification et n’imposez ni mot de passe, ni code, ni date d’expiration. Si le partage public est bloqué, utilisez un autre service autorisé."]),
      section("Google Drive", undefined, ["Sélectionnez le PDF puis Partager.", "Dans Accès général, choisissez Toute personne disposant du lien.", "Choisissez Lecteur, sans modification.", "Cliquez sur Copier le lien puis Terminé."], ["Instructions officielles de Google Drive"]),
      section("Microsoft OneDrive", ["L’option Toute personne peut être bloquée sur les comptes institutionnels. Utilisez alors un autre service autorisé."], ["Sélectionnez le PDF puis Partager.", "Ouvrez les paramètres du lien et choisissez Toute personne.", "Désactivez Autoriser la modification.", "Cliquez sur Appliquer puis Copier le lien."], ["Instructions officielles de OneDrive"]),
      section("Dropbox", undefined, ["Sélectionnez le PDF puis Partager.", "Copiez le lien et ouvrez Gérer dans ses options.", "Choisissez un lien de consultation, sans modification.", "Copiez ce lien."], ["Instructions officielles de Dropbox"]),
      section("iCloud Drive", undefined, ["Ouvrez le menu du PDF dans iCloud Drive puis Partager.", "Choisissez Toute personne disposant du lien.", "Choisissez Consultation et téléchargement uniquement.", "Créez et copiez le lien."], ["Instructions officielles d’iCloud Drive"]),
      section("Proton Drive", ["Ne définissez ni mot de passe ni expiration : la bibliothèque doit pouvoir ouvrir le fichier."], ["Sélectionnez le PDF puis Partager.", "Activez Créer un lien public.", "Choisissez Lecteur, pas Éditeur.", "Copiez le lien."], ["Instructions officielles de Proton Drive"]),
      section("Nextcloud", ["Les options dépendent du serveur. Si les liens publics sont désactivés, contactez son administrateur ou utilisez un autre service autorisé."], ["Sélectionnez le PDF puis Partager.", "Créez un lien public.", "Choisissez la lecture seule, sans modification ni ajout.", "Copiez le lien public."], ["Manuel officiel de Nextcloud"]),
      section("Testez avant d’envoyer", undefined, ["Ouvrez une fenêtre privée sans vous connecter.", "Vérifiez que le PDF s’ouvre sans connexion, autorisation, mot de passe ou code reçu par e-mail.", "Vérifiez que la version finale est complète.", "Collez l’adresse https:// dans le champ Lien public vers le travail complet et envoyez la demande."]),
      section("Si le test échoue", ["Vérifiez les autorisations et créez un nouveau lien. N’envoyez pas un lien qui fonctionne uniquement pour vous ou qui demande une autorisation ou un mot de passe privé. Pronto! ne reçoit que le lien et ne stocke pas le PDF complet."]),
    ] },
    it: { title: "Come condividere il link pubblico del lavoro", summary: "Crea un link che consenta alla biblioteca di aprire il PDF senza richiedere l’accesso.", sections: [
      section("Prima della condivisione", ["Usa il PDF finale. Condividi solo questo file o una cartella che contenga solo il file. Chiunque abbia il link pubblico può aprirlo; non esporre altri documenti."]),
      section("Autorizzazioni corrette", ["Consenti a chiunque abbia il link di visualizzare il file, senza modificarlo. Prova il link in una finestra privata prima di inserirlo nel modulo."]),
      section("Impostazioni da evitare", ["Non limitare l’accesso alla tua email o alla UFBA, non consentire modifiche e non impostare password, codici o scadenze. Se la condivisione pubblica è bloccata, usa un altro servizio consentito."]),
      section("Google Drive", undefined, ["Seleziona il PDF e scegli Condividi.", "In Accesso generale scegli Chiunque abbia il link.", "Imposta Visualizzatore, senza modifiche.", "Scegli Copia link e poi Fine."], ["Istruzioni ufficiali di Google Drive"]),
      section("Microsoft OneDrive", ["Gli account istituzionali possono bloccare l’opzione Chiunque. In tal caso usa un altro servizio consentito."], ["Seleziona il PDF e scegli Condividi.", "Apri le impostazioni del link e scegli Chiunque.", "Disattiva Consenti modifica.", "Scegli Applica e poi Copia link."], ["Istruzioni ufficiali di OneDrive"]),
      section("Dropbox", undefined, ["Seleziona il PDF e scegli Condividi.", "Copia il link e apri Gestisci nelle opzioni.", "Scegli un link di visualizzazione, senza modifiche.", "Copia il link di visualizzazione."], ["Istruzioni ufficiali di Dropbox"]),
      section("iCloud Drive", undefined, ["Apri il menu del PDF in iCloud Drive e scegli Condividi.", "Scegli Chiunque abbia il link.", "Scegli Solo visualizzazione e download.", "Crea e copia il link."], ["Istruzioni ufficiali di iCloud Drive"]),
      section("Proton Drive", ["Non attivare password o scadenza: la biblioteca deve poter aprire il file."], ["Seleziona il PDF e scegli Condividi.", "Attiva Crea link pubblico.", "Scegli Visualizzatore, non Editor.", "Copia il link."], ["Istruzioni ufficiali di Proton Drive"]),
      section("Nextcloud", ["Le opzioni dipendono dal server. Se i link pubblici sono disattivati, contatta l’amministratore o usa un altro servizio consentito."], ["Seleziona il PDF e apri Condividi.", "Crea un link pubblico.", "Scegli Sola lettura, senza modifiche o caricamenti.", "Copia il link pubblico."], ["Manuale ufficiale di Nextcloud"]),
      section("Prova il link prima di inviare", undefined, ["Apri una finestra privata senza accedere all’account.", "Controlla che il PDF si apra senza login, autorizzazione, password o codice email.", "Verifica che sia la versione finale completa.", "Incolla l’indirizzo https:// nel campo Link pubblico al lavoro completo e invia la richiesta."]),
      section("Se la prova fallisce", ["Controlla le autorizzazioni e crea un nuovo link. Non inviare un link accessibile solo a te o che richieda autorizzazione o password privata. Pronto! riceve solo il link e non archivia il PDF completo."]),
    ] },
  },
  "emitir-nada-consta": {
    en: { title: "How to obtain the Nada Consta", summary: "Learn when to request it in Meu Pergamum and how to submit it in Pronto!.", sections: [
      section("Before requesting it", ["The Nada Consta confirms that you have no outstanding items with UFBA libraries, such as books, keys or other borrowed materials. Resolve any issue before requesting it.", "Issuing it closes your UFBA library registration. You can no longer borrow items or request other services, although you may still consult the collection on site and use the reading room. Request it when completing your course or leaving the university entirely."]),
      section("Obtain it in Meu Pergamum", undefined, ["Sign in to UFBA’s Meu Pergamum.", "Request the Nada Consta. If you have outstanding items or cannot issue it, contact the library to resolve the issue.", "Save the issued Nada Consta as a PDF."], ["See the official BIB/FA issuance guide"]),
      section("Submit it in Pronto!", undefined, ["Return to your request in the Pronto! dashboard.", "In the Nada Consta upload area, choose a PDF up to 5 MB and select Submit Nada Consta.", "Follow the library’s review of the document in your dashboard."]),
    ] },
    es: { title: "Cómo obtener el Nada Consta", summary: "Sepa cuándo solicitarlo en Meu Pergamum y cómo enviarlo a Pronto!.", sections: [
      section("Antes de solicitarlo", ["El Nada Consta confirma que no tiene pendientes con las bibliotecas de la UFBA, como libros, llaves u otros materiales prestados. Regularice cualquier pendiente antes de pedirlo.", "Su emisión cierra su registro en las bibliotecas de la UFBA. Ya no podrá obtener préstamos ni otros servicios, aunque podrá consultar la colección en sala y usar la sala de lectura. Solicítelo al terminar el curso o al desvincularse por completo."]),
      section("Obténgalo en Meu Pergamum", undefined, ["Acceda a Meu Pergamum de la UFBA con sus credenciales.", "Solicite el Nada Consta. Si tiene pendientes o no puede emitirlo, contacte con la biblioteca.", "Guarde el Nada Consta en PDF."], ["Consulte la guía oficial de BIB/FA"]),
      section("Envíelo a Pronto!", undefined, ["Vuelva a su solicitud en el panel de Pronto!.", "En el área de envío del Nada Consta, elija un PDF de hasta 5 MB y pulse Enviar Nada Consta.", "Siga la revisión del documento por la biblioteca en el panel."]),
    ] },
    de: { title: "So erhalten Sie das Nada Consta", summary: "Erfahren Sie, wann Sie es in Meu Pergamum beantragen und wie Sie es bei Pronto! einreichen.", sections: [
      section("Vor dem Antrag", ["Das Nada Consta bestätigt, dass Sie keine offenen Verpflichtungen gegenüber den UFBA-Bibliotheken haben, etwa ausgeliehene Bücher, Schlüssel oder anderes Material. Klären Sie diese zuerst.", "Mit der Ausstellung endet Ihre Registrierung bei den UFBA-Bibliotheken. Ausleihen und weitere Dienste sind dann nicht mehr möglich; vor Ort können Sie den Bestand und den Lesesaal weiterhin nutzen. Beantragen Sie es zum Studienabschluss oder bei vollständigem Ausscheiden."]),
      section("In Meu Pergamum ausstellen", undefined, ["Melden Sie sich mit Ihren Zugangsdaten bei Meu Pergamum der UFBA an.", "Beantragen Sie das Nada Consta. Bei offenen Verpflichtungen oder Problemen wenden Sie sich an die Bibliothek.", "Speichern Sie das ausgestellte Dokument als PDF."], ["Offizielle Anleitung der BIB/FA ansehen"]),
      section("Bei Pronto! einreichen", undefined, ["Öffnen Sie Ihre Anfrage im Pronto!-Dashboard.", "Wählen Sie im Bereich Nada Consta ein PDF mit höchstens 5 MB und klicken Sie auf Einreichen.", "Verfolgen Sie die Prüfung durch die Bibliothek im Dashboard."]),
    ] },
    fr: { title: "Comment obtenir le Nada Consta", summary: "Découvrez quand le demander dans Meu Pergamum et comment l’envoyer à Pronto!.", sections: [
      section("Avant la demande", ["Le Nada Consta atteste que vous n’avez aucune obligation en attente auprès des bibliothèques de l’UFBA, notamment des livres, des clés ou d’autres objets empruntés. Réglez toute situation avant de le demander.", "Sa délivrance met fin à votre inscription aux bibliothèques de l’UFBA. Vous ne pourrez plus emprunter ni demander d’autres services, mais la consultation sur place et la salle de lecture restent accessibles. Demandez-le à la fin du cursus ou lors de votre départ définitif."]),
      section("Obtenez-le dans Meu Pergamum", undefined, ["Connectez-vous à Meu Pergamum de l’UFBA.", "Demandez le Nada Consta. En cas de problème ou d’obligation en attente, contactez la bibliothèque.", "Enregistrez le document délivré en PDF."], ["Consultez le guide officiel de la BIB/FA"]),
      section("Envoyez-le à Pronto!", undefined, ["Revenez à votre demande dans le tableau de bord Pronto!.", "Dans la zone d’envoi du Nada Consta, choisissez un PDF de 5 Mo maximum et cliquez sur Envoyer.", "Suivez la vérification du document par la bibliothèque dans le tableau de bord."]),
    ] },
    it: { title: "Come ottenere il Nada Consta", summary: "Scopri quando richiederlo su Meu Pergamum e come inviarlo a Pronto!.", sections: [
      section("Prima della richiesta", ["Il Nada Consta conferma che non hai pendenze con le biblioteche UFBA, come libri, chiavi o altri materiali in prestito. Regolarizza eventuali pendenze prima di richiederlo.", "Il rilascio chiude la tua iscrizione alle biblioteche UFBA. Non potrai più prendere libri in prestito o richiedere altri servizi, ma potrai consultare il patrimonio in sede e usare la sala lettura. Richiedilo alla fine del corso o quando lasci l’università."]),
      section("Ottienilo su Meu Pergamum", undefined, ["Accedi a Meu Pergamum UFBA con le tue credenziali.", "Richiedi il Nada Consta. Se hai pendenze o non riesci a ottenerlo, contatta la biblioteca.", "Salva il documento rilasciato in PDF."], ["Consulta la guida ufficiale BIB/FA"]),
      section("Invialo a Pronto!", undefined, ["Torna alla richiesta nel pannello Pronto!.", "Nell’area Nada Consta scegli un PDF fino a 5 MB e seleziona Invia Nada Consta.", "Segui la verifica della biblioteca nel pannello."]),
    ] },
  },
  "preparar-solicitacao": {
    en: { title: "How to prepare your request", summary: "Check what to gather before starting the form.", sections: [
      section("Before opening the form", ["Use the final version of your work, already defended or approved by the committee. When applicable, include the signed or scanned approval sheet."]),
      section("Step by step", undefined, ["Upload the file to a cloud service.", "Confirm that anyone with the link can open it.", "Gather the details exactly as they appear in the work.", "Start the form and resume your saved draft when needed."]),
      section("About the public link", ["You may use Google Drive, OneDrive or a similar service. Pronto! receives only the link; the full PDF is not uploaded to the system."]),
    ] },
    es: { title: "Cómo preparar su solicitud", summary: "Compruebe qué necesita antes de empezar el formulario.", sections: [
      section("Antes de abrir el formulario", ["Use la versión final del trabajo, ya defendida o aprobada por el jurado. Cuando corresponda, incluya el acta de aprobación firmada o digitalizada."]),
      section("Paso a paso", undefined, ["Aloje el archivo en un servicio en la nube.", "Compruebe que cualquiera con el enlace pueda abrirlo.", "Reúna los datos exactamente como aparecen en el trabajo.", "Inicie el formulario y retome el borrador cuando lo necesite."]),
      section("Sobre el enlace público", ["Puede utilizar Google Drive, OneDrive u otros servicios equivalentes. Pronto! recibe solo el enlace; el PDF completo no se envía al sistema."]),
    ] },
    de: { title: "So bereiten Sie Ihre Anfrage vor", summary: "Prüfen Sie, was Sie vor dem Formular bereitlegen sollten.", sections: [
      section("Vor dem Ausfüllen", ["Verwenden Sie die endgültige, bereits verteidigte oder vom Prüfungsausschuss genehmigte Fassung. Falls erforderlich, muss das unterzeichnete oder gescannte Genehmigungsblatt enthalten sein."]),
      section("Schritt für Schritt", undefined, ["Laden Sie die Datei in einen Clouddienst hoch.", "Prüfen Sie, ob jeder mit dem Link sie öffnen kann.", "Halten Sie die Angaben genau wie in der Arbeit bereit.", "Beginnen Sie das Formular und setzen Sie den Entwurf bei Bedarf fort."]),
      section("Zum öffentlichen Link", ["Google Drive, OneDrive und vergleichbare Dienste sind möglich. Pronto! erhält nur den Link; das vollständige PDF wird nicht an das System gesendet."]),
    ] },
    fr: { title: "Comment préparer votre demande", summary: "Vérifiez les éléments à réunir avant d’ouvrir le formulaire.", sections: [
      section("Avant le formulaire", ["Utilisez la version finale du travail, déjà soutenue ou approuvée par le jury. Si nécessaire, joignez la feuille d’approbation signée ou numérisée."]),
      section("Étapes", undefined, ["Hébergez le fichier sur un service cloud.", "Vérifiez que toute personne disposant du lien peut l’ouvrir.", "Préparez les données exactement telles qu’elles apparaissent dans le travail.", "Commencez le formulaire et reprenez votre brouillon lorsque nécessaire."]),
      section("À propos du lien public", ["Vous pouvez utiliser Google Drive, OneDrive ou un service équivalent. Pronto! ne reçoit que le lien ; le PDF complet n’est pas envoyé au système."]),
    ] },
    it: { title: "Come preparare la richiesta", summary: "Controlla cosa serve prima di iniziare il modulo.", sections: [
      section("Prima di aprire il modulo", ["Usa la versione finale del lavoro, già discussa o approvata dalla commissione. Se applicabile, includi il foglio di approvazione firmato o digitalizzato."]),
      section("Passo dopo passo", undefined, ["Carica il file su un servizio cloud.", "Verifica che chiunque abbia il link possa aprirlo.", "Prepara i dati esattamente come compaiono nel lavoro.", "Inizia il modulo e riprendi la bozza quando necessario."]),
      section("Informazioni sul link pubblico", ["Puoi usare Google Drive, OneDrive o servizi equivalenti. Pronto! riceve solo il link; il PDF completo non viene inviato al sistema."]),
    ] },
  },
  "corrigir-solicitacao": {
    en: { title: "How to respond to a library correction", summary: "Learn what happens when your request is returned to you.", sections: [
      section("What a correction means", ["The library identifies exactly which details need changes and explains why the request was returned."]),
      section("Step by step", undefined, ["Sign in and open your request.", "Read the reasons provided by the library.", "Change only the fields made available.", "Resubmit through the dashboard."]),
      section("What remains protected", ["Fields already checked are locked. This preserves the review and prevents correct data from being changed accidentally."]),
    ] },
    es: { title: "Cómo responder a una corrección de la biblioteca", summary: "Conozca qué ocurre cuando se le devuelve la solicitud.", sections: [
      section("Qué significa una corrección", ["La biblioteca indica exactamente qué datos deben ajustarse y explica el motivo de la devolución."]),
      section("Paso a paso", undefined, ["Entre en el panel y abra su solicitud.", "Lea los motivos enviados por la biblioteca.", "Modifique solo los campos disponibles.", "Reenvíe la solicitud desde el panel."]),
      section("Qué permanece protegido", ["Los campos ya revisados quedan bloqueados. Esto conserva la revisión y evita cambios accidentales en los datos correctos."]),
    ] },
    de: { title: "So beantworten Sie eine Korrekturanfrage der Bibliothek", summary: "Erfahren Sie, was geschieht, wenn Ihre Anfrage zurückgegeben wird.", sections: [
      section("Was eine Korrektur bedeutet", ["Die Bibliothek nennt genau die zu ändernden Angaben und begründet die Rückgabe."]),
      section("Schritt für Schritt", undefined, ["Melden Sie sich an und öffnen Sie Ihre Anfrage.", "Lesen Sie die Begründungen der Bibliothek.", "Ändern Sie nur die freigegebenen Felder.", "Reichen Sie die Korrektur im Dashboard erneut ein."]),
      section("Was geschützt bleibt", ["Bereits geprüfte Felder sind gesperrt. So bleibt die Prüfung erhalten und richtige Angaben werden nicht versehentlich geändert."]),
    ] },
    fr: { title: "Comment répondre à une correction demandée par la bibliothèque", summary: "Comprenez ce qui se passe lorsque votre demande vous est renvoyée.", sections: [
      section("Ce que signifie une correction", ["La bibliothèque précise les informations à modifier et explique la raison du renvoi."]),
      section("Étapes", undefined, ["Connectez-vous et ouvrez votre demande.", "Lisez les motifs indiqués par la bibliothèque.", "Modifiez uniquement les champs disponibles.", "Renvoyez la demande depuis le tableau de bord."]),
      section("Ce qui reste protégé", ["Les champs déjà vérifiés sont verrouillés. La révision est conservée et les données correctes ne risquent pas d’être modifiées par erreur."]),
    ] },
    it: { title: "Come rispondere a una correzione della biblioteca", summary: "Scopri cosa succede quando la richiesta ti viene restituita.", sections: [
      section("Cosa significa una correzione", ["La biblioteca indica esattamente quali dati modificare e spiega il motivo della restituzione."]),
      section("Passo dopo passo", undefined, ["Accedi al pannello e apri la richiesta.", "Leggi le motivazioni inviate dalla biblioteca.", "Modifica solo i campi disponibili.", "Invia nuovamente dal pannello."]),
      section("Cosa resta protetto", ["I campi già verificati restano bloccati. La revisione viene preservata e i dati corretti non cambiano per errore."]),
    ] },
  },
  "concluir-autodeposito": {
    en: { title: "How to complete self-deposit", summary: "See what to do after your catalog record is released.", sections: [
      section("Before starting", ["The record becomes available after the library approves it and accepts the Nada Consta. The guide then appears in your dashboard."]),
      section("Step by step", undefined, ["Open the RI/UFBA guide in your dashboard.", "Reuse the approved metadata.", "Deposit the work and choose a license in the Institutional Repository.", "Send the permanent URL or Handle to the library."]),
      section("Important", ["Pronto! guides you, but you perform the deposit and make the choices in RI/UFBA yourself."]),
    ] },
    es: { title: "Cómo completar el autodepósito", summary: "Sepa qué hacer después de que se libere la ficha.", sections: [
      section("Antes de empezar", ["La ficha queda disponible cuando la biblioteca la aprueba y valida el Nada Consta. Entonces aparece la guía en el panel."]),
      section("Paso a paso", undefined, ["Abra la guía del RI/UFBA en el panel.", "Reutilice los metadatos aprobados.", "Deposite el trabajo y elija la licencia en el Repositorio Institucional.", "Comunique a la biblioteca la URL permanente o el Handle."]),
      section("Importante", ["Pronto! orienta el proceso, pero usted realiza el depósito y toma las decisiones en el RI/UFBA."]),
    ] },
    de: { title: "So schließen Sie die Selbsteinreichung ab", summary: "Erfahren Sie, was nach der Freigabe des Katalogeintrags zu tun ist.", sections: [
      section("Vor dem Beginn", ["Der Eintrag wird nach Genehmigung durch die Bibliothek und Freigabe des Nada Consta verfügbar. Dann erscheint die Anleitung im Dashboard."]),
      section("Schritt für Schritt", undefined, ["Öffnen Sie die RI/UFBA-Anleitung im Dashboard.", "Übernehmen Sie die genehmigten Metadaten.", "Reichen Sie die Arbeit im institutionellen Repositorium ein und wählen Sie eine Lizenz.", "Teilen Sie der Bibliothek die dauerhafte URL oder den Handle mit."]),
      section("Wichtig", ["Pronto! bietet Anleitung; die Einreichung und Entscheidungen im RI/UFBA nehmen Sie selbst vor."]),
    ] },
    fr: { title: "Comment terminer l’auto-dépôt", summary: "Découvrez quoi faire après la mise à disposition de la notice.", sections: [
      section("Avant de commencer", ["La notice devient disponible après validation par la bibliothèque et approbation du Nada Consta. Le guide apparaît alors dans le tableau de bord."]),
      section("Étapes", undefined, ["Ouvrez le guide du RI/UFBA dans votre tableau de bord.", "Reprenez les métadonnées approuvées.", "Déposez le travail et choisissez la licence dans le dépôt institutionnel.", "Communiquez à la bibliothèque l’URL permanente ou le Handle."]),
      section("Important", ["Pronto! vous guide, mais vous réalisez vous-même le dépôt et les choix dans le RI/UFBA."]),
    ] },
    it: { title: "Come completare l’autodeposito", summary: "Scopri cosa fare dopo il rilascio della scheda.", sections: [
      section("Prima di iniziare", ["La scheda è disponibile dopo l’approvazione della biblioteca e del Nada Consta. La guida compare quindi nel pannello."]),
      section("Passo dopo passo", undefined, ["Apri la guida RI/UFBA nel pannello.", "Riutilizza i metadati approvati.", "Deposita il lavoro e scegli la licenza nel repository istituzionale.", "Comunica alla biblioteca l’URL permanente o l’Handle."]),
      section("Importante", ["Pronto! fornisce indicazioni, ma il deposito e le scelte nel RI/UFBA sono compiti tuoi."]),
    ] },
  },

};

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function fallbackKnowledgeTranslation(entry: KnowledgeEntry, language: InterfaceLanguage): KnowledgeTranslation | null {
  if (language === "pt") return null;
  const short = shortCopy[entry.title]?.[language];
  if (short && entry.kind !== "article") {
    const paragraphs = short.body ?? [short.summary];
    return { title: short.title, summary: short.summary, body_html: paragraphs.map((value) => `<p>${escapeHtml(value)}</p>`).join("") };
  }
  const localized = entry.slug ? articleCopy[entry.slug]?.[language] : null;
  const original = helpArticles.find((item) => item.slug === entry.slug);
  if (!localized || !original || localized.sections.length !== original.sections?.length) return null;
  const sections: KnowledgeSection[] = original.sections.map((section, index) => {
    const translated = localized.sections[index];
    return {
      ...section, title: translated.title, paragraphs: translated.paragraphs, steps: translated.steps,
      links: section.links?.map((link, linkIndex) => ({ ...link, label: translated.links?.[linkIndex] ?? link.label })),
    };
  });
  const item: KnowledgeItem = { ...original, title: localized.title, summary: localized.summary, sections };
  return { title: localized.title, summary: localized.summary, body_html: articleHtml(item) };
}
