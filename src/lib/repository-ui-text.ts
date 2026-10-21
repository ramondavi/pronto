import type { InterfaceLanguage } from "@/lib/interface-language";

// UI instructions are translated; official repository values and work metadata stay verbatim.
export const repositoryUiText: Record<string, Record<Exclude<InterfaceLanguage, "pt">, string>> = {
  "Não foi possível consultar o lembrete. Tente novamente antes de sair.": {
    "en": "Could not check the reminder. Try again before leaving.",
    "es": "No se pudo consultar el recordatorio. Inténtelo de nuevo antes de salir.",
    "de": "Die Erinnerung konnte nicht abgerufen werden. Versuchen Sie es vor dem Verlassen erneut.",
    "fr": "Impossible de consulter le rappel. Réessayez avant de quitter.",
    "it": "Impossibile consultare il promemoria. Riprova prima di uscire."
  },
  "O destino do depósito deste trabalho mudou. Confira novamente a liberação para depositar; seus dados de e-mail foram preservados.": {
    "en": "The deposit destination for this work has changed. Check your deposit permission again; your email details have been preserved.",
    "es": "El destino de depósito de este trabajo ha cambiado. Revise de nuevo el permiso para depositar; sus datos de correo se conservaron.",
    "de": "Das Ablageziel dieser Arbeit hat sich geändert. Prüfen Sie Ihre Einreichungsberechtigung erneut; Ihre E-Mail-Angaben wurden beibehalten.",
    "fr": "La destination de dépôt de ce travail a changé. Vérifiez à nouveau votre autorisation de dépôt ; vos coordonnées e-mail ont été conservées.",
    "it": "La destinazione del deposito è cambiata. Verifica di nuovo l'abilitazione al deposito; i dati e-mail sono stati conservati."
  },
  "Não foi possível carregar as respostas ou o destino do depósito foi atualizado. Recarregue a página para continuar com os dados atuais.": {
    "en": "Could not load your answers, or the deposit destination has changed. Reload the page to continue with current information.",
    "es": "No se pudieron cargar las respuestas o el destino ha cambiado. Recargue la página para continuar con los datos actuales.",
    "de": "Ihre Antworten konnten nicht geladen werden oder das Ablageziel wurde geändert. Laden Sie die Seite neu, um mit aktuellen Angaben fortzufahren.",
    "fr": "Impossible de charger les réponses, ou la destination a changé. Rechargez la page pour continuer avec les informations à jour.",
    "it": "Impossibile caricare le risposte oppure la destinazione è cambiata. Ricarica la pagina per continuare con i dati aggiornati."
  },
  "As respostas não foram salvas. Se outra sessão alterou este trabalho, recarregue as respostas antes de continuar.": {
    "en": "Your answers were not saved. If another session changed this work, reload your answers before continuing.",
    "es": "Sus respuestas no se guardaron. Si otra sesión modificó este trabajo, recargue las respuestas antes de continuar.",
    "de": "Ihre Antworten wurden nicht gespeichert. Falls eine andere Sitzung diese Arbeit geändert hat, laden Sie die Antworten vor dem Fortfahren neu.",
    "fr": "Vos réponses n'ont pas été enregistrées. Si une autre session a modifié ce travail, rechargez les réponses avant de continuer.",
    "it": "Le risposte non sono state salvate. Se un'altra sessione ha modificato questo lavoro, ricarica le risposte prima di continuare."
  },
  "Não foi possível salvar a confirmação. Recarregue as decisões antes de iniciar o guia.": {
    "en": "Could not save your confirmation. Reload your answers before starting the guide.",
    "es": "No se pudo guardar la confirmación. Recargue las respuestas antes de iniciar la guía.",
    "de": "Ihre Bestätigung konnte nicht gespeichert werden. Laden Sie Ihre Antworten neu, bevor Sie den Leitfaden starten.",
    "fr": "Impossible d'enregistrer votre confirmation. Rechargez vos réponses avant de commencer le guide.",
    "it": "Impossibile salvare la conferma. Ricarica le risposte prima di iniziare la guida."
  },
  "Não foi possível alterar o lembrete. Se ele já estiver sendo enviado, não poderá ser cancelado. Tente novamente.": {
    "en": "Could not change the reminder. If delivery has already started, it cannot be canceled. Try again.",
    "es": "No se pudo modificar el recordatorio. Si el envío ya comenzó, no se puede cancelar. Inténtelo de nuevo.",
    "de": "Die Erinnerung konnte nicht geändert werden. Wurde der Versand bereits gestartet, ist keine Stornierung möglich. Versuchen Sie es erneut.",
    "fr": "Impossible de modifier le rappel. Si l'envoi a déjà commencé, il ne peut plus être annulé. Réessayez.",
    "it": "Impossibile modificare il promemoria. Se l'invio è già iniziato, non può essere annullato. Riprova."
  },
  "Quero ser lembrado por e-mail": {
    "en": "Remind me by email",
    "es": "Quiero recibir un recordatorio por correo",
    "de": "Ich möchte per E-Mail erinnert werden",
    "fr": "Je souhaite recevoir un rappel par e-mail",
    "it": "Desidero ricevere un promemoria via e-mail"
  },
  "Atualizando lembrete…": {
    "en": "Updating reminder…",
    "es": "Actualizando recordatorio…",
    "de": "Erinnerung wird aktualisiert…",
    "fr": "Mise à jour du rappel…",
    "it": "Aggiornamento del promemoria…"
  },
  "Lembrete enviado para o e-mail da sua conta do Pronto!.": {
    "en": "Reminder sent to your Pronto! account email.",
    "es": "Recordatorio enviado al correo de su cuenta de Pronto!.",
    "de": "Die Erinnerung wurde an die E-Mail-Adresse Ihres Pronto!-Kontos gesendet.",
    "fr": "Rappel envoyé à l'adresse e-mail de votre compte Pronto!.",
    "it": "Promemoria inviato all'e-mail del tuo account Pronto!."
  },
  "Um único e-mail no segundo dia útil seguinte. Você pode cancelar antes do envio.": {
    "en": "One email on the second following business day. You can cancel before it is sent.",
    "es": "Un único correo el segundo día hábil siguiente. Puede cancelarlo antes del envío.",
    "de": "Eine E-Mail am zweiten folgenden Werktag. Sie können vor dem Versand stornieren.",
    "fr": "Un seul e-mail le deuxième jour ouvrable suivant. Vous pouvez annuler avant l'envoi.",
    "it": "Un'unica e-mail il secondo giorno lavorativo successivo. Puoi annullare prima dell'invio."
  },
  "Pode aguardar com esta tela aberta e conferir seu e-mail. Quando a contagem terminar, informe se sua conta já foi confirmada.": {
    "en": "You can keep this page open and check your email. When the countdown ends, tell us whether your account has been confirmed.",
    "es": "Puede mantener esta página abierta y revisar su correo. Al terminar la cuenta atrás, indique si su cuenta ya fue confirmada.",
    "de": "Sie können diese Seite geöffnet lassen und Ihre E-Mails prüfen. Geben Sie nach Ablauf des Countdowns an, ob Ihr Konto bestätigt wurde.",
    "fr": "Vous pouvez garder cette page ouverte et consulter vos e-mails. À la fin du compte à rebours, indiquez si votre compte a été confirmé.",
    "it": "Puoi tenere aperta questa pagina e controllare l'e-mail. Al termine del conto alla rovescia, indica se il tuo account è stato confermato."
  },
  "Tempo até liberar a confirmação": {
    "en": "Time until confirmation becomes available",
    "es": "Tiempo hasta habilitar la confirmación",
    "de": "Zeit bis zur Freigabe der Bestätigung",
    "fr": "Délai avant de pouvoir confirmer",
    "it": "Tempo rimanente per poter confermare"
  },
  "Contato da equipe do RI/UFBA": {
    "en": "Contact the RI/UFBA team",
    "es": "Contacto del equipo del RI/UFBA",
    "de": "Kontakt zum RI/UFBA-Team",
    "fr": "Contact de l'équipe RI/UFBA",
    "it": "Contatto del team RI/UFBA"
  },
  "Ainda não recebeu a confirmação do cadastro?": {
    "en": "Still waiting for account confirmation?",
    "es": "¿Aún no recibió la confirmación del registro?",
    "de": "Warten Sie noch auf die Kontobestätigung?",
    "fr": "Vous n'avez pas encore reçu la confirmation d'inscription ?",
    "it": "Non hai ancora ricevuto la conferma della registrazione?"
  },
  "Ainda aguarda a correção da liberação para depositar?": {
    "en": "Still waiting for your deposit permission to be corrected?",
    "es": "¿Aún espera la corrección del permiso para depositar?",
    "de": "Warten Sie noch auf die Korrektur Ihrer Einreichungsberechtigung?",
    "fr": "Vous attendez encore la correction de votre autorisation de dépôt ?",
    "it": "Stai ancora aspettando la correzione dell'abilitazione al deposito?"
  },
  "Ainda aguarda a liberação para depositar?": {
    "en": "Still waiting for deposit permission?",
    "es": "¿Aún espera el permiso para depositar?",
    "de": "Warten Sie noch auf die Einreichungsberechtigung?",
    "fr": "Vous attendez encore l'autorisation de dépôt ?",
    "it": "Stai ancora aspettando l'abilitazione al deposito?"
  },
  "Escreva para o endereço acima, informe que seu cadastro ainda não foi confirmado e peça a verificação. Informe o e-mail usado no cadastro.": {
    "en": "Write to the address above, explain that your registration has not been confirmed, and ask them to check it. Include the email used to register.",
    "es": "Escriba a la dirección anterior, indique que su registro aún no se confirmó y solicite una revisión. Informe el correo usado en el registro.",
    "de": "Schreiben Sie an die obige Adresse, erklären Sie, dass Ihre Registrierung noch nicht bestätigt wurde, und bitten Sie um Prüfung. Geben Sie die bei der Registrierung verwendete E-Mail-Adresse an.",
    "fr": "Écrivez à l'adresse ci-dessus, expliquez que votre inscription n'a pas encore été confirmée et demandez une vérification. Indiquez l'adresse e-mail utilisée pour l'inscription.",
    "it": "Scrivi all'indirizzo sopra, spiega che la registrazione non è ancora stata confermata e chiedi una verifica. Indica l'e-mail usata per registrarti."
  },
  "Você pode continuar outro dia. Confira seu e-mail e a liberação para depositar na conta do RI/UFBA; para acompanhar o pedido, escreva para o endereço acima informando o e-mail cadastrado e o destino de depósito solicitado.": {
    "en": "You can continue another day. Check your email and deposit permission in your RI/UFBA account. To follow up, write to the address above with your registered email and requested deposit destination.",
    "es": "Puede continuar otro día. Revise el correo y el permiso para depositar en su cuenta del RI/UFBA. Para consultar el pedido, escriba a la dirección anterior con su correo registrado y el destino solicitado.",
    "de": "Sie können an einem anderen Tag fortfahren. Prüfen Sie Ihre E-Mails und Ihre Einreichungsberechtigung im RI/UFBA-Konto. Fragen Sie unter der obigen Adresse nach und nennen Sie Ihre registrierte E-Mail-Adresse und das beantragte Ablageziel.",
    "fr": "Vous pouvez continuer un autre jour. Consultez vos e-mails et votre autorisation de dépôt dans votre compte RI/UFBA. Pour suivre la demande, écrivez à l'adresse ci-dessus en indiquant votre e-mail enregistré et la destination demandée.",
    "it": "Puoi continuare un altro giorno. Controlla l'e-mail e l'abilitazione al deposito nel tuo account RI/UFBA. Per seguire la richiesta, scrivi all'indirizzo sopra indicando l'e-mail registrata e la destinazione richiesta."
  },
  "Já enviei o pedido de correção": {
    "en": "I have sent the correction request",
    "es": "Ya envié la solicitud de corrección",
    "de": "Ich habe die Korrektur beantragt",
    "fr": "J'ai envoyé la demande de correction",
    "it": "Ho inviato la richiesta di correzione"
  },
  "Já enviei o pedido de liberação para depositar": {
    "en": "I have sent the deposit permission request",
    "es": "Ya envié la solicitud de permiso para depositar",
    "de": "Ich habe die Einreichungsberechtigung beantragt",
    "fr": "J'ai envoyé la demande d'autorisation de dépôt",
    "it": "Ho inviato la richiesta di abilitazione al deposito"
  },
  "Rever resposta": {
    "en": "Review answer",
    "es": "Revisar respuesta",
    "de": "Antwort überprüfen",
    "fr": "Revoir la réponse",
    "it": "Rivedi la risposta"
  },
  "A correção da liberação para depositar já foi realizada?": {
    "en": "Has your deposit permission been corrected?",
    "es": "¿Ya se corrigió el permiso para depositar?",
    "de": "Wurde Ihre Einreichungsberechtigung bereits korrigiert?",
    "fr": "Votre autorisation de dépôt a-t-elle été corrigée ?",
    "it": "L'abilitazione al deposito è già stata corretta?"
  },
  "Você já recebeu a liberação para depositar do RI/UFBA?": {
    "en": "Have you received deposit permission from RI/UFBA?",
    "es": "¿Ya recibió el permiso del RI/UFBA para depositar?",
    "de": "Haben Sie die Einreichungsberechtigung vom RI/UFBA erhalten?",
    "fr": "Avez-vous reçu l'autorisation de dépôt du RI/UFBA ?",
    "it": "Hai già ricevuto l'abilitazione al deposito dal RI/UFBA?"
  },
  "Confira a resposta por e-mail ou entre na sua conta do RI/UFBA. Conseguir iniciar um depósito no destino correto significa que você já tem liberação para depositar.": {
    "en": "Check the email reply or sign in to RI/UFBA. Being able to start a deposit at the correct destination means you have deposit permission.",
    "es": "Revise la respuesta por correo o acceda a su cuenta del RI/UFBA. Poder iniciar un depósito en el destino correcto significa que ya tiene permiso para depositar.",
    "de": "Prüfen Sie die Antwort per E-Mail oder melden Sie sich im RI/UFBA an. Können Sie am richtigen Ablageziel eine Einreichung starten, haben Sie die erforderliche Berechtigung.",
    "fr": "Consultez la réponse par e-mail ou connectez-vous au RI/UFBA. Si vous pouvez commencer un dépôt à la bonne destination, vous avez l'autorisation de dépôt.",
    "it": "Controlla la risposta via e-mail o accedi al RI/UFBA. Se puoi iniziare un deposito nella destinazione corretta, hai l'abilitazione al deposito."
  },
  "Agora tenho liberação para depositar": {
    "en": "I now have deposit permission",
    "es": "Ahora tengo permiso para depositar",
    "de": "Ich habe jetzt die Einreichungsberechtigung",
    "fr": "J'ai maintenant l'autorisation de dépôt",
    "it": "Ora ho l'abilitazione al deposito"
  },
  "Sim, a correção já foi realizada": {
    "en": "Yes, the correction has been made",
    "es": "Sí, la corrección ya se realizó",
    "de": "Ja, die Korrektur wurde vorgenommen",
    "fr": "Oui, la correction a été effectuée",
    "it": "Sì, la correzione è stata effettuata"
  },
  "Sim, já recebi a liberação para depositar": {
    "en": "Yes, I have received deposit permission",
    "es": "Sí, ya recibí el permiso para depositar",
    "de": "Ja, ich habe die Einreichungsberechtigung erhalten",
    "fr": "Oui, j'ai reçu l'autorisation de dépôt",
    "it": "Sì, ho ricevuto l'abilitazione al deposito"
  },
  "Vou conferir a coleção e o tipo de documento antes de continuar.": {
    "en": "I will check the collection and document type before continuing.",
    "es": "Revisaré la colección y el tipo de documento antes de continuar.",
    "de": "Ich prüfe die Sammlung und den Dokumenttyp, bevor ich fortfahre.",
    "fr": "Je vais vérifier la collection et le type de document avant de continuer.",
    "it": "Verificherò la collezione e il tipo di documento prima di continuare."
  },
  "Ainda não recebi a correção da liberação para depositar": {
    "en": "I have not received the deposit permission correction yet",
    "es": "Aún no recibí la corrección del permiso para depositar",
    "de": "Ich habe die Korrektur der Einreichungsberechtigung noch nicht erhalten",
    "fr": "Je n'ai pas encore reçu la correction de l'autorisation de dépôt",
    "it": "Non ho ancora ricevuto la correzione dell'abilitazione al deposito"
  },
  "Ainda não recebi a liberação para depositar": {
    "en": "I have not received deposit permission yet",
    "es": "Aún no recibí el permiso para depositar",
    "de": "Ich habe die Einreichungsberechtigung noch nicht erhalten",
    "fr": "Je n'ai pas encore reçu l'autorisation de dépôt",
    "it": "Non ho ancora ricevuto l'abilitazione al deposito"
  },
  "Posso continuar depois e optar por um lembrete por e-mail.": {
    "en": "I can continue later and choose an email reminder.",
    "es": "Puedo continuar después y solicitar un recordatorio por correo.",
    "de": "Ich kann später fortfahren und eine E-Mail-Erinnerung wählen.",
    "fr": "Je peux continuer plus tard et choisir un rappel par e-mail.",
    "it": "Posso continuare più tardi e scegliere un promemoria via e-mail."
  },
  "Recebi a resposta, mas o destino do depósito está diferente": {
    "en": "I received a reply, but the deposit destination is different",
    "es": "Recibí la respuesta, pero el destino del depósito es diferente",
    "de": "Ich habe eine Antwort erhalten, aber das Ablageziel ist anders",
    "fr": "J'ai reçu la réponse, mais la destination de dépôt est différente",
    "it": "Ho ricevuto la risposta, ma la destinazione del deposito è diversa"
  },
  "Preciso conferir os dados e pedir a correção ao RI/UFBA.": {
    "en": "I need to check the details and ask RI/UFBA for a correction.",
    "es": "Debo revisar los datos y pedir la corrección al RI/UFBA.",
    "de": "Ich muss die Angaben prüfen und das RI/UFBA um Korrektur bitten.",
    "fr": "Je dois vérifier les informations et demander une correction au RI/UFBA.",
    "it": "Devo verificare i dati e chiedere la correzione al RI/UFBA."
  },
  "A liberação para depositar vale por 30 dias. Se vencer, solicite a renovação por e-mail ao RI/UFBA.": {
    "en": "Deposit permission is valid for 30 days. If it expires, request renewal by emailing RI/UFBA.",
    "es": "El permiso para depositar es válido por 30 días. Si vence, solicite su renovación por correo al RI/UFBA.",
    "de": "Die Einreichungsberechtigung gilt 30 Tage. Beantragen Sie nach Ablauf eine Verlängerung per E-Mail beim RI/UFBA.",
    "fr": "L'autorisation de dépôt est valable 30 jours. À son expiration, demandez son renouvellement par e-mail au RI/UFBA.",
    "it": "L'abilitazione al deposito è valida per 30 giorni. Alla scadenza, chiedi il rinnovo via e-mail al RI/UFBA."
  },
  "Informei que preciso criar ou confirmar minha conta": {
    "en": "I said I need to create or confirm my account",
    "es": "Indiqué que debo crear o confirmar mi cuenta",
    "de": "Ich habe angegeben, dass ich mein Konto erstellen oder bestätigen muss",
    "fr": "J'ai indiqué devoir créer ou confirmer mon compte",
    "it": "Ho indicato che devo creare o confermare il mio account"
  },
  "Alterar resposta": {
    "en": "Change answer",
    "es": "Cambiar respuesta",
    "de": "Antwort ändern",
    "fr": "Modifier la réponse",
    "it": "Modifica risposta"
  },
  "Orientações para criar e confirmar a conta": {
    "en": "How to create and confirm your account",
    "es": "Cómo crear y confirmar la cuenta",
    "de": "So erstellen und bestätigen Sie Ihr Konto",
    "fr": "Comment créer et confirmer votre compte",
    "it": "Come creare e confermare l'account"
  },
  "Crie e confirme sua conta no RI/UFBA": {
    "en": "Create and confirm your RI/UFBA account",
    "es": "Cree y confirme su cuenta en el RI/UFBA",
    "de": "Erstellen und bestätigen Sie Ihr RI/UFBA-Konto",
    "fr": "Créez et confirmez votre compte RI/UFBA",
    "it": "Crea e conferma il tuo account RI/UFBA"
  },
  "Siga estes três passos e mantenha esta tela aberta para continuar depois do cadastro.": {
    "en": "Follow these three steps and keep this page open to continue after registering.",
    "es": "Siga estos tres pasos y mantenga esta página abierta para continuar después del registro.",
    "de": "Folgen Sie diesen drei Schritten und lassen Sie diese Seite geöffnet, um nach der Registrierung fortzufahren.",
    "fr": "Suivez ces trois étapes et gardez cette page ouverte pour continuer après l'inscription.",
    "it": "Segui questi tre passaggi e tieni aperta questa pagina per continuare dopo la registrazione."
  },
  "Abra o RI/UFBA e faça o cadastro com o e-mail que usará no repositório. Recomendamos o endereço institucional @ufba.br.": {
    "en": "Open RI/UFBA and register with the email you will use in the repository. We recommend your institutional @ufba.br address.",
    "es": "Abra el RI/UFBA y regístrese con el correo que usará en el repositorio. Recomendamos la dirección institucional @ufba.br.",
    "de": "Öffnen Sie das RI/UFBA und registrieren Sie sich mit der E-Mail-Adresse, die Sie im Repositorium verwenden werden. Wir empfehlen Ihre institutionelle Adresse @ufba.br.",
    "fr": "Ouvrez le RI/UFBA et inscrivez-vous avec l'adresse e-mail que vous utiliserez dans le dépôt. Nous recommandons votre adresse institutionnelle @ufba.br.",
    "it": "Apri il RI/UFBA e registrati con l'e-mail che userai nel repository. Consigliamo l'indirizzo istituzionale @ufba.br."
  },
  "Dúvida sobre como fazer seu cadastro no RI/UFBA? Veja o tutorial.": {
    "en": "Need help registering with RI/UFBA? See the tutorial.",
    "es": "¿Tiene dudas sobre cómo registrarse en el RI/UFBA? Vea el tutorial.",
    "de": "Benötigen Sie Hilfe bei der Registrierung im RI/UFBA? Sehen Sie sich die Anleitung an.",
    "fr": "Besoin d'aide pour vous inscrire au RI/UFBA ? Consultez le tutoriel.",
    "it": "Hai dubbi su come registrarti nel RI/UFBA? Consulta il tutorial."
  },
  "Confirme pelo e-mail recebido": {
    "en": "Confirm using the email you receive",
    "es": "Confirme mediante el correo recibido",
    "de": "Bestätigen Sie über die erhaltene E-Mail",
    "fr": "Confirmez à l'aide de l'e-mail reçu",
    "it": "Conferma tramite l'e-mail ricevuta"
  },
  "Confira a caixa de entrada e a pasta de spam do e-mail cadastrado. Abra a mensagem do RI/UFBA e siga as orientações para confirmar a conta.": {
    "en": "Check the inbox and spam folder of your registered email. Open the RI/UFBA message and follow the instructions to confirm your account.",
    "es": "Revise la bandeja de entrada y la carpeta de spam del correo registrado. Abra el mensaje del RI/UFBA y siga las instrucciones para confirmar la cuenta.",
    "de": "Prüfen Sie Posteingang und Spamordner Ihrer registrierten E-Mail-Adresse. Öffnen Sie die Nachricht des RI/UFBA und folgen Sie den Anweisungen zur Kontobestätigung.",
    "fr": "Consultez la boîte de réception et le dossier indésirables de votre adresse enregistrée. Ouvrez le message du RI/UFBA et suivez les instructions pour confirmer le compte.",
    "it": "Controlla la posta in arrivo e lo spam dell'e-mail registrata. Apri il messaggio del RI/UFBA e segui le istruzioni per confermare l'account."
  },
  "Continue aqui no Pronto!": {
    "en": "Continue here in Pronto!",
    "es": "Continúe aquí en Pronto!",
    "de": "Fahren Sie hier in Pronto! fort",
    "fr": "Continuez ici dans Pronto!",
    "it": "Continua qui su Pronto!"
  },
  "Quando a contagem terminar, informe abaixo se sua conta já foi confirmada. Se ainda não recebeu a confirmação, escolha essa resposta para ver como pedir ajuda e continuar outro dia.": {
    "en": "When the countdown ends, indicate below whether your account has been confirmed. If you have not received confirmation, choose that answer to see how to get help and continue another day.",
    "es": "Al terminar la cuenta atrás, indique abajo si su cuenta fue confirmada. Si aún no recibió la confirmación, elija esa respuesta para ver cómo pedir ayuda y continuar otro día.",
    "de": "Geben Sie nach Ablauf des Countdowns unten an, ob Ihr Konto bestätigt wurde. Falls Sie noch keine Bestätigung erhalten haben, wählen Sie diese Antwort, um Hilfe zu erhalten und später fortzufahren.",
    "fr": "À la fin du compte à rebours, indiquez ci-dessous si votre compte a été confirmé. Sinon, choisissez cette réponse pour savoir comment obtenir de l'aide et continuer un autre jour.",
    "it": "Al termine del conto alla rovescia, indica sotto se il tuo account è stato confermato. Se non hai ancora ricevuto la conferma, scegli quella risposta per sapere come chiedere aiuto e continuare un altro giorno."
  },
  "Depois de confirmar a conta, será preciso solicitar ou conferir a liberação para depositar seu trabalho. Vamos orientar esse pedido na próxima etapa.": {
    "en": "After confirming your account, you will need to request or check permission to deposit your work. We will guide you through that in the next stage.",
    "es": "Después de confirmar la cuenta, deberá solicitar o revisar el permiso para depositar su trabajo. Le orientaremos en la próxima etapa.",
    "de": "Nach der Kontobestätigung müssen Sie die Einreichungsberechtigung für Ihre Arbeit beantragen oder prüfen. Dabei helfen wir Ihnen im nächsten Schritt.",
    "fr": "Après confirmation du compte, vous devrez demander ou vérifier l'autorisation de déposer votre travail. Nous vous guiderons à l'étape suivante.",
    "it": "Dopo aver confermato l'account, dovrai richiedere o verificare l'abilitazione al deposito del lavoro. Ti guideremo nella prossima fase."
  },
  "Aguarde para conferir a confirmação": {
    "en": "Wait before checking confirmation",
    "es": "Espere para comprobar la confirmación",
    "de": "Warten Sie, bevor Sie die Bestätigung prüfen",
    "fr": "Patientez avant de vérifier la confirmation",
    "it": "Attendi prima di verificare la conferma"
  },
  "Pode manter esta tela aberta. Ao terminar a contagem, responda se sua conta foi confirmada para continuar.": {
    "en": "You can keep this page open. When the countdown ends, indicate whether your account has been confirmed to continue.",
    "es": "Puede mantener esta página abierta. Al terminar la cuenta atrás, indique si su cuenta fue confirmada para continuar.",
    "de": "Sie können diese Seite geöffnet lassen. Geben Sie nach Ablauf des Countdowns an, ob Ihr Konto bestätigt wurde, um fortzufahren.",
    "fr": "Vous pouvez garder cette page ouverte. À la fin du compte à rebours, indiquez si votre compte a été confirmé pour continuer.",
    "it": "Puoi tenere aperta questa pagina. Al termine del conto alla rovescia, indica se l'account è stato confermato per continuare."
  },
  "Sua conta já foi criada e confirmada?": {
    "en": "Has your account been created and confirmed?",
    "es": "¿Su cuenta ya fue creada y confirmada?",
    "de": "Wurde Ihr Konto erstellt und bestätigt?",
    "fr": "Votre compte a-t-il été créé et confirmé ?",
    "it": "Il tuo account è già stato creato e confermato?"
  },
  "Minha conta agora está confirmada": {
    "en": "My account is now confirmed",
    "es": "Mi cuenta ahora está confirmada",
    "de": "Mein Konto ist jetzt bestätigt",
    "fr": "Mon compte est maintenant confirmé",
    "it": "Il mio account ora è confermato"
  },
  "Sim, minha conta foi criada e confirmada": {
    "en": "Yes, my account has been created and confirmed",
    "es": "Sí, mi cuenta fue creada y confirmada",
    "de": "Ja, mein Konto wurde erstellt und bestätigt",
    "fr": "Oui, mon compte a été créé et confirmé",
    "it": "Sì, il mio account è stato creato e confermato"
  },
  "Concluí o cadastro e recebi a confirmação por e-mail.": {
    "en": "I registered and received email confirmation.",
    "es": "Completé el registro y recibí la confirmación por correo.",
    "de": "Ich habe mich registriert und die Bestätigung per E-Mail erhalten.",
    "fr": "J'ai terminé l'inscription et reçu la confirmation par e-mail.",
    "it": "Ho completato la registrazione e ricevuto la conferma via e-mail."
  },
  "Ainda não recebi a confirmação da conta": {
    "en": "I have not received account confirmation yet",
    "es": "Aún no recibí la confirmación de la cuenta",
    "de": "Ich habe noch keine Kontobestätigung erhalten",
    "fr": "Je n'ai pas encore reçu la confirmation du compte",
    "it": "Non ho ancora ricevuto la conferma dell'account"
  },
  "Vou pedir a verificação ao RI/UFBA e posso continuar outro dia.": {
    "en": "I will ask RI/UFBA to check and can continue another day.",
    "es": "Pediré al RI/UFBA que lo revise y puedo continuar otro día.",
    "de": "Ich werde das RI/UFBA um Prüfung bitten und kann später fortfahren.",
    "fr": "Je vais demander au RI/UFBA de vérifier et pourrai continuer un autre jour.",
    "it": "Chiederò al RI/UFBA una verifica e posso continuare un altro giorno."
  },
  "Como está sua conta e a liberação para depositar?": {
    "en": "What is your account and deposit permission status?",
    "es": "¿Cuál es la situación de su cuenta y del permiso para depositar?",
    "de": "Wie ist der Stand Ihres Kontos und Ihrer Einreichungsberechtigung?",
    "fr": "Où en sont votre compte et votre autorisation de dépôt ?",
    "it": "Qual è lo stato dell'account e dell'abilitazione al deposito?"
  },
  "Criar e confirmar a conta": {
    "en": "Create and confirm your account",
    "es": "Crear y confirmar la cuenta",
    "de": "Konto erstellen und bestätigen",
    "fr": "Créer et confirmer le compte",
    "it": "Creare e confermare l'account"
  },
  "Solicitar e conferir a liberação para depositar": {
    "en": "Request and check deposit permission",
    "es": "Solicitar y revisar el permiso para depositar",
    "de": "Einreichungsberechtigung beantragen und prüfen",
    "fr": "Demander et vérifier l'autorisation de dépôt",
    "it": "Richiedere e verificare l'abilitazione al deposito"
  },
  "Conferir antes de começar": {
    "en": "Check before starting",
    "es": "Revisar antes de comenzar",
    "de": "Vor dem Start prüfen",
    "fr": "Vérifier avant de commencer",
    "it": "Verificare prima di iniziare"
  },
  "Tenho conta confirmada e liberação para depositar no destino correto": {
    "en": "I have a confirmed account and permission to deposit at the correct destination",
    "es": "Tengo cuenta confirmada y permiso para depositar en el destino correcto",
    "de": "Ich habe ein bestätigtes Konto und die Berechtigung für das richtige Ablageziel",
    "fr": "J'ai un compte confirmé et l'autorisation de déposer à la bonne destination",
    "it": "Ho un account confermato e l'abilitazione al deposito nella destinazione corretta"
  },
  "Não tenho conta confirmada nem liberação para depositar": {
    "en": "I do not have a confirmed account or deposit permission",
    "es": "No tengo cuenta confirmada ni permiso para depositar",
    "de": "Ich habe weder ein bestätigtes Konto noch eine Einreichungsberechtigung",
    "fr": "Je n'ai ni compte confirmé ni autorisation de dépôt",
    "it": "Non ho un account confermato né l'abilitazione al deposito"
  },
  "Tenho liberação para depositar, mas o destino do depósito está errado": {
    "en": "I have deposit permission, but for the wrong destination",
    "es": "Tengo permiso para depositar, pero en el destino incorrecto",
    "de": "Ich habe eine Einreichungsberechtigung, aber für das falsche Ablageziel",
    "fr": "J'ai l'autorisation de déposer, mais à la mauvaise destination",
    "it": "Ho l'abilitazione al deposito, ma nella destinazione sbagliata"
  },
  "Tenho conta confirmada, mas não tenho liberação para depositar": {
    "en": "I have a confirmed account, but no deposit permission",
    "es": "Tengo cuenta confirmada, pero no tengo permiso para depositar",
    "de": "Ich habe ein bestätigtes Konto, aber keine Einreichungsberechtigung",
    "fr": "J'ai un compte confirmé, mais pas d'autorisation de dépôt",
    "it": "Ho un account confermato, ma non l'abilitazione al deposito"
  },
  "Ainda não informei minha situação": {
    "en": "I have not indicated my status yet",
    "es": "Aún no indiqué mi situación",
    "de": "Ich habe meinen Status noch nicht angegeben",
    "fr": "Je n'ai pas encore indiqué ma situation",
    "it": "Non ho ancora indicato la mia situazione"
  },
  "Minha conta está criada e confirmada": {
    "en": "My account is created and confirmed",
    "es": "Mi cuenta está creada y confirmada",
    "de": "Mein Konto ist erstellt und bestätigt",
    "fr": "Mon compte est créé et confirmé",
    "it": "Il mio account è creato e confermato"
  },
  "Ainda não recebi a confirmação da minha conta": {
    "en": "I have not received confirmation of my account yet",
    "es": "Aún no recibí la confirmación de mi cuenta",
    "de": "Ich habe noch keine Bestätigung meines Kontos erhalten",
    "fr": "Je n'ai pas encore reçu la confirmation de mon compte",
    "it": "Non ho ancora ricevuto la conferma del mio account"
  },
  "Ainda preciso criar ou confirmar minha conta": {
    "en": "I still need to create or confirm my account",
    "es": "Aún debo crear o confirmar mi cuenta",
    "de": "Ich muss mein Konto noch erstellen oder bestätigen",
    "fr": "Je dois encore créer ou confirmer mon compte",
    "it": "Devo ancora creare o confermare il mio account"
  },
  "Ainda não confirmei minha conta": {
    "en": "I have not confirmed my account yet",
    "es": "Aún no confirmé mi cuenta",
    "de": "Ich habe mein Konto noch nicht bestätigt",
    "fr": "Je n'ai pas encore confirmé mon compte",
    "it": "Non ho ancora confermato il mio account"
  },
  "Já tenho liberação para depositar no destino correto": {
    "en": "I already have permission to deposit at the correct destination",
    "es": "Ya tengo permiso para depositar en el destino correcto",
    "de": "Ich habe bereits die Berechtigung für das richtige Ablageziel",
    "fr": "J'ai déjà l'autorisation de déposer à la bonne destination",
    "it": "Ho già l'abilitazione al deposito nella destinazione corretta"
  },
  "Minha liberação para depositar está no destino de depósito errado": {
    "en": "My deposit permission is for the wrong destination",
    "es": "Mi permiso para depositar corresponde al destino incorrecto",
    "de": "Meine Einreichungsberechtigung gilt für das falsche Ablageziel",
    "fr": "Mon autorisation de dépôt concerne la mauvaise destination",
    "it": "La mia abilitazione al deposito riguarda la destinazione sbagliata"
  },
  "Ainda estou aguardando a liberação para depositar": {
    "en": "I am still waiting for deposit permission",
    "es": "Aún estoy esperando el permiso para depositar",
    "de": "Ich warte noch auf die Einreichungsberechtigung",
    "fr": "J'attends encore l'autorisation de dépôt",
    "it": "Sto ancora aspettando l'abilitazione al deposito"
  },
  "Já enviei o pedido; preciso conferir a liberação para depositar": {
    "en": "I sent the request; I need to check deposit permission",
    "es": "Ya envié la solicitud; debo revisar el permiso para depositar",
    "de": "Ich habe den Antrag gesendet und muss die Einreichungsberechtigung prüfen",
    "fr": "J'ai envoyé la demande ; je dois vérifier l'autorisation de dépôt",
    "it": "Ho inviato la richiesta; devo verificare l'abilitazione al deposito"
  },
  "Ainda preciso enviar o pedido ao RI/UFBA": {
    "en": "I still need to send the request to RI/UFBA",
    "es": "Aún debo enviar la solicitud al RI/UFBA",
    "de": "Ich muss den Antrag noch an das RI/UFBA senden",
    "fr": "Je dois encore envoyer la demande au RI/UFBA",
    "it": "Devo ancora inviare la richiesta al RI/UFBA"
  },
  "Ainda não informei se enviei o pedido": {
    "en": "I have not indicated whether I sent the request",
    "es": "Aún no indiqué si envié la solicitud",
    "de": "Ich habe noch nicht angegeben, ob ich den Antrag gesendet habe",
    "fr": "Je n'ai pas encore indiqué si j'ai envoyé la demande",
    "it": "Non ho ancora indicato se ho inviato la richiesta"
  },
  "Confirmei minha conta e a liberação para depositar no destino correto": {
    "en": "I confirmed my account and permission to deposit at the correct destination",
    "es": "Confirmé mi cuenta y el permiso para depositar en el destino correcto",
    "de": "Ich habe mein Konto und die Berechtigung für das richtige Ablageziel bestätigt",
    "fr": "J'ai confirmé mon compte et l'autorisation de déposer à la bonne destination",
    "it": "Ho confermato l'account e l'abilitazione al deposito nella destinazione corretta"
  },
  "Ainda não consegui confirmar a liberação para depositar": {
    "en": "I have not been able to confirm deposit permission yet",
    "es": "Aún no pude confirmar el permiso para depositar",
    "de": "Ich konnte die Einreichungsberechtigung noch nicht bestätigen",
    "fr": "Je n'ai pas encore pu confirmer l'autorisation de dépôt",
    "it": "Non sono ancora riuscito a confermare l'abilitazione al deposito"
  },
  "Ainda preciso fazer a conferência final": {
    "en": "I still need to do the final check",
    "es": "Aún debo hacer la revisión final",
    "de": "Ich muss noch die abschließende Prüfung durchführen",
    "fr": "Je dois encore faire la vérification finale",
    "it": "Devo ancora effettuare la verifica finale"
  },
  "Passo 1": {
    "en": "Step 1",
    "es": "Paso 1",
    "de": "Schritt 1",
    "fr": "Étape 1",
    "it": "Passaggio 1"
  },
  "Fazer cadastro no RI/UFBA": {
    "en": "Register with RI/UFBA",
    "es": "Registrarse en el RI/UFBA",
    "de": "Im RI/UFBA registrieren",
    "fr": "S'inscrire au RI/UFBA",
    "it": "Registrati nel RI/UFBA"
  },
  "Fazer login no RI/UFBA": {
    "en": "Sign in to RI/UFBA",
    "es": "Iniciar sesión en el RI/UFBA",
    "de": "Im RI/UFBA anmelden",
    "fr": "Se connecter au RI/UFBA",
    "it": "Accedi al RI/UFBA"
  },
  "Primeiro, faça login na nova aba. Depois, volte aqui e clique em Começar o guia do autodepósito.": {
    "en": "First, sign in in the new tab. Then return here and click Start the self-deposit guide.",
    "es": "Primero inicie sesión en la nueva pestaña. Después vuelva aquí y pulse Comenzar la guía de autodepósito.",
    "de": "Melden Sie sich zuerst im neuen Tab an. Kehren Sie dann hierher zurück und klicken Sie auf Leitfaden zur Selbsteinreichung starten.",
    "fr": "Connectez-vous d'abord dans le nouvel onglet. Revenez ensuite ici et cliquez sur Commencer le guide d'auto-dépôt.",
    "it": "Prima accedi nella nuova scheda. Poi torna qui e fai clic su Inizia la guida all'auto-deposito."
  },
  "Abra o RI/UFBA e faça seu cadastro. Depois, volte aqui para confirmar a conta e continuar as etapas.": {
    "en": "Open RI/UFBA and register. Then return here to confirm your account and continue the stages.",
    "es": "Abra el RI/UFBA y regístrese. Después vuelva aquí para confirmar la cuenta y continuar las etapas.",
    "de": "Öffnen Sie das RI/UFBA und registrieren Sie sich. Kehren Sie dann hierher zurück, um das Konto zu bestätigen und fortzufahren.",
    "fr": "Ouvrez le RI/UFBA et inscrivez-vous. Revenez ensuite ici pour confirmer le compte et poursuivre les étapes.",
    "it": "Apri il RI/UFBA e registrati. Poi torna qui per confermare l'account e continuare le fasi."
  },
  "Faça login na nova aba. Depois, volte aqui e alterne entre as abas para conferir cada etapa.": {
    "en": "Sign in in the new tab. Then return here and switch between tabs to check each stage.",
    "es": "Inicie sesión en la nueva pestaña. Después vuelva aquí y alterne entre las pestañas para revisar cada etapa.",
    "de": "Melden Sie sich im neuen Tab an. Kehren Sie dann hierher zurück und wechseln Sie zwischen den Tabs, um jeden Schritt zu prüfen.",
    "fr": "Connectez-vous dans le nouvel onglet. Revenez ensuite ici et alternez entre les onglets pour vérifier chaque étape.",
    "it": "Accedi nella nuova scheda. Poi torna qui e alterna le schede per verificare ogni fase."
  },
  "Prepare sua conta e a liberação para depositar no RI/UFBA": {
    "en": "Prepare your account and deposit permission for RI/UFBA",
    "es": "Prepare su cuenta y el permiso para depositar en el RI/UFBA",
    "de": "Bereiten Sie Ihr Konto und Ihre Einreichungsberechtigung für das RI/UFBA vor",
    "fr": "Préparez votre compte et votre autorisation de dépôt au RI/UFBA",
    "it": "Prepara l'account e l'abilitazione al deposito nel RI/UFBA"
  },
  "Responda às perguntas de cada etapa. Sua resposta define o próximo passo; reabra uma etapa para conferir ou alterar o que informou.": {
    "en": "Answer the questions in each stage. Your answer determines the next step; reopen a stage to check or change what you entered.",
    "es": "Responda las preguntas de cada etapa. Su respuesta define el siguiente paso; vuelva a abrir una etapa para revisar o modificar lo indicado.",
    "de": "Beantworten Sie die Fragen jedes Schritts. Ihre Antwort bestimmt den nächsten Schritt. Öffnen Sie einen Schritt erneut, um Ihre Angaben zu prüfen oder zu ändern.",
    "fr": "Répondez aux questions de chaque étape. Votre réponse détermine la suite ; rouvrez une étape pour vérifier ou modifier vos réponses.",
    "it": "Rispondi alle domande di ogni fase. La risposta determina il passaggio successivo; riapri una fase per verificare o modificare ciò che hai indicato."
  },
  "Carregando suas respostas…": {
    "en": "Loading your answers…",
    "es": "Cargando sus respuestas…",
    "de": "Ihre Antworten werden geladen…",
    "fr": "Chargement de vos réponses…",
    "it": "Caricamento delle risposte…"
  },
  "Etapa pulada: informei na etapa 0 que já tenho conta e liberação para depositar. Posso começar o guia.": {
    "en": "Stage skipped: in stage 0 I said I already have an account and deposit permission. I can start the guide.",
    "es": "Etapa omitida: en la etapa 0 indiqué que ya tengo cuenta y permiso para depositar. Puedo comenzar la guía.",
    "de": "Schritt übersprungen: In Schritt 0 habe ich angegeben, dass ich bereits ein Konto und die Einreichungsberechtigung habe. Ich kann den Leitfaden starten.",
    "fr": "Étape ignorée : à l'étape 0, j'ai indiqué avoir un compte et l'autorisation de dépôt. Je peux commencer le guide.",
    "it": "Fase saltata: nella fase 0 ho indicato di avere già un account e l'abilitazione al deposito. Posso iniziare la guida."
  },
  "Etapa pulada: informei na etapa 0 que minha conta já está confirmada. Não preciso refazer o cadastro.": {
    "en": "Stage skipped: in stage 0 I said my account is already confirmed. I do not need to register again.",
    "es": "Etapa omitida: en la etapa 0 indiqué que mi cuenta ya está confirmada. No necesito registrarme otra vez.",
    "de": "Schritt übersprungen: In Schritt 0 habe ich angegeben, dass mein Konto bereits bestätigt ist. Ich muss mich nicht erneut registrieren.",
    "fr": "Étape ignorée : à l'étape 0, j'ai indiqué que mon compte est déjà confirmé. Je n'ai pas besoin de me réinscrire.",
    "it": "Fase saltata: nella fase 0 ho indicato che il mio account è già confermato. Non devo registrarmi di nuovo."
  },
  "Responda à etapa 0 para definir os próximos passos.": {
    "en": "Answer stage 0 to determine the next steps.",
    "es": "Responda la etapa 0 para definir los siguientes pasos.",
    "de": "Beantworten Sie Schritt 0, um die nächsten Schritte festzulegen.",
    "fr": "Répondez à l'étape 0 pour déterminer la suite.",
    "it": "Rispondi alla fase 0 per definire i passaggi successivi."
  },
  "Confirme sua conta na etapa 1 para continuar.": {
    "en": "Confirm your account in stage 1 to continue.",
    "es": "Confirme su cuenta en la etapa 1 para continuar.",
    "de": "Bestätigen Sie Ihr Konto in Schritt 1, um fortzufahren.",
    "fr": "Confirmez votre compte à l'étape 1 pour continuer.",
    "it": "Conferma l'account nella fase 1 per continuare."
  },
  "Confirme a liberação para depositar na etapa 2 para continuar.": {
    "en": "Confirm deposit permission in stage 2 to continue.",
    "es": "Confirme el permiso para depositar en la etapa 2 para continuar.",
    "de": "Bestätigen Sie die Einreichungsberechtigung in Schritt 2, um fortzufahren.",
    "fr": "Confirmez l'autorisation de dépôt à l'étape 2 pour continuer.",
    "it": "Conferma l'abilitazione al deposito nella fase 2 per continuare."
  },
  "Aguardando providência externa": {
    "en": "Awaiting external action",
    "es": "Esperando una gestión externa",
    "de": "Externe Maßnahme ausstehend",
    "fr": "En attente d'une démarche externe",
    "it": "In attesa di un intervento esterno"
  },
  "Tenho conta e liberação para depositar no destino correto": {
    "en": "I have an account and permission to deposit at the correct destination",
    "es": "Tengo cuenta y permiso para depositar en el destino correcto",
    "de": "Ich habe ein Konto und die Berechtigung für das richtige Ablageziel",
    "fr": "J'ai un compte et l'autorisation de déposer à la bonne destination",
    "it": "Ho un account e l'abilitazione al deposito nella destinazione corretta"
  },
  "Minha conta está confirmada e já posso iniciar o depósito no local indicado.": {
    "en": "My account is confirmed and I can start a deposit at the indicated destination.",
    "es": "Mi cuenta está confirmada y ya puedo iniciar el depósito en el destino indicado.",
    "de": "Mein Konto ist bestätigt und ich kann am angegebenen Ablageziel eine Einreichung starten.",
    "fr": "Mon compte est confirmé et je peux commencer un dépôt à la destination indiquée.",
    "it": "Il mio account è confermato e posso iniziare il deposito nella destinazione indicata."
  },
  "Tenho conta, mas não tenho liberação para depositar": {
    "en": "I have an account, but no deposit permission",
    "es": "Tengo cuenta, pero no tengo permiso para depositar",
    "de": "Ich habe ein Konto, aber keine Einreichungsberechtigung",
    "fr": "J'ai un compte, mais pas d'autorisation de dépôt",
    "it": "Ho un account, ma non l'abilitazione al deposito"
  },
  "Minha conta está confirmada; preciso conferir ou solicitar a liberação para depositar.": {
    "en": "My account is confirmed; I need to check or request deposit permission.",
    "es": "Mi cuenta está confirmada; debo revisar o solicitar el permiso para depositar.",
    "de": "Mein Konto ist bestätigt; ich muss die Einreichungsberechtigung prüfen oder beantragen.",
    "fr": "Mon compte est confirmé ; je dois vérifier ou demander l'autorisation de dépôt.",
    "it": "Il mio account è confermato; devo verificare o richiedere l'abilitazione al deposito."
  },
  "Ainda não tenho conta confirmada nem liberação para depositar": {
    "en": "I do not yet have a confirmed account or deposit permission",
    "es": "Aún no tengo cuenta confirmada ni permiso para depositar",
    "de": "Ich habe noch kein bestätigtes Konto und keine Einreichungsberechtigung",
    "fr": "Je n'ai pas encore de compte confirmé ni d'autorisation de dépôt",
    "it": "Non ho ancora un account confermato né l'abilitazione al deposito"
  },
  "Vou criar ou confirmar o cadastro e depois solicitar a liberação para depositar.": {
    "en": "I will create or confirm my account and then request deposit permission.",
    "es": "Crearé o confirmaré el registro y después solicitaré el permiso para depositar.",
    "de": "Ich werde mein Konto erstellen oder bestätigen und dann die Einreichungsberechtigung beantragen.",
    "fr": "Je vais créer ou confirmer le compte, puis demander l'autorisation de dépôt.",
    "it": "Creerò o confermerò l'account e poi richiederò l'abilitazione al deposito."
  },
  "Minha conta já está criada e confirmada": {
    "en": "My account is already created and confirmed",
    "es": "Mi cuenta ya está creada y confirmada",
    "de": "Mein Konto ist bereits erstellt und bestätigt",
    "fr": "Mon compte est déjà créé et confirmé",
    "it": "Il mio account è già creato e confermato"
  },
  "Posso seguir para a liberação para depositar.": {
    "en": "I can proceed to deposit permission.",
    "es": "Puedo seguir al permiso para depositar.",
    "de": "Ich kann mit der Einreichungsberechtigung fortfahren.",
    "fr": "Je peux passer à l'autorisation de dépôt.",
    "it": "Posso procedere con l'abilitazione al deposito."
  },
  "Quero ver as orientações de cadastro.": {
    "en": "I want to see the registration instructions.",
    "es": "Quiero ver las instrucciones de registro.",
    "de": "Ich möchte die Registrierungshinweise sehen.",
    "fr": "Je souhaite consulter les instructions d'inscription.",
    "it": "Voglio vedere le istruzioni per la registrazione."
  },
  "Você já enviou o pedido de liberação para depositar ao RI/UFBA?": {
    "en": "Have you sent the deposit permission request to RI/UFBA?",
    "es": "¿Ya envió la solicitud de permiso para depositar al RI/UFBA?",
    "de": "Haben Sie die Einreichungsberechtigung beim RI/UFBA beantragt?",
    "fr": "Avez-vous envoyé la demande d'autorisation de dépôt au RI/UFBA ?",
    "it": "Hai inviato la richiesta di abilitazione al deposito al RI/UFBA?"
  },
  "Vou conferir se recebi liberação para depositar no destino correto.": {
    "en": "I will check whether I received permission for the correct destination.",
    "es": "Revisaré si recibí permiso para depositar en el destino correcto.",
    "de": "Ich prüfe, ob ich die Berechtigung für das richtige Ablageziel erhalten habe.",
    "fr": "Je vais vérifier si j'ai reçu l'autorisation pour la bonne destination.",
    "it": "Verificherò se ho ricevuto l'abilitazione per la destinazione corretta."
  },
  "Ainda não enviei o pedido": {
    "en": "I have not sent the request yet",
    "es": "Aún no envié la solicitud",
    "de": "Ich habe den Antrag noch nicht gesendet",
    "fr": "Je n'ai pas encore envoyé la demande",
    "it": "Non ho ancora inviato la richiesta"
  },
  "Quero preparar a mensagem ao RI/UFBA.": {
    "en": "I want to prepare the message to RI/UFBA.",
    "es": "Quiero preparar el mensaje al RI/UFBA.",
    "de": "Ich möchte die Nachricht an das RI/UFBA vorbereiten.",
    "fr": "Je souhaite préparer le message au RI/UFBA.",
    "it": "Voglio preparare il messaggio al RI/UFBA."
  },
  "Preciso corrigir o destino de depósito liberado": {
    "en": "I need to correct the authorized deposit destination",
    "es": "Debo corregir el destino de depósito habilitado",
    "de": "Ich muss das freigeschaltete Ablageziel korrigieren lassen",
    "fr": "Je dois faire corriger la destination de dépôt autorisée",
    "it": "Devo correggere la destinazione di deposito abilitata"
  },
  "Ainda preciso enviar o pedido de liberação para depositar": {
    "en": "I still need to send the deposit permission request",
    "es": "Aún debo enviar la solicitud de permiso para depositar",
    "de": "Ich muss die Einreichungsberechtigung noch beantragen",
    "fr": "Je dois encore envoyer la demande d'autorisation de dépôt",
    "it": "Devo ancora inviare la richiesta di abilitazione al deposito"
  },
  "Peça a correção da liberação para depositar": {
    "en": "Request a correction to deposit permission",
    "es": "Solicite la corrección del permiso para depositar",
    "de": "Korrektur der Einreichungsberechtigung beantragen",
    "fr": "Demandez la correction de l'autorisation de dépôt",
    "it": "Chiedi la correzione dell'abilitazione al deposito"
  },
  "Não deposite em outro destino apenas porque ele está disponível. Se o destino de depósito indicado pelo Pronto! parecer incorreto, consulte a Biblioteca antes de pedir a alteração ao RI.": {
    "en": "Do not deposit at another destination just because it is available. If the destination indicated by Pronto! seems incorrect, contact the Library before requesting a change from RI.",
    "es": "No deposite en otro destino solo porque está disponible. Si el destino indicado por Pronto! parece incorrecto, consulte a la Biblioteca antes de pedir el cambio al RI.",
    "de": "Reichen Sie nicht an einem anderen Ablageziel ein, nur weil es verfügbar ist. Falls das von Pronto! angegebene Ziel falsch erscheint, wenden Sie sich an die Bibliothek, bevor Sie eine Änderung beim RI beantragen.",
    "fr": "Ne déposez pas ailleurs simplement parce que c'est possible. Si la destination indiquée par Pronto! semble incorrecte, consultez la Bibliothèque avant de demander un changement au RI.",
    "it": "Non depositare in un'altra destinazione solo perché è disponibile. Se la destinazione indicata da Pronto! sembra sbagliata, consulta la Biblioteca prima di chiedere la modifica al RI."
  },
  "Já enviei o pedido ao RI/UFBA": {
    "en": "I have sent the request to RI/UFBA",
    "es": "Ya envié la solicitud al RI/UFBA",
    "de": "Ich habe den Antrag an das RI/UFBA gesendet",
    "fr": "J'ai envoyé la demande au RI/UFBA",
    "it": "Ho inviato la richiesta al RI/UFBA"
  },
  "O próximo passo é conferir se a liberação para depositar foi concedida.": {
    "en": "The next step is to check whether deposit permission has been granted.",
    "es": "El siguiente paso es comprobar si se concedió el permiso para depositar.",
    "de": "Prüfen Sie als Nächstes, ob die Einreichungsberechtigung erteilt wurde.",
    "fr": "L'étape suivante consiste à vérifier si l'autorisation de dépôt a été accordée.",
    "it": "Il prossimo passaggio è verificare se l'abilitazione al deposito è stata concessa."
  },
  "Confirme que o cadastro está ativo e que o RI/UFBA permite iniciar o depósito no destino de depósito indicado.": {
    "en": "Confirm that your account is active and RI/UFBA lets you start a deposit at the indicated destination.",
    "es": "Confirme que su cuenta está activa y que el RI/UFBA permite iniciar el depósito en el destino indicado.",
    "de": "Bestätigen Sie, dass Ihr Konto aktiv ist und Sie im RI/UFBA am angegebenen Ablageziel eine Einreichung starten können.",
    "fr": "Confirmez que votre compte est actif et que le RI/UFBA permet de commencer un dépôt à la destination indiquée.",
    "it": "Conferma che l'account è attivo e che il RI/UFBA consente di iniziare il deposito nella destinazione indicata."
  },
  "Confirmo a conta e a liberação para depositar neste destino": {
    "en": "I confirm my account and permission to deposit at this destination",
    "es": "Confirmo la cuenta y el permiso para depositar en este destino",
    "de": "Ich bestätige mein Konto und die Berechtigung für dieses Ablageziel",
    "fr": "Je confirme mon compte et l'autorisation de déposer à cette destination",
    "it": "Confermo l'account e l'abilitazione al deposito in questa destinazione"
  },
  "Conferi a liberação para depositar no destino correto deste trabalho.": {
    "en": "I checked deposit permission for this work's correct destination.",
    "es": "Revisé el permiso para depositar en el destino correcto de este trabajo.",
    "de": "Ich habe die Berechtigung für das richtige Ablageziel dieser Arbeit geprüft.",
    "fr": "J'ai vérifié l'autorisation de déposer à la bonne destination pour ce travail.",
    "it": "Ho verificato l'abilitazione al deposito nella destinazione corretta di questo lavoro."
  },
  "Ainda aguardo ou não consegui confirmar a liberação para depositar": {
    "en": "I am still waiting or could not confirm deposit permission",
    "es": "Aún espero o no pude confirmar el permiso para depositar",
    "de": "Ich warte noch oder konnte die Einreichungsberechtigung nicht bestätigen",
    "fr": "J'attends encore ou n'ai pas pu confirmer l'autorisation de dépôt",
    "it": "Sto ancora aspettando o non ho potuto confermare l'abilitazione al deposito"
  },
  "Preciso voltar à conferência da liberação para depositar.": {
    "en": "I need to return to the deposit permission check.",
    "es": "Debo volver a revisar el permiso para depositar.",
    "de": "Ich muss zur Prüfung der Einreichungsberechtigung zurückkehren.",
    "fr": "Je dois revenir à la vérification de l'autorisation de dépôt.",
    "it": "Devo tornare alla verifica dell'abilitazione al deposito."
  },
  "Percebi que a liberação para depositar está no destino de depósito errado": {
    "en": "I noticed my deposit permission is for the wrong destination",
    "es": "Noté que el permiso para depositar corresponde al destino incorrecto",
    "de": "Ich habe bemerkt, dass meine Berechtigung für das falsche Ablageziel gilt",
    "fr": "J'ai constaté que mon autorisation de dépôt concerne la mauvaise destination",
    "it": "Ho notato che l'abilitazione al deposito riguarda la destinazione sbagliata"
  },
  "Vou solicitar ao RI/UFBA a correção da liberação para depositar.": {
    "en": "I will ask RI/UFBA to correct my deposit permission.",
    "es": "Pediré al RI/UFBA la corrección del permiso para depositar.",
    "de": "Ich werde das RI/UFBA um Korrektur meiner Einreichungsberechtigung bitten.",
    "fr": "Je vais demander au RI/UFBA de corriger mon autorisation de dépôt.",
    "it": "Chiederò al RI/UFBA la correzione dell'abilitazione al deposito."
  },
  "Liberação para depositar confirmada. Tenha em mãos o PDF final com a ficha catalográfica. O guia ajudará a preencher os dados e concluir o depósito no RI/UFBA.": {
    "en": "Deposit permission confirmed. Have the final PDF with the catalog record ready. The guide will help you enter the details and complete your RI/UFBA deposit.",
    "es": "Permiso para depositar confirmado. Tenga listo el PDF final con la ficha catalográfica. La guía le ayudará a completar los datos y el depósito en el RI/UFBA.",
    "de": "Einreichungsberechtigung bestätigt. Halten Sie die endgültige PDF-Datei mit Katalogeintrag bereit. Der Leitfaden hilft Ihnen, die Angaben auszufüllen und die Einreichung im RI/UFBA abzuschließen.",
    "fr": "Autorisation de dépôt confirmée. Préparez le PDF final avec la notice de catalogage. Le guide vous aidera à saisir les données et à terminer le dépôt au RI/UFBA.",
    "it": "Abilitazione al deposito confermata. Tieni pronto il PDF finale con la scheda catalografica. La guida ti aiuterà a compilare i dati e completare il deposito nel RI/UFBA."
  },
  "Você pode sair e voltar depois. Suas respostas ficam salvas neste trabalho. Confira o e-mail ou sua conta no RI/UFBA antes de confirmar a liberação para depositar.": {
    "en": "You can leave and return later. Your answers are saved for this work. Check your email or RI/UFBA account before confirming deposit permission.",
    "es": "Puede salir y volver después. Sus respuestas quedan guardadas para este trabajo. Revise el correo o su cuenta del RI/UFBA antes de confirmar el permiso para depositar.",
    "de": "Sie können die Seite verlassen und später zurückkehren. Ihre Antworten werden für diese Arbeit gespeichert. Prüfen Sie Ihre E-Mails oder Ihr RI/UFBA-Konto, bevor Sie die Einreichungsberechtigung bestätigen.",
    "fr": "Vous pouvez quitter et revenir plus tard. Vos réponses sont enregistrées pour ce travail. Consultez vos e-mails ou votre compte RI/UFBA avant de confirmer l'autorisation de dépôt.",
    "it": "Puoi uscire e tornare più tardi. Le risposte vengono salvate per questo lavoro. Controlla l'e-mail o l'account RI/UFBA prima di confermare l'abilitazione al deposito."
  },
  "Passo 2": {
    "en": "Step 2",
    "es": "Paso 2",
    "de": "Schritt 2",
    "fr": "Étape 2",
    "it": "Passaggio 2"
  },
  "Abrindo guia…": {
    "en": "Opening guide…",
    "es": "Abriendo guía…",
    "de": "Leitfaden wird geöffnet…",
    "fr": "Ouverture du guide…",
    "it": "Apertura della guida…"
  },
  "Começar o guia do autodepósito": {
    "en": "Start the self-deposit guide",
    "es": "Comenzar la guía de autodepósito",
    "de": "Leitfaden zur Selbsteinreichung starten",
    "fr": "Commencer le guide d'auto-dépôt",
    "it": "Inizia la guida all'auto-deposito"
  },
  "Confirme a liberação para depositar no destino correto para começar.": {
    "en": "Confirm permission for the correct destination to start.",
    "es": "Confirme el permiso para depositar en el destino correcto para comenzar.",
    "de": "Bestätigen Sie die Berechtigung für das richtige Ablageziel, um zu starten.",
    "fr": "Confirmez l'autorisation pour la bonne destination afin de commencer.",
    "it": "Conferma l'abilitazione per la destinazione corretta per iniziare."
  },
  "Confirme a conta e a liberação para depositar no RI/UFBA para começar.": {
    "en": "Confirm your account and RI/UFBA deposit permission to start.",
    "es": "Confirme la cuenta y el permiso para depositar en el RI/UFBA para comenzar.",
    "de": "Bestätigen Sie Ihr Konto und die Einreichungsberechtigung im RI/UFBA, um zu starten.",
    "fr": "Confirmez votre compte et l'autorisation de dépôt au RI/UFBA pour commencer.",
    "it": "Conferma l'account e l'abilitazione al deposito nel RI/UFBA per iniziare."
  },
  "Demonstração: respostas não são salvas na conta.": {
    "en": "Demo: answers are not saved to your account.",
    "es": "Demostración: las respuestas no se guardan en la cuenta.",
    "de": "Demo: Antworten werden nicht in Ihrem Konto gespeichert.",
    "fr": "Démonstration : les réponses ne sont pas enregistrées dans votre compte.",
    "it": "Dimostrazione: le risposte non vengono salvate nell'account."
  },
  "Salvando respostas…": {
    "en": "Saving answers…",
    "es": "Guardando respuestas…",
    "de": "Antworten werden gespeichert…",
    "fr": "Enregistrement des réponses…",
    "it": "Salvataggio delle risposte…"
  },
  "Sua liberação para depositar precisa de correção?": {
    "en": "Does your deposit permission need correcting?",
    "es": "¿Su permiso para depositar necesita corrección?",
    "de": "Muss Ihre Einreichungsberechtigung korrigiert werden?",
    "fr": "Votre autorisation de dépôt doit-elle être corrigée ?",
    "it": "L'abilitazione al deposito deve essere corretta?"
  },
  "Sua liberação para depositar está correta para começar?": {
    "en": "Is your deposit permission correct to start?",
    "es": "¿El permiso para depositar es correcto para comenzar?",
    "de": "Ist Ihre Einreichungsberechtigung korrekt, um zu starten?",
    "fr": "Votre autorisation de dépôt est-elle correcte pour commencer ?",
    "it": "L'abilitazione al deposito è corretta per iniziare?"
  },
  "Confira a liberação para depositar recebida": {
    "en": "Check the deposit permission you received",
    "es": "Revise el permiso para depositar recibido",
    "de": "Erhaltene Einreichungsberechtigung prüfen",
    "fr": "Vérifiez l'autorisation de dépôt reçue",
    "it": "Verifica l'abilitazione al deposito ricevuta"
  },
  "Confirme a liberação para depositar este trabalho": {
    "en": "Confirm permission to deposit this work",
    "es": "Confirme el permiso para depositar este trabajo",
    "de": "Berechtigung zur Einreichung dieser Arbeit bestätigen",
    "fr": "Confirmez l'autorisation de déposer ce travail",
    "it": "Conferma l'abilitazione al deposito di questo lavoro"
  },
  "Compare o destino de depósito liberado na sua conta com os dois valores esperados abaixo.": {
    "en": "Compare the deposit destination available in your account with the two expected values below.",
    "es": "Compare el destino habilitado en su cuenta con los dos valores esperados a continuación.",
    "de": "Vergleichen Sie das freigeschaltete Ablageziel Ihres Kontos mit den beiden unten erwarteten Werten.",
    "fr": "Comparez la destination de dépôt autorisée dans votre compte aux deux valeurs attendues ci-dessous.",
    "it": "Confronta la destinazione abilitata nel tuo account con i due valori attesi sotto."
  },
  "Siga estes passos no RI/UFBA antes de confirmar a liberação para depositar.": {
    "en": "Follow these steps in RI/UFBA before confirming deposit permission.",
    "es": "Siga estos pasos en el RI/UFBA antes de confirmar el permiso para depositar.",
    "de": "Befolgen Sie diese Schritte im RI/UFBA, bevor Sie die Einreichungsberechtigung bestätigen.",
    "fr": "Suivez ces étapes dans le RI/UFBA avant de confirmer l'autorisation de dépôt.",
    "it": "Segui questi passaggi nel RI/UFBA prima di confermare l'abilitazione al deposito."
  },
  "Faça login e inicie um depósito": {
    "en": "Sign in and start a deposit",
    "es": "Inicie sesión y comience un depósito",
    "de": "Anmelden und Einreichung starten",
    "fr": "Connectez-vous et commencez un dépôt",
    "it": "Accedi e inizia un deposito"
  },
  "Entre na sua conta do RI/UFBA. Em Meu espaço, clique no botão verde “Iniciar um novo depósito”.": {
    "en": "Sign in to RI/UFBA. Under “Meu espaço”, click the green “Iniciar um novo depósito” button.",
    "es": "Acceda a su cuenta del RI/UFBA. En “Meu espaço”, pulse el botón verde “Iniciar um novo depósito”.",
    "de": "Melden Sie sich im RI/UFBA an. Klicken Sie unter „Meu espaço“ auf die grüne Schaltfläche „Iniciar um novo depósito“.",
    "fr": "Connectez-vous au RI/UFBA. Dans « Meu espaço », cliquez sur le bouton vert « Iniciar um novo depósito ».",
    "it": "Accedi al RI/UFBA. In “Meu espaço”, fai clic sul pulsante verde “Iniciar um novo depósito”."
  },
  "Confira a coleção": {
    "en": "Check the collection",
    "es": "Revise la colección",
    "de": "Sammlung prüfen",
    "fr": "Vérifiez la collection",
    "it": "Verifica la collezione"
  },
  "Na tela “Depósito: Escolha uma coleção”, verifique se o campo “Coleção” permite escolher este caminho completo:": {
    "en": "On the “Depósito: Escolha uma coleção” screen, check that the “Coleção” field lets you select this complete path:",
    "es": "En la pantalla “Depósito: Escolha uma coleção”, compruebe que el campo “Coleção” permite seleccionar esta ruta completa:",
    "de": "Prüfen Sie auf der Seite „Depósito: Escolha uma coleção“, ob im Feld „Coleção“ dieser vollständige Pfad auswählbar ist:",
    "fr": "Sur l'écran « Depósito: Escolha uma coleção », vérifiez que le champ « Coleção » permet de sélectionner ce chemin complet :",
    "it": "Nella schermata “Depósito: Escolha uma coleção”, verifica che il campo “Coleção” consenta di selezionare questo percorso completo:"
  },
  "Confira o tipo de documento": {
    "en": "Check the document type",
    "es": "Revise el tipo de documento",
    "de": "Dokumenttyp prüfen",
    "fr": "Vérifiez le type de document",
    "it": "Verifica il tipo di documento"
  },
  "Na primeira tela “Depósito: descreva este item”, verifique se o campo “Tipo de documento” permite selecionar:": {
    "en": "On the first “Depósito: descreva este item” screen, check that the “Tipo de documento” field lets you select:",
    "es": "En la primera pantalla “Depósito: descreva este item”, compruebe que el campo “Tipo de documento” permite seleccionar:",
    "de": "Prüfen Sie auf der ersten Seite „Depósito: descreva este item“, ob im Feld „Tipo de documento“ Folgendes auswählbar ist:",
    "fr": "Sur le premier écran « Depósito: descreva este item », vérifiez que le champ « Tipo de documento » permet de sélectionner :",
    "it": "Nella prima schermata “Depósito: descreva este item”, verifica che il campo “Tipo de documento” consenta di selezionare:"
  },
  "Se o destino liberado para depositar for diferente do esperado, confirme abaixo para preparar o pedido de correção ao RI/UFBA. Se quiser rever o que informou, volte à resposta.": {
    "en": "If the authorized deposit destination differs from the expected one, confirm below to prepare a correction request to RI/UFBA. To review what you entered, return to your answer.",
    "es": "Si el destino habilitado difiere del esperado, confirme abajo para preparar la solicitud de corrección al RI/UFBA. Para revisar lo indicado, vuelva a su respuesta.",
    "de": "Weicht das freigeschaltete Ablageziel vom erwarteten ab, bestätigen Sie unten, um einen Korrekturantrag an das RI/UFBA vorzubereiten. Kehren Sie zur Antwort zurück, um Ihre Angaben zu prüfen.",
    "fr": "Si la destination autorisée diffère de celle attendue, confirmez ci-dessous pour préparer une demande de correction au RI/UFBA. Pour revoir vos indications, revenez à votre réponse.",
    "it": "Se la destinazione abilitata è diversa da quella attesa, conferma sotto per preparare la richiesta di correzione al RI/UFBA. Per rivedere ciò che hai indicato, torna alla risposta."
  },
  "Confirme se consegue iniciar o depósito com esses dois valores. Se a liberação para depositar estiver em outro destino, escolha pedir a correção. Se ainda não conseguiu conferir, feche esta janela para voltar à pergunta.": {
    "en": "Confirm that you can start a deposit with both values. If your permission is for another destination, choose to request a correction. If you have not checked yet, close this window to return to the question.",
    "es": "Confirme que puede iniciar el depósito con ambos valores. Si el permiso corresponde a otro destino, elija pedir la corrección. Si aún no pudo revisarlo, cierre esta ventana para volver a la pregunta.",
    "de": "Bestätigen Sie, dass Sie mit beiden Werten eine Einreichung starten können. Gilt Ihre Berechtigung für ein anderes Ablageziel, beantragen Sie eine Korrektur. Falls Sie noch nicht geprüft haben, schließen Sie dieses Fenster, um zur Frage zurückzukehren.",
    "fr": "Confirmez que vous pouvez commencer un dépôt avec ces deux valeurs. Si votre autorisation concerne une autre destination, demandez une correction. Si vous n'avez pas encore vérifié, fermez cette fenêtre pour revenir à la question.",
    "it": "Conferma di poter iniziare il deposito con entrambi i valori. Se l'abilitazione riguarda un'altra destinazione, scegli di chiedere la correzione. Se non hai ancora verificato, chiudi questa finestra per tornare alla domanda."
  },
  "Voltar e rever minha resposta": {
    "en": "Go back and review my answer",
    "es": "Volver y revisar mi respuesta",
    "de": "Zurück und meine Antwort prüfen",
    "fr": "Revenir et revoir ma réponse",
    "it": "Torna indietro e rivedi la risposta"
  },
  "Não, preciso corrigir a liberação para depositar": {
    "en": "No, I need to correct my deposit permission",
    "es": "No, debo corregir el permiso para depositar",
    "de": "Nein, meine Einreichungsberechtigung muss korrigiert werden",
    "fr": "Non, je dois faire corriger mon autorisation de dépôt",
    "it": "No, devo correggere l'abilitazione al deposito"
  },
  "Sim, preciso solicitar a correção": {
    "en": "Yes, I need to request a correction",
    "es": "Sí, debo solicitar la corrección",
    "de": "Ja, ich muss eine Korrektur beantragen",
    "fr": "Oui, je dois demander une correction",
    "it": "Sì, devo richiedere la correzione"
  },
  "Sim, os dois valores estão corretos": {
    "en": "Yes, both values are correct",
    "es": "Sí, ambos valores son correctos",
    "de": "Ja, beide Werte sind korrekt",
    "fr": "Oui, les deux valeurs sont correctes",
    "it": "Sì, entrambi i valori sono corretti"
  },
  "Recarregar respostas": {
    "en": "Reload answers",
    "es": "Recargar respuestas",
    "de": "Antworten neu laden",
    "fr": "Recharger les réponses",
    "it": "Ricarica le risposte"
  },
  "Solicito a correção da minha liberação para depositar no destino indicado abaixo. Minha conta permite depositar em outro destino.": {
    "en": "I request a correction to my deposit permission for the destination indicated below. My account allows deposits at another destination.",
    "es": "Solicito la corrección de mi permiso para depositar en el destino indicado a continuación. Mi cuenta permite depositar en otro destino.",
    "de": "Ich bitte um Korrektur meiner Einreichungsberechtigung für das unten angegebene Ablageziel. Mein Konto erlaubt Einreichungen an einem anderen Ablageziel.",
    "fr": "Je demande la correction de mon autorisation de dépôt pour la destination indiquée ci-dessous. Mon compte permet de déposer à une autre destination.",
    "it": "Chiedo la correzione della mia abilitazione al deposito nella destinazione indicata sotto. Il mio account consente il deposito in un'altra destinazione."
  },
  "Correção da liberação para depositar": {
    "en": "Correction to deposit permission",
    "es": "Corrección del permiso para depositar",
    "de": "Korrektur der Einreichungsberechtigung",
    "fr": "Correction de l'autorisation de dépôt",
    "it": "Correzione dell'abilitazione al deposito"
  },
  "Pedido de liberação para depositar": {
    "en": "Deposit permission request",
    "es": "Solicitud de permiso para depositar",
    "de": "Antrag auf Einreichungsberechtigung",
    "fr": "Demande d'autorisation de dépôt",
    "it": "Richiesta di abilitazione al deposito"
  },
  "Envie sua mensagem para": {
    "en": "Send your message to",
    "es": "Envíe su mensaje a",
    "de": "Senden Sie Ihre Nachricht an",
    "fr": "Envoyez votre message à",
    "it": "Invia il messaggio a"
  },
  "Rever preparação para depositar": {
    "en": "Review deposit preparation",
    "es": "Revisar la preparación para depositar",
    "de": "Vorbereitung zur Einreichung überprüfen",
    "fr": "Revoir la préparation du dépôt",
    "it": "Rivedi la preparazione al deposito"
  },
  "E-mail do RI copiado": {
    "en": "RI email copied",
    "es": "Correo del RI copiado",
    "de": "RI-E-Mail-Adresse kopiert",
    "fr": "Adresse e-mail du RI copiée",
    "it": "E-mail del RI copiata"
  },
  "Copiar e-mail do RI": {
    "en": "Copy RI email",
    "es": "Copiar correo del RI",
    "de": "RI-E-Mail-Adresse kopieren",
    "fr": "Copier l'adresse e-mail du RI",
    "it": "Copia l'e-mail del RI"
  },
  "Copiar e-mail": {
    "en": "Copy email",
    "es": "Copiar correo",
    "de": "E-Mail-Adresse kopieren",
    "fr": "Copier l'adresse e-mail",
    "it": "Copia e-mail"
  },
  "E-mail copiado.": {
    "en": "Email copied.",
    "es": "Correo copiado.",
    "de": "E-Mail-Adresse kopiert.",
    "fr": "Adresse e-mail copiée.",
    "it": "E-mail copiata."
  },
  "Não foi possível copiar. Tente novamente.": {
    "en": "Could not copy. Try again.",
    "es": "No se pudo copiar. Inténtelo de nuevo.",
    "de": "Kopieren fehlgeschlagen. Versuchen Sie es erneut.",
    "fr": "Impossible de copier. Réessayez.",
    "it": "Impossibile copiare. Riprova."
  },
  "Não foi possível registrar o envio. Atualize a página para conferir a situação do protocolo antes de tentar novamente.": {
    "en": "Could not record the submission. Refresh the page to check the request status before trying again.",
    "es": "No se pudo registrar el envío. Actualice la página para revisar el estado de la solicitud antes de volver a intentarlo.",
    "de": "Die Einreichung konnte nicht erfasst werden. Aktualisieren Sie die Seite, um den Antragsstatus vor einem erneuten Versuch zu prüfen.",
    "fr": "Impossible d'enregistrer l'envoi. Actualisez la page pour vérifier l'état de la demande avant de réessayer.",
    "it": "Impossibile registrare l'invio. Aggiorna la pagina per verificare lo stato della richiesta prima di riprovare."
  },
  "Depois do envio no RI/UFBA": {
    "en": "After submitting to RI/UFBA",
    "es": "Después del envío al RI/UFBA",
    "de": "Nach der Einreichung im RI/UFBA",
    "fr": "Après l'envoi au RI/UFBA",
    "it": "Dopo l'invio al RI/UFBA"
  },
  "Publicação verificada pela Biblioteca": {
    "en": "Publication verified by the Library",
    "es": "Publicación verificada por la Biblioteca",
    "de": "Veröffentlichung von der Bibliothek geprüft",
    "fr": "Publication vérifiée par la Bibliothèque",
    "it": "Pubblicazione verificata dalla Biblioteca"
  },
  "Envio informado · aguardando validação": {
    "en": "Submission reported · awaiting validation",
    "es": "Envío informado · esperando validación",
    "de": "Einreichung gemeldet · Validierung ausstehend",
    "fr": "Envoi signalé · en attente de validation",
    "it": "Invio segnalato · in attesa di validazione"
  },
  "Concluiu a submissão do trabalho?": {
    "en": "Have you completed your work's submission?",
    "es": "¿Completó el envío del trabajo?",
    "de": "Haben Sie die Einreichung Ihrer Arbeit abgeschlossen?",
    "fr": "Avez-vous terminé l'envoi du travail ?",
    "it": "Hai completato l'invio del lavoro?"
  },
  "A Biblioteca já verificou a publicação deste trabalho.": {
    "en": "The Library has already verified this work's publication.",
    "es": "La Biblioteca ya verificó la publicación de este trabajo.",
    "de": "Die Bibliothek hat die Veröffentlichung dieser Arbeit bereits geprüft.",
    "fr": "La Bibliothèque a déjà vérifié la publication de ce travail.",
    "it": "La Biblioteca ha già verificato la pubblicazione di questo lavoro."
  },
  "Depois de enviar o trabalho no RI/UFBA, confirme aqui. A submissão aguardará a validação da Biblioteca; o RI/UFBA informará o resultado pelo e-mail cadastrado no repositório.": {
    "en": "After submitting your work to RI/UFBA, confirm here. It will await Library validation; RI/UFBA will notify you of the outcome at the email registered in the repository.",
    "es": "Después de enviar el trabajo al RI/UFBA, confirme aquí. La Biblioteca deberá validar el envío; el RI/UFBA informará el resultado al correo registrado en el repositorio.",
    "de": "Bestätigen Sie hier, nachdem Sie Ihre Arbeit im RI/UFBA eingereicht haben. Anschließend erfolgt die Validierung durch die Bibliothek. Das RI/UFBA informiert Sie über das Ergebnis unter der im Repositorium registrierten E-Mail-Adresse.",
    "fr": "Après avoir envoyé votre travail au RI/UFBA, confirmez ici. L'envoi attendra la validation de la Bibliothèque ; le RI/UFBA vous informera du résultat à l'adresse e-mail enregistrée dans le dépôt.",
    "it": "Dopo aver inviato il lavoro al RI/UFBA, conferma qui. L'invio attenderà la validazione della Biblioteca; il RI/UFBA comunicherà l'esito all'e-mail registrata nel repository."
  },
  "Publicação já verificada": {
    "en": "Publication already verified",
    "es": "Publicación ya verificada",
    "de": "Veröffentlichung bereits geprüft",
    "fr": "Publication déjà vérifiée",
    "it": "Pubblicazione già verificata"
  },
  "Envio já informado": {
    "en": "Submission already reported",
    "es": "Envío ya informado",
    "de": "Einreichung bereits gemeldet",
    "fr": "Envoi déjà signalé",
    "it": "Invio già segnalato"
  },
  "Confirmo que enviei o trabalho ao RI/UFBA": {
    "en": "I confirm that I submitted my work to RI/UFBA",
    "es": "Confirmo que envié el trabajo al RI/UFBA",
    "de": "Ich bestätige, dass ich meine Arbeit im RI/UFBA eingereicht habe",
    "fr": "Je confirme avoir envoyé le travail au RI/UFBA",
    "it": "Confermo di aver inviato il lavoro al RI/UFBA"
  },
  "A confirmação de envio já não é necessária.": {
    "en": "Submission confirmation is no longer needed.",
    "es": "La confirmación de envío ya no es necesaria.",
    "de": "Eine Einreichungsbestätigung ist nicht mehr erforderlich.",
    "fr": "La confirmation d'envoi n'est plus nécessaire.",
    "it": "La conferma dell'invio non è più necessaria."
  },
  "Aguardando a validação da Biblioteca no RI/UFBA.": {
    "en": "Awaiting Library validation in RI/UFBA.",
    "es": "Esperando la validación de la Biblioteca en el RI/UFBA.",
    "de": "Validierung durch die Bibliothek im RI/UFBA ausstehend.",
    "fr": "En attente de validation par la Bibliothèque dans le RI/UFBA.",
    "it": "In attesa della validazione della Biblioteca nel RI/UFBA."
  },
  "Você concluiu a submissão no RI/UFBA?": {
    "en": "Have you completed your RI/UFBA submission?",
    "es": "¿Completó el envío al RI/UFBA?",
    "de": "Haben Sie Ihre Einreichung im RI/UFBA abgeschlossen?",
    "fr": "Avez-vous terminé votre envoi au RI/UFBA ?",
    "it": "Hai completato l'invio al RI/UFBA?"
  },
  "Confirme somente depois de finalizar o envio no repositório. Este registro informa que você enviou o trabalho; a validação da Biblioteca ainda será realizada no RI/UFBA.": {
    "en": "Confirm only after finishing submission in the repository. This records that you submitted your work; Library validation will still take place in RI/UFBA.",
    "es": "Confirme solo después de finalizar el envío en el repositorio. Este registro indica que envió el trabajo; la Biblioteca aún deberá validarlo en el RI/UFBA.",
    "de": "Bestätigen Sie erst nach Abschluss der Einreichung im Repositorium. Damit wird die Einreichung Ihrer Arbeit erfasst; die Validierung durch die Bibliothek erfolgt weiterhin im RI/UFBA.",
    "fr": "Confirmez uniquement après avoir terminé l'envoi dans le dépôt. Cet enregistrement indique que vous avez envoyé le travail ; la Bibliothèque devra encore le valider dans le RI/UFBA.",
    "it": "Conferma solo dopo aver completato l'invio nel repository. Questo registra che hai inviato il lavoro; la Biblioteca dovrà ancora validarlo nel RI/UFBA."
  },
  "Sim, concluí o envio ao RI/UFBA": {
    "en": "Yes, I completed the RI/UFBA submission",
    "es": "Sí, completé el envío al RI/UFBA",
    "de": "Ja, ich habe die Einreichung im RI/UFBA abgeschlossen",
    "fr": "Oui, j'ai terminé l'envoi au RI/UFBA",
    "it": "Sì, ho completato l'invio al RI/UFBA"
  },
  "Coleção prevista": {
    "en": "Expected collection",
    "es": "Colección prevista",
    "de": "Vorgesehene Sammlung",
    "fr": "Collection prévue",
    "it": "Collezione prevista"
  },
  "A equipe do RI libera o acesso à coleção adequada; confira a que aparece na sua conta.": {
    "en": "The RI team grants access to the appropriate collection; check the one shown in your account.",
    "es": "El equipo del RI habilita el acceso a la colección adecuada; revise la que aparece en su cuenta.",
    "de": "Das RI-Team gewährt Zugang zur passenden Sammlung. Prüfen Sie die in Ihrem Konto angezeigte Sammlung.",
    "fr": "L'équipe du RI autorise l'accès à la collection appropriée ; vérifiez celle affichée dans votre compte.",
    "it": "Il team del RI abilita l'accesso alla collezione appropriata; verifica quella visualizzata nel tuo account."
  },
  "Tipo de documento previsto": {
    "en": "Expected document type",
    "es": "Tipo de documento previsto",
    "de": "Vorgesehener Dokumenttyp",
    "fr": "Type de document prévu",
    "it": "Tipo di documento previsto"
  },
  "Você receberá um lembrete em {date}, às {time}.": {
    "en": "You will receive a reminder on {date} at {time}.",
    "es": "Recibirá un recordatorio el {date}, a las {time}.",
    "de": "Sie erhalten am {date} um {time} eine Erinnerung.",
    "fr": "Vous recevrez un rappel le {date} à {time}.",
    "it": "Riceverai un promemoria il {date} alle {time}."
  },
  "Entre na nova aba e volte para começar o guia.": {
    "en": "Sign in in the new tab, then return to start the guide.",
    "es": "Inicie sesión en la nueva pestaña y vuelva para comenzar la guía.",
    "de": "Melden Sie sich im neuen Tab an und kehren Sie zurück, um den Leitfaden zu starten.",
    "fr": "Connectez-vous dans le nouvel onglet, puis revenez pour commencer le guide.",
    "it": "Accedi nella nuova scheda, poi torna per iniziare la guida."
  },
  "Fechar janela": {
    "en": "Close window",
    "es": "Cerrar ventana",
    "de": "Fenster schließen",
    "fr": "Fermer la fenêtre",
    "it": "Chiudi finestra"
  },
  "Correção de liberação para depósito no RI/UFBA - {name}": {
    "en": "Correction to RI/UFBA deposit permission - {name}",
    "es": "Corrección del permiso para depositar en RI/UFBA - {name}",
    "de": "Korrektur der Einreichungsberechtigung im RI/UFBA - {name}",
    "fr": "Correction de l'autorisation de dépôt au RI/UFBA - {name}",
    "it": "Correzione dell'abilitazione al deposito nel RI/UFBA - {name}"
  },
  "Confirmação necessária": {
    "en": "Confirmation required",
    "es": "Confirmación necesaria",
    "de": "Bestätigung erforderlich",
    "fr": "Confirmation nécessaire",
    "it": "Conferma necessaria"
  },
  "Continuar revisando": {
    "en": "Continue reviewing",
    "es": "Continuar revisando",
    "de": "Weiter prüfen",
    "fr": "Continuer la vérification",
    "it": "Continua la verifica"
  },
  "Confirmando…": {
    "en": "Confirming…",
    "es": "Confirmando…",
    "de": "Wird bestätigt…",
    "fr": "Confirmation…",
    "it": "Conferma in corso…"
  }
};
