"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { dismissPanelChange, showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { additionalEquivalentLanguage, compactDraft, restoreStudentRequestDraft, emptyStudentRequestDraft, requiredEquivalentLanguages, studentPreviewDraftKey, studentRequestDraftKey, type RequestLanguage, type StudentRequestDraft } from "@/domain/student-requests/draft";
import { isPublicWorkUrlCandidate } from "@/domain/student-requests/public-work-url";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { ModalCloseButton } from "@/components/modal-close-button";
import { formGuidance } from "@/domain/student-requests/form-guidance";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";
import { studentPreparationKey } from "@/components/student-request-confirmations";

export type Program = { id: string; code: string; name: string; level: string; work_type: string };
const levelLabels: Record<FormLanguage, Record<string, string>> = {
  pt: { undergraduate: "Graduação", specialization: "Especialização", master: "Mestrado", doctorate: "Doutorado" },
  en: { undergraduate: "Undergraduate", specialization: "Specialization", master: "Master’s", doctorate: "Doctorate" },
  es: { undergraduate: "Grado", specialization: "Especialización", master: "Maestría", doctorate: "Doctorado" },
  de: { undergraduate: "Bachelor", specialization: "Spezialisierung", master: "Master", doctorate: "Promotion" },
  fr: { undergraduate: "Licence", specialization: "Spécialisation", master: "Master", doctorate: "Doctorat" },
  it: { undergraduate: "Laurea", specialization: "Specializzazione", master: "Master", doctorate: "Dottorato" },
};
type FormLanguage = "pt" | "en" | "es" | "de" | "fr" | "it";
const requesterAuthorCopy: Record<FormLanguage, { label: string; placeholder: string; note: string; automatic: string }> = {
  pt: { label: "Qual autor é você?", placeholder: "Selecione seu nome na lista de autores", note: "Seu ano de nascimento será associado somente ao autor selecionado, mesmo que ele não seja o primeiro.", automatic: "Seu nome foi identificado na lista de autores. Confira a seleção antes de enviar." },
  en: { label: "Which author are you?", placeholder: "Select your name from the author list", note: "Your birth year will be linked only to the selected author, even if they are not the first author.", automatic: "Your name was found in the author list. Check the selection before submitting." },
  es: { label: "¿Cuál de los autores es usted?", placeholder: "Seleccione su nombre en la lista de autores", note: "Su año de nacimiento se asociará solo al autor seleccionado, aunque no sea el primero.", automatic: "Encontramos su nombre en la lista de autores. Compruebe la selección antes de enviar." },
  de: { label: "Welche Person in der Autorenliste sind Sie?", placeholder: "Wählen Sie Ihren Namen aus der Autorenliste", note: "Ihr Geburtsjahr wird nur der ausgewählten Person zugeordnet, auch wenn sie nicht an erster Stelle steht.", automatic: "Ihr Name wurde in der Autorenliste gefunden. Prüfen Sie die Auswahl vor dem Absenden." },
  fr: { label: "Quel auteur êtes-vous ?", placeholder: "Sélectionnez votre nom dans la liste des auteurs", note: "Votre année de naissance sera liée uniquement à l’auteur sélectionné, même s’il n’est pas en première position.", automatic: "Votre nom a été trouvé dans la liste des auteurs. Vérifiez la sélection avant l’envoi." },
  it: { label: "Quale autore sei?", placeholder: "Seleziona il tuo nome nell’elenco degli autori", note: "Il tuo anno di nascita sarà associato solo all’autore selezionato, anche se non è il primo.", automatic: "Il tuo nome è stato trovato nell’elenco degli autori. Controlla la selezione prima dell’invio." },
};
const sharedFileDeclarationCopy: Record<FormLanguage, { declaration: string; review: string }> = {
  pt: { declaration: "Comprometo-me a manter acessível e a não alterar, substituir nem remover o arquivo disponibilizado no link público após enviar esta solicitação, até o encerramento do protocolo.", review: "Compromisso de manter o arquivo compartilhado acessível e inalterado" },
  en: { declaration: "I agree to keep the file shared through the public link accessible and not to change, replace, or remove it after submitting this request until the request is closed.", review: "Commitment to keep the shared file accessible and unchanged" },
  es: { declaration: "Me comprometo a mantener accesible el archivo del enlace público y a no modificarlo, sustituirlo ni eliminarlo después de enviar esta solicitud y hasta el cierre del trámite.", review: "Compromiso de mantener accesible e inalterado el archivo compartido" },
  de: { declaration: "Ich verpflichte mich, die über den öffentlichen Link bereitgestellte Datei bis zum Abschluss zugänglich zu halten und sie nach dem Absenden weder zu ändern noch zu ersetzen oder zu entfernen.", review: "Verpflichtung, die freigegebene Datei zugänglich und unverändert zu halten" },
  fr: { declaration: "Je m'engage à garder accessible le fichier du lien public et à ne pas le modifier, remplacer ni supprimer après l'envoi de cette demande, jusqu'à sa clôture.", review: "Engagement à garder le fichier partagé accessible et inchangé" },
  it: { declaration: "Mi impegno a mantenere accessibile il file del link pubblico e a non modificarlo, sostituirlo né rimuoverlo dopo l'invio della richiesta e fino alla chiusura del protocollo.", review: "Impegno a mantenere il file condiviso accessibile e invariato" },
};
const cancellationAcknowledgementCopy: Record<FormLanguage, { declaration: string; review: string }> = {
  pt: { declaration: "Estou ciente de que, se a análise da biblioteca constatar que uma ou mais declarações acima não foram cumpridas, meu protocolo será cancelado.", review: "Ciência sobre o cancelamento por declaração não cumprida" },
  en: { declaration: "I understand that, if the library finds that one or more statements above were not fulfilled, my request will be canceled.", review: "Acknowledgment of cancellation for an unfulfilled statement" },
  es: { declaration: "Entiendo que, si la biblioteca comprueba que una o más declaraciones anteriores no se cumplieron, mi solicitud será cancelada.", review: "Conocimiento de la cancelación por declaración incumplida" },
  de: { declaration: "Mir ist bewusst, dass mein Antrag storniert wird, wenn die Bibliothek feststellt, dass eine oder mehrere der obigen Erklärungen nicht erfüllt sind.", review: "Kenntnisnahme der Stornierung bei nicht erfüllter Erklärung" },
  fr: { declaration: "Je comprends que ma demande sera annulée si la bibliothèque constate qu'une ou plusieurs déclarations ci-dessus ne sont pas respectées.", review: "Prise de connaissance de l'annulation en cas de déclaration non respectée" },
  it: { declaration: "Sono consapevole che la mia richiesta sarà annullata se la biblioteca accerta che una o più dichiarazioni precedenti non sono state rispettate.", review: "Presa d'atto dell'annullamento per dichiarazione non rispettata" },
};
type Copy = typeof uiCopy.pt;
const subtitleCapitalizationCopy: Record<FormLanguage, { guidance: string; warning: string }> = {
  pt: { guidance: "Após os dois-pontos, comece o subtítulo com minúscula, salvo nome próprio, sigla ou outra grafia que exija maiúscula. Ex.: Habitação social: um estudo em Salvador.", warning: "O subtítulo começa com maiúscula. Confira se é nome próprio, sigla ou se essa grafia aparece no trabalho. Se estiver correto, mantenha como está." },
  en: { guidance: "After the colon, start the subtitle with a lowercase letter unless a proper name, acronym, or the work's spelling requires a capital letter.", warning: "The subtitle starts with a capital letter. Check the spelling in the work; keep it if intentional." },
  es: { guidance: "Después de los dos puntos, empiece el subtítulo con minúscula, salvo nombres propios, siglas u otra grafía necesaria.", warning: "El subtítulo empieza con mayúscula. Compruebe la grafía en el trabajo y manténgala si es intencional." },
  de: { guidance: "Prüfen Sie die Groß- und Kleinschreibung nach dem Doppelpunkt. Eigennamen, Substantive und andere sprachliche Regeln können einen Großbuchstaben erfordern.", warning: "Der Untertitel beginnt mit einem Großbuchstaben. Das kann im Deutschen korrekt sein, etwa bei einem Substantiv. Prüfen Sie die Schreibweise in der Arbeit und behalten Sie sie bei, wenn sie stimmt." },
  fr: { guidance: "Après les deux-points, commencez le sous-titre par une minuscule, sauf si un nom propre ou la graphie du travail exige une majuscule.", warning: "Le sous-titre commence par une majuscule. Vérifiez la graphie dans le travail et conservez-la si elle est voulue." },
  it: { guidance: "Dopo i due punti, inizia il sottotitolo con una minuscola, salvo nomi propri o grafie che richiedono la maiuscola.", warning: "Il sottotitolo inizia con una maiuscola. Controlla la grafia nel lavoro e mantienila se è voluta." },
};
const germanSubtitleCopy: Record<FormLanguage, { guidance: string; warning: string }> = {
  pt: { guidance: "Em alemão, confira a grafia após os dois-pontos: substantivos e nomes próprios podem exigir inicial maiúscula. Reproduza o subtítulo como aparece no trabalho.", warning: "O subtítulo começa com maiúscula, o que pode estar correto em alemão. Confira a grafia no trabalho antes de enviar." },
  en: { guidance: "In German, nouns and proper names may require a capital letter after the colon. Follow the spelling in the work.", warning: "A capital letter may be correct in a German subtitle. Check the spelling in the work before submitting." },
  es: { guidance: "En alemán, los sustantivos y nombres propios pueden llevar mayúscula después de los dos puntos. Respete la grafía del trabajo.", warning: "La mayúscula puede ser correcta en alemán. Compruebe la grafía en el trabajo antes del envío." },
  de: subtitleCapitalizationCopy.de,
  fr: { guidance: "En allemand, les noms communs et propres peuvent prendre une majuscule après les deux-points. Respectez la graphie du travail.", warning: "La majuscule peut être correcte en allemand. Vérifiez la graphie dans le travail avant l’envoi." },
  it: { guidance: "In tedesco, i sostantivi e i nomi propri possono richiedere la maiuscola dopo i due punti. Rispetta la grafia del lavoro.", warning: "La maiuscola può essere corretta in tedesco. Controlla la grafia nel lavoro prima dell’invio." },
};
const startsWithCapital = (value: string) => /^\p{Lu}/u.test(value.trim());
const comparableName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
function matchingRequesterAuthorIndex(requesterName: string, authors: string[]) {
  const expected = comparableName(requesterName);
  if (!expected) return null;
  const matches = authors.flatMap((author, index) => comparableName(author) === expected ? [index] : []);
  return matches.length === 1 ? matches[0] : null;
}
const uiCopy = {
  pt: { steps: ["Vínculo acadêmico", "Descrição do trabalho", "Palavras-chave", "Arquivo e declarações", "Revisão"], intro: "Todas as informações devem corresponder exatamente ao que está escrito no próprio trabalho.", select: "Selecione", program: "Curso ou programa", registration: "Matrícula atual", enrollmentNote: "A matrícula ficará associada a este vínculo. Em um futuro grau acadêmico, você poderá cadastrar outra.", people: "Autoria e pessoas relacionadas", author: "Autor", authorOrder: "na ordem das pessoas relacionadas", directName: "Escreva o nome na forma direta:", notInverted: "e não na forma invertida:", birthYear: "Ano de nascimento do autor", birthYearAck: "Autorizo o uso do ano de nascimento informado no meu cadastro na ficha, após validação pela biblioteca, para diferenciar pessoas com o mesmo nome.", optional: "Opcional", birthYearNote: "A autorização é opcional. A data completa permanece na sua conta; somente o ano poderá aparecer na ficha depois da conferência no Pergamum por um bibliotecário.", titleAndLanguage: "Título e idioma", titleOriginal: "Título no idioma original", titleInstruction: "Informe o título e o subtítulo exatamente como aparecem no trabalho e no idioma original selecionado.", titleOnly: "Informe somente o título. Use o campo próprio abaixo quando houver subtítulo.", subtitle: "Subtítulo no idioma original", titleEquivalents: "Títulos equivalentes", titleForeignRequired: "Como o trabalho é originalmente em {language}, informe obrigatoriamente o título equivalente em português.", titleForeignAtLeast: "Informe ao menos um título equivalente em idioma estrangeiro.", originalLanguage: "Idioma original do trabalho", originalLanguageNotice: "Confira também as palavras-chave: o formulário pedirá cada termo em português e seu equivalente em {language}.", advising: "Orientação e banca", advisor: "Orientador", coadvisor: "Coorientador", relatedAtTitlePage: "entre as pessoas relacionadas na folha de rosto", coadvisorWhen: "quando houver", committee: "Membros da banca", committeeNote: "Na banca, o orientador é obrigatoriamente o 1º membro e, quando houver, o coorientador é o 2º. Arraste apenas os demais membros para ajustar a ordem.", committeeMember: "membro adicional da banca", committeeOrder: "na ordem das pessoas relacionadas", catalogingData: "Dados para a ficha catalográfica", specialCases: "Casos especiais, quando aplicáveis", cotutelle: "Cotutela", cotutelleHelp: "Regime de orientação compartilhada entre instituições, conforme indicado no trabalho.", doubleDegree: "Dupla titulação", doubleDegreeHelp: "Trabalho vinculado à obtenção de dois títulos, conforme indicado no trabalho.", depositYear: "Ano de depósito da versão final", defenseYear: "Ano de defesa ou apresentação", volumeCount: "Quantidade de volumes", pageCount: "Quantidade total de páginas", illustrations: "O trabalho possui ilustrações?", yes: "Sim", no: "Não", keywords: "Palavras-chave", keywordsNotice: "O trabalho está marcado como originalmente em {language}. Preencha cada palavra-chave em português e seu termo equivalente em {language}.", keywordPortuguese: "Palavra-chave em português", keywordEnglish: "Keyword em inglês", keywordOther: "Palavra-chave em {language}", term: "Termo {number}", termPortuguese: "Termo {number} em português", termEquivalent: "Termo {number} equivalente", oneTerm: "Um único termo. Deve corresponder à palavra-chave ao lado.", equivalentToLeft: "Escreva somente um termo, equivalente ao da esquerda.", addPair: "+ Adicionar par de palavras-chave", removePair: "Remover par", publicLink: "Link público do trabalho completo", linkNote: "São aceitos links do Google Drive, OneDrive e serviços similares.", guide: "Veja o passo a passo para criar um link público em cada serviço ↗", noPdf: "O Pronto! não armazena o PDF.", declarations: ["Declaro que o trabalho foi defendido e aprovado por banca.", "Confirmo que este é o arquivo completo e finalizado.", "Confirmo que o arquivo contém ata, página ou folha de aprovação datada, com assinatura manuscrita ou eletrônica de todos os membros da banca."], libraryNote: "Observação para a biblioteca", back: "Voltar", draftSaved: "Rascunho salvo", saving: "Salvamento automático", thisDevice: "Na sua conta", resumeLater: "Você pode continuar mais tarde em outro dispositivo com sua conta.", next: "Próximo", send: "Enviar solicitação", sending: "Enviando…", review: "Revise seus dados", reviewIntro: "Confira cada item. Se algo estiver pendente ou incorreto, selecione-o para ir direto ao campo correspondente.", attention: "item(ns) de atenção antes do envio.", allValid: "Todos os campos obrigatórios estão preenchidos. Confira os dados e envie sua solicitação.", checked: "Conferido", pending: "Pendente", reviewOptional: "Revisar", titleComplete: "Título completo", unknown: "Não informado", fillPending: "Preencha os itens pendentes para habilitar o envio.", languageModalTitle: "Trabalho originalmente em {language}", modalIntro: "Ao continuar, o formulário vai exigir:", modalEquivalentTitle: "um título equivalente em português;", modalKeywords: "três palavras-chave em português e seus termos equivalentes em {language}.", modalFooter: "Confira essas informações no trabalho antes do envio.", stayLanguage: "Manter {language}", understand: "Entendi e continuar", nameDirectExample: "Autores — como aparecem na folha de rosto", raueOrder: "Informe os autores na mesma ordem em que aparecem na página ou folha de rosto. Arraste somente entre autores para definir a ordem. O 1º autor é a entrada principal da ficha.", authorNumber: "{number}º autor", addAuthor: "+ Adicionar autor", addCommitteeMember: "+ Adicionar membro da banca", addEquivalentTitle: "+ Adicionar título equivalente", remove: "Remover", keywordNumber: "{number}ª palavra-chave em {language}", programName: "Curso ou programa", advisorName: "Orientador", coadvisorName: "Coorientador", titleEquivalentRequired: "Título equivalente obrigatório", keywordEquivalentNumber: "Termo equivalente {number} em {language}", advisorReview: "Orientador", coadvisorReview: "Coorientador", birthReview: "Ano de nascimento do autor", birthAckReview: "Autorização do ano na ficha", committeeReview: "Membro adicional da banca {number}", publicHttps: "Link público HTTPS", declarationReview: ["Declaração de aprovação pela banca", "Confirmação do arquivo final", "Folha de aprovação no arquivo"], pageOrVolumeReview: "Quantidade de páginas ou volumes", illustrationsReview: "Presença de ilustrações", otherLanguage: "idioma estrangeiro" },
  en: { steps: ["Academic affiliation", "Work description", "Keywords", "File and declarations", "Review"], intro: "All information must exactly match what appears in the work itself.", select: "Select", program: "Academic program", registration: "Current student ID", enrollmentNote: "Your student ID will be linked to this program. You can register another one for a future degree.", people: "Author and related people", author: "Author", authorOrder: "in the related-people order", directName: "Write the name in natural order:", notInverted: "not inverted:", birthYear: "Author's year of birth", birthYearAck: "I authorize use of the birth year from my account in the catalog record, after library validation, to distinguish people with the same name.", optional: "Optional", birthYearNote: "Authorization is optional. Your full birth date stays in your account; only the year may appear after checking it in Pergamum.", titleAndLanguage: "Title and language", titleOriginal: "Title in the original language", titleInstruction: "Enter the title and subtitle exactly as they appear in the work and in the selected original language.", titleOnly: "Enter the title only. Use the field below for a subtitle, if there is one.", subtitle: "Subtitle in the original language", titleEquivalents: "Equivalent titles", titleForeignRequired: "Because the work was originally written in {language}, a Portuguese equivalent title is required.", titleForeignAtLeast: "Enter at least one equivalent title in another language.", originalLanguage: "Original language of the work", originalLanguageNotice: "Check the keywords too: the form requires each term in Portuguese and its equivalent in {language}.", advising: "Advisors and committee", advisor: "Advisor", coadvisor: "Co-advisor", relatedAtTitlePage: "among the related people on the title page", coadvisorWhen: "if applicable", committee: "Committee members", committeeNote: "For the committee, the advisor is always the 1st member and, if applicable, the co-advisor is 2nd. Drag only the other members to change their order.", committeeMember: "additional committee member", committeeOrder: "in the related-people order", catalogingData: "Catalog record details", specialCases: "Special cases, if applicable", cotutelle: "Joint supervision", cotutelleHelp: "Shared supervision between institutions, as indicated in the work.", doubleDegree: "Double degree", doubleDegreeHelp: "Work linked to earning two degrees, as indicated in the work.", depositYear: "Year of final deposit", defenseYear: "Year of defense or presentation", volumeCount: "Number of volumes", pageCount: "Total number of pages", illustrations: "Does the work contain illustrations?", yes: "Yes", no: "No", keywords: "Keywords", keywordsNotice: "The work is marked as originally written in {language}. Enter each keyword in Portuguese and its equivalent in {language}.", keywordPortuguese: "Keyword in Portuguese", keywordEnglish: "Keyword in English", keywordOther: "Keyword in {language}", term: "Term {number}", termPortuguese: "Term {number} in Portuguese", termEquivalent: "Equivalent term {number}", oneTerm: "Enter one term only. It should match the keyword beside it.", equivalentToLeft: "Enter one term only, equivalent to the one on the left.", addPair: "+ Add keyword pair", removePair: "Remove pair", publicLink: "Public link to the complete work", linkNote: "Google Drive, OneDrive, and similar services are accepted.", guide: "View step-by-step instructions for each service ↗", noPdf: "Pronto! does not store the PDF.", declarations: ["I declare that the work was defended and approved by a committee.", "I confirm this is the complete and final file.", "I confirm the file contains a dated approval record, page, or sheet with the handwritten or electronic signatures of every committee member."], libraryNote: "Note for the library", back: "Back", draftSaved: "Draft saved", saving: "Auto-save", thisDevice: "In your account", resumeLater: "You can continue later on another device with your account.", next: "Next", send: "Submit request", sending: "Submitting…", review: "Review your information", reviewIntro: "Check each item. Select any incomplete or incorrect item to go directly to its field.", attention: "item(s) need attention before submission.", allValid: "All required fields are complete. Review the information and submit your request.", checked: "Checked", pending: "Pending", reviewOptional: "Review", titleComplete: "Full title", unknown: "Not provided", fillPending: "Complete the pending items to enable submission.", languageModalTitle: "Work originally written in {language}", modalIntro: "By continuing, the form will require:", modalEquivalentTitle: "an equivalent title in Portuguese;", modalKeywords: "three keywords in Portuguese and their equivalents in {language}.", modalFooter: "Check this information against the work before submitting.", stayLanguage: "Keep {language}", understand: "I understand and continue", nameDirectExample: "Authors — as shown on the title page", raueOrder: "List the authors in the same order as on the title page. For RAU+E, drag only authors to change their order. The 1st author is the main entry in the catalog record. Write each name in natural order, e.g.", authorNumber: "Author {number}", addAuthor: "+ Add author", addCommitteeMember: "+ Add committee member", addEquivalentTitle: "+ Add equivalent title", remove: "Remove", keywordNumber: "Keyword {number} in {language}", programName: "Academic program", advisorName: "Advisor", coadvisorName: "Co-advisor", titleEquivalentRequired: "Required equivalent title", keywordEquivalentNumber: "Equivalent term {number} in {language}", advisorReview: "Advisor", coadvisorReview: "Co-advisor", birthReview: "Author's year of birth", birthAckReview: "Acknowledgment about year in catalog", committeeReview: "Additional committee member {number}", publicHttps: "Public HTTPS link", declarationReview: ["Committee approval declaration", "Final file confirmation", "Approval page in the file"], pageOrVolumeReview: "Number of pages or volumes", illustrationsReview: "Illustrations", otherLanguage: "another language" },
  es: { steps: ["Vínculo académico", "Descripción del trabajo", "Palabras clave", "Archivo y declaraciones", "Revisión"], intro: "Toda la información debe coincidir exactamente con lo que aparece en el trabajo.", select: "Seleccione", program: "Programa académico", registration: "Matrícula actual", enrollmentNote: "La matrícula quedará vinculada a este programa. Podrá registrar otra para un grado futuro.", people: "Autoría y personas relacionadas", author: "Autor", authorOrder: "en el orden de las personas relacionadas", directName: "Escriba el nombre en orden directo:", notInverted: "no invertido:", birthYear: "Año de nacimiento del autor", birthYearAck: "Autorizo el uso del año de nacimiento de mi cuenta en la ficha, tras la validación de la biblioteca, para distinguir homónimos.", optional: "Opcional", birthYearNote: "La autorización es opcional. La fecha completa permanece en su cuenta; solo el año podrá aparecer en la ficha tras la comprobación en Pergamum.", titleAndLanguage: "Título e idioma", titleOriginal: "Título en el idioma original", titleInstruction: "Escriba el título y el subtítulo exactamente como aparecen en el trabajo y en el idioma original seleccionado.", titleOnly: "Indique solo el título. Use el campo siguiente para el subtítulo, si lo hay.", subtitle: "Subtítulo en el idioma original", titleEquivalents: "Títulos equivalentes", titleForeignRequired: "Como el trabajo fue escrito originalmente en {language}, es obligatorio indicar el título equivalente en portugués.", titleForeignAtLeast: "Indique al menos un título equivalente en otro idioma.", originalLanguage: "Idioma original del trabajo", originalLanguageNotice: "Revise también las palabras clave: el formulario solicita cada término en portugués y su equivalente en {language}.", advising: "Orientación y tribunal", advisor: "Director", coadvisor: "Codirector", relatedAtTitlePage: "entre las personas relacionadas en la portada", coadvisorWhen: "si corresponde", committee: "Miembros del tribunal", committeeNote: "En el tribunal, el director es siempre el 1.º miembro y, si corresponde, el codirector es el 2.º. Arrastre solo a los demás miembros para cambiar el orden.", committeeMember: "miembro adicional del tribunal", committeeOrder: "en el orden de las personas relacionadas", catalogingData: "Datos para el registro bibliográfico", specialCases: "Casos especiales, si corresponde", cotutelle: "Cotutela", cotutelleHelp: "Régimen de dirección compartida entre instituciones, según lo indicado en el trabajo.", doubleDegree: "Doble titulación", doubleDegreeHelp: "Trabajo vinculado a la obtención de dos títulos, según lo indicado en el trabajo.", depositYear: "Año del depósito de la versión final", defenseYear: "Año de defensa o presentación", volumeCount: "Cantidad de volúmenes", pageCount: "Cantidad total de páginas", illustrations: "¿El trabajo contiene ilustraciones?", yes: "Sí", no: "No", keywords: "Palabras clave", keywordsNotice: "El trabajo está marcado como originalmente escrito en {language}. Indique cada palabra clave en portugués y su equivalente en {language}.", keywordPortuguese: "Palabra clave en portugués", keywordEnglish: "Keyword en inglés", keywordOther: "Palabra clave en {language}", term: "Término {number}", termPortuguese: "Término {number} en portugués", termEquivalent: "Término equivalente {number}", oneTerm: "Escriba un solo término. Debe corresponder a la palabra clave de al lado.", equivalentToLeft: "Escriba un solo término equivalente al de la izquierda.", addPair: "+ Añadir par de palabras clave", removePair: "Eliminar par", publicLink: "Enlace público al trabajo completo", linkNote: "Se aceptan enlaces de Google Drive, OneDrive y servicios similares.", guide: "Ver instrucciones paso a paso para cada servicio ↗", noPdf: "Pronto! no almacena el PDF.", declarations: ["Declaro que el trabajo fue defendido y aprobado por un tribunal.", "Confirmo que este es el archivo completo y definitivo.", "Confirmo que el archivo contiene un acta, página u hoja de aprobación fechada, con la firma manuscrita o electrónica de todos los miembros del tribunal."], libraryNote: "Observación para la biblioteca", back: "Volver", draftSaved: "Borrador guardado", saving: "Guardado automático", thisDevice: "En su cuenta", resumeLater: "Puede continuar más tarde en otro dispositivo con su cuenta.", next: "Siguiente", send: "Enviar solicitud", sending: "Enviando…", review: "Revise sus datos", reviewIntro: "Revise cada elemento. Seleccione cualquier elemento incompleto o incorrecto para ir directamente al campo.", attention: "elemento(s) requieren atención antes del envío.", allValid: "Todos los campos obligatorios están completos. Revise los datos y envíe su solicitud.", checked: "Verificado", pending: "Pendiente", reviewOptional: "Revisar", titleComplete: "Título completo", unknown: "No indicado", fillPending: "Complete los elementos pendientes para habilitar el envío.", languageModalTitle: "Trabajo originalmente en {language}", modalIntro: "Al continuar, el formulario requerirá:", modalEquivalentTitle: "un título equivalente en portugués;", modalKeywords: "tres palabras clave en portugués y sus equivalentes en {language}.", modalFooter: "Verifique estos datos en el trabajo antes de enviarlo.", stayLanguage: "Mantener {language}", understand: "Entiendo y continuar", nameDirectExample: "Autores — como aparecen en la portada", raueOrder: "Indique los autores en el mismo orden en que aparecen en la portada del trabajo. En RAU+E, arrastre solo los autores para cambiar su orden. El 1.º autor es la entrada principal del registro.", authorNumber: "Autor {number}", addAuthor: "+ Añadir autor", addCommitteeMember: "+ Añadir miembro del tribunal", addEquivalentTitle: "+ Añadir título equivalente", remove: "Eliminar", keywordNumber: "Palabra clave {number} en {language}", programName: "Programa académico", advisorName: "Director", coadvisorName: "Codirector", titleEquivalentRequired: "Título equivalente obligatorio", keywordEquivalentNumber: "Término equivalente {number} en {language}", advisorReview: "Director", coadvisorReview: "Codirector", birthReview: "Año de nacimiento del autor", birthAckReview: "Conocimiento del uso del año en la ficha", committeeReview: "Miembro adicional del tribunal {number}", publicHttps: "Enlace público HTTPS", declarationReview: ["Declaración de aprobación del tribunal", "Confirmación del archivo final", "Hoja de aprobación en el archivo"], pageOrVolumeReview: "Cantidad de páginas o volúmenes", illustrationsReview: "Ilustraciones", otherLanguage: "otro idioma" },
  de: { steps: ["Studienzugehörigkeit", "Beschreibung der Arbeit", "Schlagwörter", "Datei und Erklärungen", "Überprüfung"], intro: "Alle Angaben müssen genau mit der Arbeit übereinstimmen.", select: "Auswählen", program: "Studiengang", registration: "Aktuelle Matrikelnummer", enrollmentNote: "Die Matrikelnummer wird diesem Studiengang zugeordnet. Für einen zukünftigen Abschluss können Sie eine weitere angeben.", people: "Verfasser und beteiligte Personen", author: "Verfasser", authorOrder: "in der Reihenfolge der beteiligten Personen", directName: "Geben Sie den Namen in normaler Reihenfolge ein:", notInverted: "nicht umgekehrt:", birthYear: "Geburtsjahr des Verfassers", birthYearAck: "Ich erlaube die Nutzung meines im Konto gespeicherten Geburtsjahres im Katalogeintrag nach Prüfung durch die Bibliothek, um Namensgleiche zu unterscheiden.", optional: "Optional", birthYearNote: "Die Zustimmung ist freiwillig. Das vollständige Geburtsdatum bleibt im Konto; nur das Jahr kann nach Prüfung in Pergamum in der Karte erscheinen.", titleAndLanguage: "Titel und Sprache", titleOriginal: "Titel in der Originalsprache", titleInstruction: "Geben Sie Titel und Untertitel genau wie in der Arbeit und in der ausgewählten Originalsprache an.", titleOnly: "Geben Sie nur den Titel an. Verwenden Sie das folgende Feld für einen Untertitel, falls vorhanden.", subtitle: "Untertitel in der Originalsprache", titleEquivalents: "Entsprechende Titel", titleForeignRequired: "Da die Arbeit ursprünglich auf {language} verfasst wurde, ist ein entsprechender portugiesischer Titel erforderlich.", titleForeignAtLeast: "Geben Sie mindestens einen entsprechenden Titel in einer anderen Sprache an.", originalLanguage: "Originalsprache der Arbeit", originalLanguageNotice: "Beachten Sie auch die Schlagwörter: Jedes wird auf Portugiesisch und mit einer Entsprechung auf {language} benötigt.", advising: "Betreuung und Prüfungskommission", advisor: "Betreuer", coadvisor: "Mitbetreuer", relatedAtTitlePage: "unter den beteiligten Personen auf dem Titelblatt", coadvisorWhen: "falls vorhanden", committee: "Mitglieder der Prüfungskommission", committeeNote: "In der Prüfungskommission ist der Betreuer immer das 1. Mitglied und, falls vorhanden, der Mitbetreuer das 2. Mitglied. Nur die übrigen Mitglieder können verschoben werden.", committeeMember: "zusätzliches Mitglied der Prüfungskommission", committeeOrder: "in der Reihenfolge der beteiligten Personen", catalogingData: "Angaben für den Katalogdatensatz", specialCases: "Sonderfälle, falls zutreffend", cotutelle: "Gemeinsame Betreuung", cotutelleHelp: "Gemeinsame Betreuung durch mehrere Institutionen, wie in der Arbeit angegeben.", doubleDegree: "Doppelabschluss", doubleDegreeHelp: "Arbeit zum Erwerb zweier Abschlüsse, wie in der Arbeit angegeben.", depositYear: "Jahr der endgültigen Abgabe", defenseYear: "Jahr der Verteidigung oder Präsentation", volumeCount: "Anzahl der Bände", pageCount: "Gesamtseitenzahl", illustrations: "Enthält die Arbeit Abbildungen?", yes: "Ja", no: "Nein", keywords: "Schlagwörter", keywordsNotice: "Die Arbeit ist als ursprünglich auf {language} verfasst gekennzeichnet. Geben Sie jedes Schlagwort auf Portugiesisch und die Entsprechung auf {language} an.", keywordPortuguese: "Schlagwort auf Portugiesisch", keywordEnglish: "Keyword auf Englisch", keywordOther: "Schlagwort auf {language}", term: "Begriff {number}", termPortuguese: "Begriff {number} auf Portugiesisch", termEquivalent: "Entsprechender Begriff {number}", oneTerm: "Geben Sie nur einen Begriff ein. Er muss dem Schlagwort daneben entsprechen.", equivalentToLeft: "Geben Sie nur einen Begriff ein, der dem linken entspricht.", addPair: "+ Schlagwortpaar hinzufügen", removePair: "Paar entfernen", publicLink: "Öffentlicher Link zur vollständigen Arbeit", linkNote: "Links von Google Drive, OneDrive und ähnlichen Diensten werden akzeptiert.", guide: "Schritt-für-Schritt-Anleitung für jeden Dienst ↗", noPdf: "Pronto! speichert die PDF-Datei nicht.", declarations: ["Ich erkläre, dass die Arbeit verteidigt und von einer Kommission genehmigt wurde.", "Ich bestätige, dass dies die vollständige und endgültige Datei ist.", "Ich bestätige, dass die Datei ein datiertes Protokoll oder eine Genehmigungsseite mit handschriftlicher oder elektronischer Unterschrift aller Kommissionsmitglieder enthält."], libraryNote: "Hinweis für die Bibliothek", back: "Zurück", draftSaved: "Entwurf gespeichert", saving: "Automatisches Speichern", thisDevice: "In Ihrem Konto", resumeLater: "Sie können später auf einem anderen Gerät mit Ihrem Konto fortfahren.", next: "Weiter", send: "Antrag senden", sending: "Wird gesendet…", review: "Angaben überprüfen", reviewIntro: "Prüfen Sie jeden Punkt. Wählen Sie einen fehlenden oder falschen Punkt aus, um direkt zum Feld zu gelangen.", attention: "Punkt(e) vor dem Absenden prüfen.", allValid: "Alle Pflichtfelder sind ausgefüllt. Prüfen Sie die Angaben und senden Sie den Antrag.", checked: "Geprüft", pending: "Offen", reviewOptional: "Prüfen", titleComplete: "Vollständiger Titel", unknown: "Nicht angegeben", fillPending: "Vervollständigen Sie die offenen Punkte, um das Absenden zu ermöglichen.", languageModalTitle: "Arbeit ursprünglich auf {language}", modalIntro: "Beim Fortfahren benötigt das Formular:", modalEquivalentTitle: "einen entsprechenden Titel auf Portugiesisch;", modalKeywords: "drei Schlagwörter auf Portugiesisch und ihre Entsprechungen auf {language}.", modalFooter: "Prüfen Sie diese Angaben vor dem Absenden in der Arbeit.", stayLanguage: "{language} beibehalten", understand: "Verstanden, fortfahren", nameDirectExample: "Verfasser — wie auf dem Titelblatt", raueOrder: "Geben Sie die Verfasser in derselben Reihenfolge wie auf dem Titelblatt der Arbeit an. Bei RAU+E können nur die Verfasser neu geordnet werden. Der 1. Verfasser ist der Haupteintrag des Datensatzes. Geben Sie jeden Namen in normaler Reihenfolge ein, z. B.", authorNumber: "Verfasser {number}", addAuthor: "+ Verfasser hinzufügen", remove: "Entfernen", keywordNumber: "Schlagwort {number} auf {language}", programName: "Studiengang", advisorName: "Betreuer", coadvisorName: "Mitbetreuer", titleEquivalentRequired: "Erforderlicher entsprechender Titel", keywordEquivalentNumber: "Entsprechender Begriff {number} auf {language}", advisorReview: "Betreuer", coadvisorReview: "Mitbetreuer", birthReview: "Geburtsjahr des Verfassers", birthAckReview: "Bestätigung zur Verwendung des Jahres im Datensatz", committeeReview: "Zusätzliches Kommissionsmitglied {number}", publicHttps: "Öffentlicher HTTPS-Link", declarationReview: ["Erklärung zur Genehmigung durch die Kommission", "Bestätigung der endgültigen Datei", "Genehmigungsblatt in der Datei"], pageOrVolumeReview: "Seiten- oder Bandanzahl", illustrationsReview: "Abbildungen", otherLanguage: "andere Sprache" , addCommitteeMember: "Weiteres Prüfungsmitglied hinzufügen", addEquivalentTitle: "Weiteren gleichwertigen Titel hinzufügen"},
  fr: { steps: ["Parcours académique", "Description du travail", "Mots-clés", "Fichier et déclarations", "Vérification"], intro: "Toutes les informations doivent correspondre exactement au contenu du travail.", select: "Sélectionner", program: "Programme académique", registration: "Numéro d'étudiant actuel", enrollmentNote: "Votre numéro d'étudiant sera associé à ce programme. Vous pourrez en enregistrer un autre pour un futur diplôme.", people: "Auteur et personnes associées", author: "Auteur", authorOrder: "dans l'ordre des personnes associées", directName: "Saisissez le nom dans l'ordre direct :", notInverted: "et non inversé :", birthYear: "Année de naissance de l'auteur", birthYearAck: "J'autorise l'utilisation de mon année de naissance enregistrée dans mon compte, après validation par la bibliothèque, pour distinguer les homonymes.", optional: "Facultatif", birthYearNote: "L'autorisation est facultative. La date complète reste dans votre compte ; seule l'année pourra figurer sur la fiche après vérification dans Pergamum.", titleAndLanguage: "Titre et langue", titleOriginal: "Titre dans la langue originale", titleInstruction: "Saisissez le titre et le sous-titre exactement comme ils apparaissent dans le travail et dans la langue originale sélectionnée.", titleOnly: "Saisissez uniquement le titre. Utilisez le champ suivant pour le sous-titre, le cas échéant.", subtitle: "Sous-titre dans la langue originale", titleEquivalents: "Titres équivalents", titleForeignRequired: "Le travail ayant été rédigé à l'origine en {language}, un titre équivalent en portugais est obligatoire.", titleForeignAtLeast: "Saisissez au moins un titre équivalent dans une autre langue.", originalLanguage: "Langue originale du travail", originalLanguageNotice: "Vérifiez aussi les mots-clés : chaque terme doit être saisi en portugais et avec son équivalent en {language}.", advising: "Encadrement et jury", advisor: "Directeur", coadvisor: "Codirecteur", relatedAtTitlePage: "parmi les personnes associées sur la page de titre", coadvisorWhen: "le cas échéant", committee: "Membres du jury", committeeNote: "Dans le jury, le directeur est toujours le 1er membre et, le cas échéant, le codirecteur est le 2e. Faites glisser uniquement les autres membres pour modifier l'ordre.", committeeMember: "membre supplémentaire du jury", committeeOrder: "dans l'ordre des personnes associées", catalogingData: "Données pour la notice bibliographique", specialCases: "Cas particuliers, le cas échéant", cotutelle: "Cotutelle", cotutelleHelp: "Encadrement partagé entre institutions, comme indiqué dans le travail.", doubleDegree: "Double diplôme", doubleDegreeHelp: "Travail lié à l'obtention de deux diplômes, comme indiqué dans le travail.", depositYear: "Année du dépôt de la version finale", defenseYear: "Année de soutenance ou de présentation", volumeCount: "Nombre de volumes", pageCount: "Nombre total de pages", illustrations: "Le travail contient-il des illustrations ?", yes: "Oui", no: "Non", keywords: "Mots-clés", keywordsNotice: "Le travail est indiqué comme ayant été rédigé en {language}. Saisissez chaque mot-clé en portugais et son équivalent en {language}.", keywordPortuguese: "Mot-clé en portugais", keywordEnglish: "Keyword en anglais", keywordOther: "Mot-clé en {language}", term: "Terme {number}", termPortuguese: "Terme {number} en portugais", termEquivalent: "Terme équivalent {number}", oneTerm: "Saisissez un seul terme, correspondant au mot-clé voisin.", equivalentToLeft: "Saisissez un seul terme équivalent à celui de gauche.", addPair: "+ Ajouter une paire de mots-clés", removePair: "Supprimer la paire", publicLink: "Lien public vers le travail complet", linkNote: "Les liens Google Drive, OneDrive et services similaires sont acceptés.", guide: "Voir les étapes pour chaque service ↗", noPdf: "Pronto! ne stocke pas le PDF.", declarations: ["Je déclare que le travail a été soutenu et approuvé par un jury.", "Je confirme qu'il s'agit du fichier complet et définitif.", "Je confirme que le fichier contient un procès-verbal, une page ou une feuille d'approbation datée, avec la signature manuscrite ou électronique de tous les membres du jury."], libraryNote: "Remarque pour la bibliothèque", back: "Retour", draftSaved: "Brouillon enregistré", saving: "Enregistrement automatique", thisDevice: "Dans votre compte", resumeLater: "Vous pouvez reprendre plus tard sur un autre appareil avec votre compte.", next: "Suivant", send: "Envoyer la demande", sending: "Envoi…", review: "Vérifiez vos informations", reviewIntro: "Vérifiez chaque élément. Sélectionnez tout élément manquant ou incorrect pour accéder directement à son champ.", attention: "élément(s) à vérifier avant l'envoi.", allValid: "Tous les champs obligatoires sont remplis. Vérifiez les informations et envoyez votre demande.", checked: "Vérifié", pending: "À compléter", reviewOptional: "Vérifier", titleComplete: "Titre complet", unknown: "Non indiqué", fillPending: "Complétez les éléments manquants pour activer l'envoi.", languageModalTitle: "Travail rédigé à l'origine en {language}", modalIntro: "En continuant, le formulaire exigera :", modalEquivalentTitle: "un titre équivalent en portugais ;", modalKeywords: "trois mots-clés en portugais et leurs équivalents en {language}.", modalFooter: "Vérifiez ces informations dans le travail avant l'envoi.", stayLanguage: "Garder {language}", understand: "J'ai compris, continuer", nameDirectExample: "Auteurs — comme sur la page de titre", raueOrder: "Indiquez les auteurs dans le même ordre que sur la page de titre du travail. Pour RAU+E, faites glisser uniquement les auteurs pour changer leur ordre. Le 1er auteur est l'entrée principale de la notice.", authorNumber: "Auteur {number}", addAuthor: "+ Ajouter un auteur", remove: "Supprimer", keywordNumber: "Mot-clé {number} en {language}", programName: "Programme académique", advisorName: "Directeur", coadvisorName: "Codirecteur", titleEquivalentRequired: "Titre équivalent obligatoire", keywordEquivalentNumber: "Terme équivalent {number} en {language}", advisorReview: "Directeur", coadvisorReview: "Codirecteur", birthReview: "Année de naissance de l'auteur", birthAckReview: "Accord sur l'année dans la notice", committeeReview: "Membre supplémentaire du jury {number}", publicHttps: "Lien public HTTPS", declarationReview: ["Déclaration d'approbation du jury", "Confirmation du fichier définitif", "Page d'approbation dans le fichier"], pageOrVolumeReview: "Nombre de pages ou de volumes", illustrationsReview: "Illustrations", otherLanguage: "une autre langue" , addCommitteeMember: "Ajouter un autre membre du jury", addEquivalentTitle: "Ajouter un autre titre équivalent"},
  it: { steps: ["Percorso accademico", "Descrizione del lavoro", "Parole chiave", "File e dichiarazioni", "Revisione"], intro: "Tutte le informazioni devono corrispondere esattamente a quanto riportato nel lavoro.", select: "Seleziona", program: "Corso o programma", registration: "Matricola attuale", enrollmentNote: "La matricola sarà associata a questo programma. Potrai registrarne un'altra per un futuro titolo.", people: "Autore e persone correlate", author: "Autore", authorOrder: "nell'ordine delle persone correlate", directName: "Scrivi il nome nell'ordine diretto:", notInverted: "e non invertito:", birthYear: "Anno di nascita dell'autore", birthYearAck: "Autorizzo l'uso dell'anno di nascita registrato nel mio account nella scheda, dopo la verifica della biblioteca, per distinguere gli omonimi.", optional: "Facoltativo", birthYearNote: "L'autorizzazione è facoltativa. La data completa resta nell'account; solo l'anno potrà comparire nella scheda dopo la verifica in Pergamum.", titleAndLanguage: "Titolo e lingua", titleOriginal: "Titolo nella lingua originale", titleInstruction: "Inserisci titolo e sottotitolo esattamente come compaiono nel lavoro e nella lingua originale selezionata.", titleOnly: "Inserisci solo il titolo. Usa il campo seguente per il sottotitolo, se presente.", subtitle: "Sottotitolo nella lingua originale", titleEquivalents: "Titoli equivalenti", titleForeignRequired: "Poiché il lavoro è stato scritto originariamente in {language}, è obbligatorio indicare il titolo equivalente in portoghese.", titleForeignAtLeast: "Inserisci almeno un titolo equivalente in un'altra lingua.", originalLanguage: "Lingua originale del lavoro", originalLanguageNotice: "Controlla anche le parole chiave: ogni termine deve essere inserito in portoghese e con il suo equivalente in {language}.", advising: "Relatori e commissione", advisor: "Relatore", coadvisor: "Correlatore", relatedAtTitlePage: "tra le persone correlate nel frontespizio", coadvisorWhen: "se presente", committee: "Membri della commissione", committeeNote: "Nella commissione, il relatore è sempre il 1º membro e, se presente, il correlatore è il 2º. Trascina solo gli altri membri per modificarne l'ordine.", committeeMember: "membro aggiuntivo della commissione", committeeOrder: "nell'ordine delle persone correlate", catalogingData: "Dati per la scheda catalografica", specialCases: "Casi speciali, se applicabili", cotutelle: "Cotutela", cotutelleHelp: "Regime di supervisione condivisa tra istituzioni, come indicato nel lavoro.", doubleDegree: "Doppio titolo", doubleDegreeHelp: "Lavoro collegato al conseguimento di due titoli, come indicato nel lavoro.", depositYear: "Anno di deposito della versione finale", defenseYear: "Anno di discussione o presentazione", volumeCount: "Numero di volumi", pageCount: "Numero totale di pagine", illustrations: "Il lavoro contiene illustrazioni?", yes: "Sì", no: "No", keywords: "Parole chiave", keywordsNotice: "Il lavoro è indicato come scritto originariamente in {language}. Inserisci ogni parola chiave in portoghese e il suo equivalente in {language}.", keywordPortuguese: "Parola chiave in portoghese", keywordEnglish: "Keyword in inglese", keywordOther: "Parola chiave in {language}", term: "Termine {number}", termPortuguese: "Termine {number} in portoghese", termEquivalent: "Termine equivalente {number}", oneTerm: "Inserisci un solo termine, corrispondente alla parola chiave accanto.", equivalentToLeft: "Inserisci un solo termine equivalente a quello a sinistra.", addPair: "+ Aggiungi coppia di parole chiave", removePair: "Rimuovi coppia", publicLink: "Link pubblico al lavoro completo", linkNote: "Sono accettati link di Google Drive, OneDrive e servizi simili.", guide: "Visualizza le istruzioni passo passo per ogni servizio ↗", noPdf: "Pronto! non archivia il PDF.", declarations: ["Dichiaro che il lavoro è stato discusso e approvato da una commissione.", "Confermo che questo è il file completo e definitivo.", "Confermo che il file contiene un verbale, una pagina o un foglio di approvazione datato, con la firma autografa o elettronica di tutti i membri della commissione."], libraryNote: "Nota per la biblioteca", back: "Indietro", draftSaved: "Bozza salvata", saving: "Salvataggio automatico", thisDevice: "Nel tuo account", resumeLater: "Puoi continuare più tardi su un altro dispositivo con il tuo account.", next: "Avanti", send: "Invia richiesta", sending: "Invio…", review: "Rivedi i tuoi dati", reviewIntro: "Controlla ogni voce. Seleziona una voce incompleta o errata per raggiungere direttamente il relativo campo.", attention: "voce/i da controllare prima dell'invio.", allValid: "Tutti i campi obbligatori sono compilati. Controlla i dati e invia la richiesta.", checked: "Verificato", pending: "Da completare", reviewOptional: "Controllare", titleComplete: "Titolo completo", unknown: "Non indicato", fillPending: "Completa le voci mancanti per abilitare l'invio.", languageModalTitle: "Lavoro scritto originariamente in {language}", modalIntro: "Continuando, il modulo richiederà:", modalEquivalentTitle: "un titolo equivalente in portoghese;", modalKeywords: "tre parole chiave in portoghese e i relativi equivalenti in {language}.", modalFooter: "Verifica queste informazioni nel lavoro prima dell'invio.", stayLanguage: "Mantieni {language}", understand: "Ho capito, continua", nameDirectExample: "Autori — come nel frontespizio", raueOrder: "Indica gli autori nello stesso ordine in cui compaiono sul frontespizio del lavoro. Per RAU+E, trascina solo gli autori per modificarne l'ordine. Il 1º autore è la voce principale della scheda.", authorNumber: "Autore {number}", addAuthor: "+ Aggiungi autore", remove: "Rimuovi", keywordNumber: "Parola chiave {number} in {language}", programName: "Corso o programma", advisorName: "Relatore", coadvisorName: "Correlatore", titleEquivalentRequired: "Titolo equivalente obbligatorio", keywordEquivalentNumber: "Termine equivalente {number} in {language}", advisorReview: "Relatore", coadvisorReview: "Correlatore", birthReview: "Anno di nascita dell'autore", birthAckReview: "Consapevolezza dell'uso dell'anno nella scheda", committeeReview: "Membro aggiuntivo della commissione {number}", publicHttps: "Link pubblico HTTPS", declarationReview: ["Dichiarazione di approvazione della commissione", "Conferma del file definitivo", "Foglio di approvazione nel file"], pageOrVolumeReview: "Numero di pagine o volumi", illustrationsReview: "Illustrazioni", otherLanguage: "un'altra lingua" , addCommitteeMember: "Aggiungi un altro membro della commissione", addEquivalentTitle: "Aggiungi un altro titolo equivalente"},
} satisfies Record<FormLanguage, Record<string, string | string[]>>;
const errorLabels: Record<string, string> = {
  registration_already_used: "Esta matrícula já tem um protocolo concluído. Para um novo curso ou grau, informe a nova matrícula.",
  active_request_already_exists: "Você já possui um protocolo ativo. Acompanhe-o pelo painel.",
  active_student_required: "Sua sessão não permite abrir uma solicitação. Entre novamente.",
  active_academic_program_required: "Selecione um curso ou programa ativo.",
  valid_registration_required: "Informe uma matrícula válida, com 3 a 30 caracteres.",
  valid_title_required: "Informe o título completo do trabalho.",
  public_https_url_required: "Informe um link público seguro, iniciado por https://.",
  required_declarations_missing: "Confirme as três declarações obrigatórias.",
  cancellation_acknowledgement_required: "Confirme que está ciente da regra de cancelamento do protocolo.",
  shared_file_unchanged_confirmation_required: "Confirme que não alterará nem substituirá o arquivo compartilhado até o encerramento do protocolo.",
  author_and_advisor_required: "Informe os nomes do autor e do orientador.",
  portuguese_keyword_required: "Informe pelo menos uma palavra-chave em português.",
  valid_cataloging_years_required: "Confira os anos de depósito e de defesa.",
  valid_physical_extent_required: "Informe a quantidade de páginas ou volumes.",
  illustrations_choice_required: "Informe se o trabalho possui ilustrações.",
  mp_cecre_volume_extent_required: "No MP-CECRE, informe 2 ou 3 volumes.",
  valid_orientation_labels_required: "Confira as designações de orientação e coorientação.",
  three_keywords_required: "Informe pelo menos três palavras-chave em português e três no idioma complementar.",
  tfg_author_limit_exceeded: "O TFG admite no máximo três autores.",
  representative_is_not_author: "A secretaria representa os autores e não deve ser informada como autora.",
  shared_authorship_not_allowed: "A autoria compartilhada é permitida na RAU+E e no TFG (até três autores).",
  valid_committee_members_required: "Confira os nomes dos membros da banca.",
  valid_birth_year_required: "Informe um ano de nascimento válido.",
  birth_year_acknowledgement_required: "Para informar o ano de nascimento, confirme sua ciência sobre o uso na ficha.",
  student_birth_date_required: "Informe sua data de nascimento em Dados pessoais antes de enviar a solicitação.",
  requesting_author_required: "Selecione qual autor é você para autorizar o uso do seu ano de nascimento.",
};
const translatedErrors: Record<FormLanguage, Record<string, string>> = {
  pt: errorLabels,
  en: { active_request_already_exists: "You already have an active request. Follow its progress from your dashboard.", active_student_required: "Your session cannot open a request. Please sign in again.", active_academic_program_required: "Select an active academic program.", valid_registration_required: "Enter a valid student ID with 3 to 30 characters.", valid_title_required: "Enter the complete title of the work.", public_https_url_required: "Enter a secure public link beginning with https://.", required_declarations_missing: "Confirm all three required declarations.", author_and_advisor_required: "Enter the author and advisor names.", portuguese_keyword_required: "Enter at least one keyword in Portuguese.", valid_cataloging_years_required: "Check the deposit and defense years.", valid_physical_extent_required: "Enter the number of pages or volumes.", illustrations_choice_required: "Indicate whether the work contains illustrations.", mp_cecre_volume_extent_required: "For MP-CECRE, enter 2 or 3 volumes.", valid_orientation_labels_required: "Check the advisor and co-advisor designations.", three_keywords_required: "Enter at least three keywords in Portuguese and three in the complementary language.", shared_authorship_not_allowed: "Shared authorship is allowed for RAU+E and TFG (up to three authors).", valid_committee_members_required: "Check the committee members' names.", valid_birth_year_required: "Enter a valid year of birth.", birth_year_acknowledgement_required: "Confirm that you understand how the year may be used in the catalog record.", unknown_error: "The request could not be submitted. Review the fields and try again." },
  de: { active_request_already_exists: "Sie haben bereits einen aktiven Antrag. Verfolgen Sie ihn über Ihr Dashboard.", active_student_required: "Ihre Sitzung kann keinen Antrag öffnen. Melden Sie sich erneut an.", active_academic_program_required: "Wählen Sie einen aktiven Studiengang aus.", valid_registration_required: "Geben Sie eine gültige Matrikelnummer mit 3 bis 30 Zeichen ein.", valid_title_required: "Geben Sie den vollständigen Titel der Arbeit ein.", public_https_url_required: "Geben Sie einen sicheren öffentlichen Link ein, der mit https:// beginnt.", required_declarations_missing: "Bestätigen Sie alle drei erforderlichen Erklärungen.", author_and_advisor_required: "Geben Sie die Namen des Verfassers und Betreuers ein.", portuguese_keyword_required: "Geben Sie mindestens ein Schlagwort auf Portugiesisch ein.", valid_cataloging_years_required: "Prüfen Sie Abgabe- und Verteidigungsjahr.", valid_physical_extent_required: "Geben Sie die Seiten- oder Bandanzahl ein.", illustrations_choice_required: "Geben Sie an, ob die Arbeit Abbildungen enthält.", mp_cecre_volume_extent_required: "Geben Sie für MP-CECRE 2 oder 3 Bände an.", valid_orientation_labels_required: "Prüfen Sie die Betreuer- und Mitbetreuerangaben.", three_keywords_required: "Geben Sie mindestens drei Schlagwörter auf Portugiesisch und drei in der Ergänzungssprache ein.", shared_authorship_not_allowed: "Gemeinsame Autorschaft ist für RAU+E und TFG (bis zu drei Autoren) zulässig.", valid_committee_members_required: "Prüfen Sie die Namen der Kommissionsmitglieder.", valid_birth_year_required: "Geben Sie ein gültiges Geburtsjahr ein.", birth_year_acknowledgement_required: "Bestätigen Sie, dass Sie die Verwendung des Jahres im Datensatz verstanden haben.", unknown_error: "Der Antrag konnte nicht gesendet werden. Prüfen Sie die Felder und versuchen Sie es erneut." },
  es: { active_request_already_exists: "Ya tiene una solicitud activa. Consulte su progreso en el panel.", active_student_required: "Su sesión no puede abrir una solicitud. Inicie sesión de nuevo.", active_academic_program_required: "Seleccione un programa académico activo.", valid_registration_required: "Indique una matrícula válida de 3 a 30 caracteres.", valid_title_required: "Indique el título completo del trabajo.", public_https_url_required: "Indique un enlace público seguro que empiece por https://.", required_declarations_missing: "Confirme las tres declaraciones obligatorias.", author_and_advisor_required: "Indique los nombres del autor y del director.", portuguese_keyword_required: "Indique al menos una palabra clave en portugués.", valid_cataloging_years_required: "Revise los años de depósito y defensa.", valid_physical_extent_required: "Indique la cantidad de páginas o volúmenes.", illustrations_choice_required: "Indique si el trabajo contiene ilustraciones.", mp_cecre_volume_extent_required: "Para MP-CECRE, indique 2 o 3 volúmenes.", valid_orientation_labels_required: "Revise las designaciones de dirección y codirección.", three_keywords_required: "Indique al menos tres palabras clave en portugués y tres en el idioma complementario.", shared_authorship_not_allowed: "La autoría compartida se permite en RAU+E y TFG (hasta tres autores).", valid_committee_members_required: "Revise los nombres de los miembros del tribunal.", valid_birth_year_required: "Indique un año de nacimiento válido.", birth_year_acknowledgement_required: "Confirme que comprende el uso del año en el registro.", unknown_error: "No se pudo enviar la solicitud. Revise los campos e inténtelo de nuevo." },
  fr: { active_request_already_exists: "Sie haben bereits einen aktiven Antrag. Verfolgen Sie ihn über Ihr Dashboard.", active_student_required: "Ihre Sitzung kann keinen Antrag öffnen. Melden Sie sich erneut an.", active_academic_program_required: "Wählen Sie einen aktiven Studiengang aus.", valid_registration_required: "Geben Sie eine gültige Matrikelnummer mit 3 bis 30 Zeichen ein.", valid_title_required: "Geben Sie den vollständigen Titel der Arbeit ein.", public_https_url_required: "Geben Sie einen sicheren öffentlichen Link ein, der mit https:// beginnt.", required_declarations_missing: "Bestätigen Sie alle drei erforderlichen Erklärungen.", author_and_advisor_required: "Geben Sie die Namen des Verfassers und Betreuers ein.", portuguese_keyword_required: "Geben Sie mindestens ein Schlagwort auf Portugiesisch ein.", valid_cataloging_years_required: "Prüfen Sie Abgabe- und Verteidigungsjahr.", valid_physical_extent_required: "Geben Sie die Seiten- oder Bandanzahl ein.", illustrations_choice_required: "Geben Sie an, ob die Arbeit Abbildungen enthält.", mp_cecre_volume_extent_required: "Geben Sie für MP-CECRE 2 oder 3 Bände an.", valid_orientation_labels_required: "Prüfen Sie die Betreuer- und Mitbetreuerangaben.", three_keywords_required: "Geben Sie mindestens drei Schlagwörter auf Portugiesisch und drei in der Ergänzungssprache ein.", shared_authorship_not_allowed: "Gemeinsame Autorschaft ist für RAU+E und TFG (bis zu drei Autoren) zulässig.", valid_committee_members_required: "Prüfen Sie die Namen der Kommissionsmitglieder.", valid_birth_year_required: "Geben Sie ein gültiges Geburtsjahr ein.", birth_year_acknowledgement_required: "Bestätigen Sie, dass Sie die Verwendung des Jahres im Datensatz verstanden haben.", unknown_error: "Der Antrag konnte nicht gesendet werden. Prüfen Sie die Felder und versuchen Sie es erneut." },
  it: { active_request_already_exists: "Hai già una richiesta attiva. Segui lo stato dal pannello.", active_student_required: "La sessione non consente di aprire una richiesta. Accedi di nuovo.", active_academic_program_required: "Seleziona un corso o programma attivo.", valid_registration_required: "Inserisci una matricola valida da 3 a 30 caratteri.", valid_title_required: "Inserisci il titolo completo del lavoro.", public_https_url_required: "Inserisci un link pubblico sicuro che inizi con https://.", required_declarations_missing: "Conferma tutte e tre le dichiarazioni obbligatorie.", author_and_advisor_required: "Inserisci i nomi dell'autore e del relatore.", portuguese_keyword_required: "Inserisci almeno una parola chiave in portoghese.", valid_cataloging_years_required: "Controlla gli anni di deposito e discussione.", valid_physical_extent_required: "Inserisci il numero di pagine o volumi.", illustrations_choice_required: "Indica se il lavoro contiene illustrazioni.", mp_cecre_volume_extent_required: "Per MP-CECRE indica 2 o 3 volumi.", valid_orientation_labels_required: "Controlla le designazioni di relatore e correlatore.", three_keywords_required: "Inserisci almeno tre parole chiave in portoghese e tre nella lingua complementare.", shared_authorship_not_allowed: "La paternità condivisa è consentita per RAU+E e TFG (fino a tre autori).", valid_committee_members_required: "Controlla i nomi dei membri della commissione.", valid_birth_year_required: "Inserisci un anno di nascita valido.", birth_year_acknowledgement_required: "Conferma di aver compreso l'uso dell'anno nella scheda.", unknown_error: "Impossibile inviare la richiesta. Controlla i campi e riprova." },
};

function copyLanguage(copy: Copy): FormLanguage {
  return Object.entries(uiCopy).find(([, value]) => value.steps === copy.steps)?.[0] as FormLanguage | undefined ?? "pt";
}

function guidanceFor(copy: Copy) { return formGuidance[copyLanguage(copy)]; }

function languageName(language: FormLanguage, copy: Copy) {
  return new Intl.DisplayNames([copyLanguage(copy)], { type: "language" }).of(language) ?? language;
}

function languageOptionName(language: FormLanguage, copy: Copy) {
  const name = languageName(language, copy);
  return name.charAt(0).toLocaleUpperCase(copyLanguage(copy)) + name.slice(1);
}

const formFieldHints: Record<FormLanguage, { advisorNames: string; finalDeliveryYear: string; keywordPairs: string; publicResource: string; equivalentTitle: (language: string) => string }> = {
  pt: { advisorNames: "Escreva os nomes do orientador e do coorientador como aparecem na ata, folha ou página de aprovação.", finalDeliveryYear: "Ano de entrega da versão final", keywordPairs: "Informe pelo menos três linhas de palavras-chave equivalentes, com um termo em cada idioma por linha.", publicResource: "Use o link HTTPS específico do arquivo ou da pasta compartilhada. O endereço inicial do serviço não serve.", equivalentTitle: (language) => `Título e subtítulo (quando houver) em ${language}` },
  en: { advisorNames: "Enter the advisor's and co-advisor's names as they appear in the defense record or approval page.", finalDeliveryYear: "Year of final version submission", keywordPairs: "Enter at least three aligned keyword rows, with one term in each language per row.", publicResource: "Use the specific HTTPS link to the shared file or folder. The service homepage is not enough.", equivalentTitle: (language) => `Title and subtitle (if any) in ${language}` },
  es: { advisorNames: "Escriba los nombres del director y codirector tal como aparecen en el acta o la página de aprobación.", finalDeliveryYear: "Año de entrega de la versión final", keywordPairs: "Indique al menos tres filas de palabras clave equivalentes, con un término en cada idioma por fila.", publicResource: "Use el enlace HTTPS específico del archivo o carpeta compartidos. La página inicial del servicio no sirve.", equivalentTitle: (language) => `Título y subtítulo (si lo hay) en ${language}` },
  de: { advisorNames: "Geben Sie die Namen der Betreuungspersonen so ein, wie sie im Prüfungsprotokoll oder auf der Genehmigungsseite stehen.", finalDeliveryYear: "Jahr der Abgabe der endgültigen Fassung", keywordPairs: "Geben Sie mindestens drei Zeilen gleichwertiger Schlagwörter ein, mit einem Begriff je Sprache und Zeile.", publicResource: "Verwenden Sie den konkreten HTTPS-Link zur freigegebenen Datei oder zum Ordner, nicht die Startseite des Dienstes.", equivalentTitle: (language) => `Titel und Untertitel (falls vorhanden) auf ${language}` },
  fr: { advisorNames: "Saisissez les noms du directeur et du codirecteur tels qu'ils figurent dans le procès-verbal ou sur la page d'approbation.", finalDeliveryYear: "Année de remise de la version finale", keywordPairs: "Saisissez au moins trois lignes de mots-clés équivalents, avec un terme par langue et par ligne.", publicResource: "Utilisez le lien HTTPS précis vers le fichier ou le dossier partagé, pas la page d'accueil du service.", equivalentTitle: (language) => `Titre et sous-titre (le cas échéant) en ${language}` },
  it: { advisorNames: "Inserisci i nomi del relatore e del correlatore come compaiono nel verbale o nella pagina di approvazione.", finalDeliveryYear: "Anno di consegna della versione finale", keywordPairs: "Inserisci almeno tre righe di parole chiave equivalenti, con un termine per lingua in ogni riga.", publicResource: "Usa il link HTTPS specifico del file o della cartella condivisa, non la pagina iniziale del servizio.", equivalentTitle: (language) => `Titolo e sottotitolo (se presente) in ${language}` },
};

const dateFieldCopy: Record<FormLanguage, { deposit: string; presentation: string; defense: string; depositHelp: string; approvalHelp: string; pagesHelp: string }> = {
  pt: { deposit: "Data de depósito do trabalho", presentation: "Data de apresentação do trabalho", defense: "Data de defesa do trabalho", depositHelp: "Informe a data em que o arquivo do trabalho foi finalizado.", approvalHelp: "Informe a data registrada na folha, ata ou página de aprovação.", pagesHelp: "Conte as páginas desde a folha ou página de rosto até a última página com informação textual." },
  en: { deposit: "Work deposit date", presentation: "Work presentation date", defense: "Work defense date", depositHelp: "Enter the date when the work file was finalized.", approvalHelp: "Enter the date shown on the approval sheet, record, or page.", pagesHelp: "Count from the title page through the last page containing text." },
  es: { deposit: "Fecha de depósito del trabajo", presentation: "Fecha de presentación del trabajo", defense: "Fecha de defensa del trabajo", depositHelp: "Indique la fecha en que se finalizó el archivo del trabajo.", approvalHelp: "Indique la fecha de la hoja, acta o página de aprobación.", pagesHelp: "Cuente desde la portada hasta la última página con contenido textual." },
  de: { deposit: "Abgabedatum der Arbeit", presentation: "Präsentationsdatum der Arbeit", defense: "Verteidigungsdatum der Arbeit", depositHelp: "Geben Sie das Datum an, an dem die Datei fertiggestellt wurde.", approvalHelp: "Geben Sie das Datum auf dem Genehmigungsblatt oder Protokoll an.", pagesHelp: "Zählen Sie vom Titelblatt bis zur letzten Seite mit Text." },
  fr: { deposit: "Date de dépôt du travail", presentation: "Date de présentation du travail", defense: "Date de soutenance du travail", depositHelp: "Indiquez la date à laquelle le fichier du travail a été finalisé.", approvalHelp: "Indiquez la date figurant sur la feuille, le procès-verbal ou la page d’approbation.", pagesHelp: "Comptez de la page de titre à la dernière page contenant du texte." },
  it: { deposit: "Data di deposito del lavoro", presentation: "Data di presentazione del lavoro", defense: "Data di discussione del lavoro", depositHelp: "Indica la data in cui il file del lavoro è stato completato.", approvalHelp: "Indica la data sul foglio, verbale o pagina di approvazione.", pagesHelp: "Conta dal frontespizio fino all’ultima pagina contenente testo." },
};

function errorText(copy: Copy, code: string) {
  const language = copyLanguage(copy);
  if (code === "registration_already_used") return ({
    pt: errorLabels.registration_already_used,
    en: "This student ID already has a completed request. For a new course or degree, enter the new student ID.",
    de: "Für diese Matrikelnummer gibt es bereits einen abgeschlossenen Antrag. Geben Sie für einen neuen Studiengang die neue Matrikelnummer ein.",
    es: "Esta matrícula ya tiene una solicitud finalizada. Para otro curso o grado, indique la nueva matrícula.",
    fr: "Ce numéro étudiant a déjà une demande terminée. Pour un nouveau cursus, indiquez le nouveau numéro.",
    it: "Questa matricola ha già una richiesta completata. Per un nuovo corso o titolo, indica la nuova matricola.",
  })[language];
  if (code === "submission_unavailable") return language === "pt" ? "O envio está temporariamente indisponível neste servidor. Atualize a página e tente novamente; se persistir, avise a biblioteca." : "Submission is temporarily unavailable on this server. Refresh the page and try again.";
  if (code === "valid_cataloging_dates_required") return `${dateFieldCopy[language].depositHelp} ${dateFieldCopy[language].approvalHelp}`;
  if (code === "public_https_url_required") return formFieldHints[language].publicResource;
  if (code === "tfg_author_limit_exceeded" || code === "representative_is_not_author") return uiText(language, errorLabels[code]);
  if (code === "requesting_author_required") return requesterAuthorCopy[language].placeholder;
  return translatedErrors[language][code] ?? translatedErrors[language].unknown_error;
}

function restoredRequestStep(draft: StudentRequestDraft, candidate: number, retrospective: boolean) {
  if (retrospective && !/^[0-9]{3,30}$/.test(draft.registrationNumber.trim())) return 1;
  return Math.min(5, Math.max(1, Number.isInteger(candidate) ? candidate : 1));
}

export function StudentRequestForm({ programs, userId, requesterName, usedRegistrations = [], retrospective = false, openReview = false, preview = false, previewSuccessHref }: { programs: Program[]; userId: string; requesterName: string; usedRegistrations?: string[]; retrospective?: boolean; openReview?: boolean; preview?: boolean; previewSuccessHref?: string }) {
  const router = useRouter();
  const draftKey = studentRequestDraftKey(userId);
  const [draft, setDraft] = useState<StudentRequestDraft>(emptyStudentRequestDraft);
  const [ready, setReady] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [draftStorageError, setDraftStorageError] = useState(false);
  const submitted = useRef(false);
  const draftSaveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [subtitleTouched, setSubtitleTouched] = useState(false);
  const [pendingFormLanguage, setPendingFormLanguage] = useState<FormLanguage | null>(null);
  const { language: interfaceLanguage } = useInterfaceLanguage();
  const highlightTimer = useRef<number | undefined>(undefined);
  const requestFormRef = useRef<HTMLFormElement>(null);
  const requestStepsRef = useRef<HTMLElement>(null);
  const animateStepTab = useRef(false);
  const [stepOverflow, setStepOverflow] = useState({ start: false, end: false });
  const reviewScrollRequested = useRef(openReview);
  const stepScrollRequested = useRef(false);
  const programPickerRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closePicker = (event: PointerEvent) => {
      if (event.target instanceof Node && !programPickerRef.current?.contains(event.target) && programPickerRef.current) programPickerRef.current.open = false;
    };
    document.addEventListener("pointerdown", closePicker);
    return () => document.removeEventListener("pointerdown", closePicker);
  }, []);
  const uiLanguage = retrospective ? "pt" : interfaceLanguage;
  const text = { ...uiCopy[uiLanguage], ...(retrospective ? { registration: "Matrícula do primeiro autor do trabalho", enrollmentNote: "Informe a matrícula do primeiro autor, na ordem da folha de rosto. A secretaria é responsável pelo envio e não integra a autoria." } : {}) } as Copy;
  const subtitleCopy = (draft.originalLanguage === "de" ? germanSubtitleCopy : subtitleCapitalizationCopy)[uiLanguage];
  const subtitleNeedsReview = draft.originalLanguageSelected && startsWithCapital(draft.subtitle);
  const steps: { label: string; icon: AppIconName }[] = text.steps.map((label, index) => ({ label, icon: (["account", "document", "tag", "shield", "review"] as AppIconName[])[index] }));
  const navigateStep = (step: number) => {
    if (submitting || step < 1 || step > steps.length || step === activeStep) return;
    stepScrollRequested.current = true;
    animateStepTab.current = true;
    setActiveStep(step);
    setFurthestStep((current) => Math.max(current, step));
  };
  useLayoutEffect(() => {
    const tabs = requestStepsRef.current;
    if (!tabs || !window.matchMedia("(max-width: 700px)").matches) return;
    const updateOverflow = () => setStepOverflow({ start: tabs.scrollLeft > 2, end: tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 2 });
    const centerSelected = (behavior: ScrollBehavior) => {
      const buttons = Array.from(tabs.querySelectorAll<HTMLButtonElement>("[role=tab]"));
      const selected = buttons.find((button) => button.getAttribute("aria-selected") === "true");
      if (!selected || !buttons.length) return;
      tabs.style.setProperty("--tab-edge-start", `${Math.max(0, (tabs.clientWidth - buttons[0].offsetWidth) / 2 - 6)}px`);
      tabs.style.setProperty("--tab-edge-end", `${Math.max(0, (tabs.clientWidth - buttons[buttons.length - 1].offsetWidth) / 2 - 6)}px`);
      const tabsRect = tabs.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      tabs.scrollTo({ left: tabs.scrollLeft + selectedRect.left - tabsRect.left + selectedRect.width / 2 - tabsRect.width / 2, behavior });
      updateOverflow();
    };
    const behavior = animateStepTab.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant";
    animateStepTab.current = false;
    const frame = window.requestAnimationFrame(() => centerSelected(behavior));
    const resizeObserver = new ResizeObserver(() => centerSelected("instant"));
    resizeObserver.observe(tabs);
    tabs.addEventListener("scroll", updateOverflow, { passive: true });
    return () => { window.cancelAnimationFrame(frame); resizeObserver.disconnect(); tabs.removeEventListener("scroll", updateOverflow); };
  }, [activeStep, ready]);
  const selectOriginalLanguage = (language: FormLanguage, confirmed = false) => {
    if (language === draft.originalLanguage && draft.originalLanguageSelected) return;
    if (confirmed || !draft.originalLanguageSelected) {
      setDraft((current) => {
        const required = requiredEquivalentLanguages(language);
        const existing = current.originalLanguageSelected ? current.equivalentTitles : [];
        const additional = existing.find((item) => item.language !== "" && item.language !== language && !required.includes(item.language));
        const titles = [...required.map((requiredLanguage) => ({ language: requiredLanguage, title: existing.find((item) => item.language === requiredLanguage)?.title ?? "" })), ...(additional ? [additional] : [])];
        return { ...current, originalLanguage: language, originalLanguageSelected: true, equivalentTitles: titles, keywordsOriginal: current.originalLanguage === language ? current.keywordsOriginal : current.keywordsOriginal.map(() => ""), keywordsAdditional: additional ? current.keywordsAdditional : current.keywordsAdditional.map(() => "") };
      });
      return;
    }
    setPendingFormLanguage(language);
  };
  const selectedProgram = programs.find((program) => program.id === draft.academicProgramId);
  const selectProgram = (id: string) => {
    const program = programs.find((item) => item.id === id);
    setDraft((current) => ({ ...current, academicProgramId: id, extentUnit: program?.code === "mp-cecre-master" ? "volumes" : "pages", extentCount: "" }));
    if (programPickerRef.current) programPickerRef.current.open = false;
  };
  useEffect(() => {
    if (!retrospective || !ready) return;
    const program = programs.find((item) => item.code === "athdc-specialization");
    if (program) setDraft((current) => current.academicProgramId === program.id ? current : { ...current, academicProgramId: program.id });
  }, [retrospective, ready, programs]);
  const detectedAuthorIndex = matchingRequesterAuthorIndex(requesterName, [draft.people.author, ...draft.people.additionalAuthors]);
  const requesterAuthorIndex = draft.people.birthYearAuthorIndex ?? detectedAuthorIndex;
  const draftForReview = { ...draft, people: { ...draft.people, birthYearAcknowledged: retrospective ? false : draft.people.birthYearAcknowledged, birthYearAuthorIndex: retrospective ? null : requesterAuthorIndex } };
  const registrationUsed = usedRegistrations.includes(draft.registrationNumber.trim());
  const representativeInAuthors = retrospective && [draft.people.author, ...draft.people.additionalAuthors].some((author) => comparableName(author) !== "" && comparableName(author) === comparableName(requesterName));
  const reviewItems = [...getReviewItems(draftForReview, programs, text), ...(representativeInAuthors ? [{ label: "A secretaria representa os autores e não deve ser informada como autora.", step: 2, field: "author-0", valid: false }] : [])].map((item) => item.field === "registration" && registrationUsed ? { ...item, valid: false, issue: errorText(text, "registration_already_used") } : item);
  const submissionReady = ready && reviewItems.every((item) => item.valid);
  const snapshot = JSON.stringify({ draft, activeStep, furthestStep });
  const currentSnapshot = useRef(snapshot);
  useEffect(() => { currentSnapshot.current = snapshot; }, [snapshot]);
  const fieldEdit = useRef<{ target: EventTarget; draft: StudentRequestDraft } | null>(null);
  const isMpCecre = selectedProgram?.code === "mp-cecre-master";
  const isTfg = selectedProgram?.code === "architecture-urbanism-undergraduate";
  const allowsSharedAuthors = selectedProgram?.code === "athdc-specialization" || isTfg;
  const keywordLanguages = keywordColumns(draft);

  useEffect(() => {
    if (!ready || activeStep !== 5 || !reviewScrollRequested.current) return;
    reviewScrollRequested.current = false;
    requestFormRef.current?.querySelector(".review-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ready, activeStep]);
  useEffect(() => {
    if (!ready || !stepScrollRequested.current) return;
    stepScrollRequested.current = false;
    const frame = window.requestAnimationFrame(() => requestFormRef.current?.querySelector<HTMLElement>(`.form-step--${activeStep}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [activeStep, ready]);

  useEffect(() => {
    const form = requestFormRef.current;
    if (!form) return;
    const invalid = new Set(reviewItems.filter((item) => item.step === activeStep && !item.valid).map((item) => item.field));
    form.querySelectorAll<HTMLElement>("[data-review-field]").forEach((field) => {
      field.classList.toggle("is-revisited-pending", activeStep < furthestStep && invalid.has(field.dataset.reviewField ?? ""));
    });
  }, [activeStep, furthestStep, reviewItems]);

  useEffect(() => {
    if (preview) {
      try {
        const stored = sessionStorage.getItem(studentPreviewDraftKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const restored = restoreStudentRequestDraft(parsed.draft ?? parsed);
          setDraft(restored);
          const step = openReview ? 5 : Number(parsed.activeStep) || 1;
          setActiveStep(restoredRequestStep(restored, step, retrospective));
          setFurthestStep(Math.min(5, Math.max(1, Number(parsed.furthestStep) || step)));
        }
      } catch { /* A demonstração começa com o formulário vazio. */ }
      setReady(true);
      return;
    }
    let active = true;
    async function loadDraft() {
      try {
        const { data, error } = await createClient().from("student_request_drafts").select("payload,updated_at").eq("user_id", userId).maybeSingle();
        if (error) throw error;
        const local = localStorage.getItem(draftKey);
        const localPayload = local ? JSON.parse(local) : null;
        const useLocal = Boolean(localPayload && (!data || Date.parse(localPayload.savedAt ?? "") > Date.parse(data.updated_at)));
        const parsed = useLocal ? localPayload : data?.payload;
        if (parsed && active) {
          const restored = restoreStudentRequestDraft(parsed.draft ?? parsed);
          const step = restoredRequestStep(restored, openReview ? 5 : Number(parsed.activeStep), retrospective);
          const visited = Number.isInteger(parsed.furthestStep) && parsed.furthestStep >= step && parsed.furthestStep <= 5 ? parsed.furthestStep : step;
          setDraft(restored); setActiveStep(step); setFurthestStep(visited);
          setSavedSnapshot(useLocal ? "" : JSON.stringify({ draft: restored, activeStep: step, furthestStep: visited }));
        } else if (openReview && active && !retrospective) setActiveStep(5);
      } catch {
        if (active) {
          try {
            const stored = localStorage.getItem(draftKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              const restored = restoreStudentRequestDraft(parsed.draft ?? parsed);
              setDraft(restored);
              setActiveStep(restoredRequestStep(restored, openReview ? 5 : Number(parsed.activeStep), retrospective));
              setFurthestStep(parsed.furthestStep ?? 1);
            }
          } catch { /* O preenchimento permanece disponível nesta tela. */ }
          setDraftStorageError(true);
          showPanelChangeError("Banco indisponível", "Uma cópia local pode estar disponível. Confira a conexão antes de continuar.");
        }
      } finally { if (active) setReady(true); }
    }
    void loadDraft();
    return () => { active = false; };
  }, [draftKey, openReview, preview, userId, retrospective]);

  function persistDraft(value: string) {
    try { localStorage.setItem(draftKey, JSON.stringify({ ...JSON.parse(value), savedAt: new Date().toISOString() })); } catch { /* A cópia local é opcional. */ }
    draftSaveQueue.current = draftSaveQueue.current.catch(() => false).then(async () => {
      if (submitted.current) return false;
      const payload = JSON.parse(value);
      const { data, error } = await createClient().rpc("save_student_request_draft", { draft_payload: payload });
      if (error) {
        setDraftStorageError(true);
        showPanelChangeError("Rascunho não salvo", "Não foi possível salvar no banco. Confira a conexão e tente novamente.");
        return false;
      }
      try { localStorage.setItem(draftKey, JSON.stringify({ ...payload, savedAt: data })); } catch { /* A cópia local é opcional. */ }
      setSavedSnapshot(value);
      setDraftStorageError(false);
      return true;
    }).catch(() => {
      setDraftStorageError(true);
      showPanelChangeError("Rascunho não salvo", "Confira a conexão. Os dados continuam nesta tela e em uma cópia local.");
      return false;
    });
    return draftSaveQueue.current;
  }

  useEffect(() => {
    if (preview) {
      if (ready && !submitted.current && !(JSON.stringify(draft) === JSON.stringify(emptyStudentRequestDraft) && activeStep === 1)) {
        try { sessionStorage.setItem(studentPreviewDraftKey, JSON.stringify({ draft, activeStep, furthestStep, savedAt: new Date().toISOString() })); } catch { /* A demonstração continua nesta página. */ }
      }
      return;
    }
    if (!ready || submitted.current || submitting || savedSnapshot === snapshot || (JSON.stringify(draft) === JSON.stringify(emptyStudentRequestDraft) && activeStep === 1)) return;
    const timer = window.setTimeout(() => { void persistDraft(snapshot); }, 500);
    return () => window.clearTimeout(timer);
  }, [draftKey, snapshot, savedSnapshot, ready, draft, activeStep, furthestStep, preview, submitting]);

  function finishFieldEdit(target: EventTarget) {
    if (preview) { fieldEdit.current = null; return; }
    const edit = fieldEdit.current;
    if (!edit || edit.target !== target) return;
    fieldEdit.current = null;
    if (JSON.stringify(edit.draft) === JSON.stringify(draft)) return;
    void persistDraft(snapshot).then((saved) => {
      if (!saved || currentSnapshot.current !== snapshot) return;
      showPanelChange("Rascunho salvo no banco", async () => {
        if (currentSnapshot.current !== snapshot) throw new Error("O rascunho mudou após este salvamento.");
        const restoredSnapshot = JSON.stringify({ draft: edit.draft, activeStep, furthestStep });
        await persistDraft(restoredSnapshot);
        setDraft(edit.draft);
      });
    });
  }

  useEffect(() => { if (ready) dismissPanelChange(); }, [snapshot, ready]);

  useEffect(() => {
    if (!highlightedField) return;
    const field = document.querySelector<HTMLElement>(`[data-review-field="${highlightedField}"]`);
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    field.classList.add("is-review-target");
    [...field.querySelectorAll<HTMLElement>("summary, input, select, textarea")].find((control) => control.getClientRects().length > 0)?.focus({ preventScroll: true });
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => {
      field.classList.remove("is-review-target");
      setHighlightedField(null);
    }, 2200);
    return () => { window.clearTimeout(highlightTimer.current); field.classList.remove("is-review-target"); };
  }, [activeStep, highlightedField]);

  useEffect(() => {
    if (!error) return;
    const alert = requestFormRef.current?.querySelector<HTMLElement>('[role="alert"]');
    alert?.focus();
    alert?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  const set = <K extends keyof StudentRequestDraft>(key: K, value: StudentRequestDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setListItem = (key: "otherTitles" | "keywordsPt" | "keywordsEn" | "keywordsOriginal" | "keywordsAdditional", index: number, value: string) =>
    setDraft((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item) }));
  const addKeywordPair = () => setDraft((current) => current.keywordsPt.length >= 5 ? current : ({ ...current, keywordsPt: [...current.keywordsPt, ""], keywordsEn: [...current.keywordsEn, ""], keywordsOriginal: [...current.keywordsOriginal, ""], keywordsAdditional: [...current.keywordsAdditional, ""] }));
  const removeKeywordPair = (index: number) => setDraft((current) => current.keywordsPt.length > 3 ? ({ ...current, keywordsPt: current.keywordsPt.filter((_, itemIndex) => itemIndex !== index), keywordsEn: current.keywordsEn.filter((_, itemIndex) => itemIndex !== index), keywordsOriginal: current.keywordsOriginal.filter((_, itemIndex) => itemIndex !== index), keywordsAdditional: current.keywordsAdditional.filter((_, itemIndex) => itemIndex !== index) }) : current);

  function jumpToField(step: number, field: string) {
    setHighlightedField(null);
    setActiveStep(step);
    window.requestAnimationFrame(() => setHighlightedField(field));
  }

  async function submitRequest() {
    if (preview) {
      if (activeStep !== 5) { setActiveStep(5); return; }
      const invalid = reviewItems.find((item) => !item.valid);
      if (invalid) { jumpToField(invalid.step, invalid.field); return; }
      submitted.current = true;
      try { sessionStorage.removeItem(studentPreviewDraftKey); } catch { /* Nenhum dado real foi alterado. */ }
      showPanelChange(uiText(interfaceLanguage, "Demonstração: nenhum pedido foi enviado."));
      if (previewSuccessHref) router.push(previewSuccessHref);
      return;
    }
    if (activeStep !== 5) { setActiveStep(5); return; }
    if (submitting) return;
    const invalid = reviewItems.find((item) => !item.valid);
    if (invalid) { jumpToField(invalid.step, invalid.field); return; }
    setSubmitting(true);
    setError(undefined);
    try {
      await draftSaveQueue.current.catch(() => undefined);
      const payload = compactDraft({ ...draftForReview, extentUnit: isMpCecre ? "volumes" : "pages", people: { ...draftForReview.people, birthYearAcknowledged: retrospective ? false : draftForReview.people.birthYearAcknowledged, birthYearAuthorIndex: retrospective ? null : draftForReview.people.birthYearAuthorIndex, additionalAuthors: allowsSharedAuthors ? draft.people.additionalAuthors : [] } });
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("open_student_request_v12", { payload });
      if (rpcError) {
        const known = ["valid_cataloging_dates_required", ...Object.keys(errorLabels)].find((code) => rpcError.message.includes(code));
        const errorCode = rpcError.code === "PGRST202" ? "submission_unavailable" : ["cataloging_requests_one_non_canceled_per_enrollment", "academic_enrollments_one_registration_per_student"].some((index) => rpcError.message.includes(index)) ? "registration_already_used" : known ?? "unknown_error";
        setError(errorCode);
        showPanelChangeError("Solicitação não enviada", errorText(text, errorCode));
        setSubmitting(false);
        return;
      }
      submitted.current = true;
      await draftSaveQueue.current.catch(() => undefined);
      await supabase.from("student_request_drafts").delete().eq("user_id", userId);
      try { localStorage.removeItem(draftKey); localStorage.removeItem(studentPreparationKey(userId)); } catch { /* The request is already saved on the server. */ }
      showPanelChange("Solicitação enviada");
      const protocol = Array.isArray(data) ? data[0]?.generated_protocol : undefined;
      const requestId = Array.isArray(data) ? data[0]?.request_id : undefined;
      router.push(`/painel/solicitacao?enviada=1${retrospective && requestId ? `&pedido=${encodeURIComponent(requestId)}` : ""}${protocol ? `&protocolo=${encodeURIComponent(protocol)}` : ""}`);
      router.refresh();
    } catch {
      setError("unknown_error");
      showPanelChangeError("Solicitação não enviada", "Confira a conexão e tente novamente. Seus dados continuam no formulário.");
      setSubmitting(false);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveStep(5);
  }

  return (
    <form noValidate ref={requestFormRef} className="request-form" aria-busy={submitting} onSubmit={submit} onFocusCapture={(event) => { if (event.target.matches("input, textarea, select")) fieldEdit.current = { target: event.target, draft }; }} onBlurCapture={(event) => finishFieldEdit(event.target)} data-active-step={activeStep} data-revisited={activeStep < furthestStep ? "true" : undefined}>
      {error && <div className="auth-feedback auth-feedback--error" role="alert" tabIndex={-1}>{errorText(text, error)}</div>}
      <DraftProgress items={reviewItems} language={uiLanguage} onReview={activeStep === 5 ? undefined : () => { reviewScrollRequested.current = true; setActiveStep(5); setFurthestStep(5); }} />
      <div className="request-steps-shell" data-overflow-start={stepOverflow.start} data-overflow-end={stepOverflow.end}>
        <nav className="admin-tabs request-steps" ref={requestStepsRef} role="tablist" aria-label={text.steps.join(", ")}>{steps.map((step, index) => { const pending = reviewItems.filter((item) => item.step === index + 1 && !item.valid).length; const statusLabel = ({ pt: ["erro/pendência", "erros/pendências"], en: ["error/pending", "errors/pending"], es: ["error/pendencia", "errores/pendencias"], de: ["Fehler/offen", "Fehler/offen"], fr: ["erreur/à corriger", "erreurs/à corriger"], it: ["errore/in sospeso", "errori/in sospeso"] } as const)[uiLanguage][pending === 1 ? 0 : 1]; return <button key={index} role="tab" aria-selected={activeStep === index + 1} type="button" disabled={submitting} aria-current={activeStep === index + 1 ? "step" : undefined} className={activeStep === index + 1 ? "is-active" : ""} onClick={() => navigateStep(index + 1)}><AppIcon name={step.icon} /><span className="request-step-title">{step.label}</span>{index < 4 && index + 1 < furthestStep && <span className={`request-step-status${pending ? " request-step-status--pending" : " request-step-status--ok"}`} aria-label={pending ? `${pending} ${statusLabel}` : text.checked}>{pending || <AppIcon name="check" />}{pending > 0 && <span className="request-step-status__detail" aria-hidden="true">{statusLabel}</span>}</span>}</button>; })}</nav>
        <button className="request-steps-shell__arrow request-steps-shell__arrow--start" type="button" disabled={submitting || activeStep === 1} aria-label={`${text.back}: ${steps[activeStep - 2]?.label ?? ""}`} onClick={() => navigateStep(activeStep - 1)}><AppIcon name="arrowRight" /></button>
        <button className="request-steps-shell__arrow request-steps-shell__arrow--end" type="button" disabled={submitting || activeStep === steps.length} aria-label={`${text.next}: ${steps[activeStep]?.label ?? ""}`} onClick={() => navigateStep(activeStep + 1)}><AppIcon name="arrowRight" /></button>
      </div>

      <fieldset disabled={submitting} className="form-section form-step form-step--1">
        <legend className="sr-only">{steps[0].label}</legend>
        <div className="form-row">
          {retrospective ? <label className="retrospective-program" data-review-field="program"><FieldTitle icon="book">{text.program}</FieldTitle><select disabled aria-label={text.program} value={programs.find((program) => program.code === "athdc-specialization")?.id ?? ""}><option value={programs.find((program) => program.code === "athdc-specialization")?.id ?? ""}>RAU+E · Residência em Arquitetura, Urbanismo e Engenharia</option></select></label> : <><div className="request-program-field" data-review-field="program"><label htmlFor="request-program-select"><FieldTitle icon="book">{text.program}</FieldTitle></label><span className="request-program-field__mobile-label"><FieldTitle icon="book">{text.program}</FieldTitle></span><details className="request-program-picker" ref={programPickerRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}><summary aria-label={`${text.program}: ${selectedProgram?.name ?? text.select}`}><span>{selectedProgram ? `${levelLabels[uiLanguage][selectedProgram.level] ?? selectedProgram.level} · ${selectedProgram.name}` : text.select}</span></summary><div className="request-program-picker__options" role="listbox" aria-label={text.program}>{programs.map((program) => <button type="button" role="option" aria-selected={draft.academicProgramId === program.id} key={program.id} onClick={() => { selectProgram(program.id); programPickerRef.current?.querySelector<HTMLElement>("summary")?.focus(); }}>{levelLabels[uiLanguage][program.level] ?? program.level} · {program.name}</button>)}</div></details><select id="request-program-select" required value={draft.academicProgramId} onChange={(e) => selectProgram(e.target.value)}><option value="">{text.select}</option>{programs.map((program) => <option key={program.id} value={program.id}>{levelLabels[uiLanguage][program.level] ?? program.level} · {program.name}</option>)}</select></div></>}
          <label data-review-field="registration"><FieldTitle icon="account">{text.registration}</FieldTitle><input required type="text" inputMode="numeric" pattern="[0-9]{3,30}" minLength={3} maxLength={30} value={draft.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value.replace(/[^0-9]/g, ""))} placeholder={text.registration} aria-invalid={registrationUsed} aria-describedby={registrationUsed ? "registration-used-error" : undefined} />{registrationUsed && <span className="signup-field-error" id="registration-used-error">{errorText(text, "registration_already_used")}</span>}</label>
        </div>
        <FieldNote>{text.enrollmentNote}</FieldNote>
      </fieldset>

      <fieldset disabled={submitting} className="form-section form-step form-step--2">
        <legend className="sr-only">{steps[1].label}</legend>
            <p className="form-section__intro">{text.intro}</p>
        <section className="form-subsection" aria-labelledby="request-people-heading">
          <h3 id="request-people-heading">{text.people}</h3>
          <div className="form-subsection__fields">
            {allowsSharedAuthors ? <AuthorFields values={[draft.people.author, ...draft.people.additionalAuthors]} onChange={(authors, resetSelection) => set("people", { ...draft.people, author: authors[0] ?? "", additionalAuthors: authors.slice(1), birthYearAuthorIndex: resetSelection ? null : draft.people.birthYearAuthorIndex, birthYearAcknowledged: resetSelection ? false : draft.people.birthYearAcknowledged })} text={text} maxAuthors={isTfg ? 3 : undefined} /> : <div className="form-field"><label data-review-field="author"><FieldTitle icon="person">{text.author}</FieldTitle><DirectNameInput value={draft.people.author} onChange={(value) => set("people", { ...draft.people, author: value })} text={text} /></label></div>}
            {!retrospective && <label className="check check--birth-year" data-review-field="birth-year-acknowledgement"><input type="checkbox" checked={draft.people.birthYearAcknowledged} onChange={(e) => set("people", { ...draft.people, birthYearAcknowledged: e.target.checked })} /><span>{text.birthYearAck}</span></label>}
            <FieldNote>{text.birthYearNote}</FieldNote>
            {!retrospective && allowsSharedAuthors && draft.people.additionalAuthors.length > 0 && draft.people.birthYearAcknowledged && <label data-review-field="birth-year-author"><FieldTitle icon="person">{requesterAuthorCopy[uiLanguage].label}</FieldTitle><select required value={requesterAuthorIndex ?? ""} onChange={(event) => set("people", { ...draft.people, birthYearAuthorIndex: event.target.value === "" ? null : Number(event.target.value) })}><option value="">{requesterAuthorCopy[uiLanguage].placeholder}</option>{[draft.people.author, ...draft.people.additionalAuthors].map((author, index) => <option key={index} value={index}>{text.authorNumber.replace("{number}", String(index + 1))}: {author.trim() || "—"}</option>)}</select><span className="field-help">{detectedAuthorIndex !== null && draft.people.birthYearAuthorIndex === null ? requesterAuthorCopy[uiLanguage].automatic : requesterAuthorCopy[uiLanguage].note}</span></label>}
          </div>
        </section>
        <section className="form-subsection" aria-labelledby="request-title-heading">
          <h3 id="request-title-heading">{text.titleAndLanguage}</h3>
          <div className="form-subsection__fields">
            <OriginalLanguageField draft={draft} text={text} onLanguageChange={selectOriginalLanguage} />
            <p className="field-help title-language-instruction"><AppIcon name="help" /> <span>{text.titleInstruction}</span></p>
            <label data-review-field="title"><FieldTitle icon="document">{text.titleOriginal}{draft.originalLanguageSelected ? ` (${languageName(draft.originalLanguage, text)})` : ""}</FieldTitle><textarea required minLength={3} maxLength={500} rows={2} value={draft.title} onChange={(e) => set("title", e.target.value)} /></label>
            <label data-review-field="subtitle"><FieldTitle icon="document">{text.subtitle}{draft.originalLanguageSelected ? ` (${languageName(draft.originalLanguage, text)})` : ""}</FieldTitle><input maxLength={500} value={draft.subtitle} onChange={(e) => set("subtitle", e.target.value)} onBlur={() => setSubtitleTouched(true)} placeholder={text.optional} aria-describedby={draft.originalLanguageSelected ? "subtitle-capitalization-guidance" : undefined} /></label>
            {draft.originalLanguageSelected && <p className="field-help" id="subtitle-capitalization-guidance"><AppIcon name="help" /><span>{subtitleCopy.guidance}</span></p>}
            {subtitleTouched && subtitleNeedsReview && <p className="subtitle-capitalization-warning" role="status"><AppIcon name="help" /><span>{subtitleCopy.warning}</span></p>}
            {draft.originalLanguageSelected ? <EquivalentTitlesFields draft={draft} text={text} onChange={(equivalentTitles) => setDraft((current) => {
              const next = { ...current, equivalentTitles };
              return { ...next, keywordsAdditional: additionalEquivalentLanguage(current) === additionalEquivalentLanguage(next) ? current.keywordsAdditional : current.keywordsAdditional.map(() => "") };
            })} /> : <FieldNote>{text.select}: {text.originalLanguage}</FieldNote>}
          </div>
        </section>
        <section className="form-subsection" aria-labelledby="request-committee-heading">
          <h3 id="request-committee-heading">{text.advising}</h3>
          <div className="form-subsection__fields">
          <div className="form-row"><label data-review-field="advisor"><FieldTitle icon="person">{text.advisor}</FieldTitle><DirectNameInput value={draft.people.advisor} onChange={(value) => set("people", { ...draft.people, advisor: value })} text={text} /></label><label data-review-field="coadvisor"><FieldTitle icon="person">{text.coadvisor}</FieldTitle><DirectNameInput value={draft.people.coadvisor} onChange={(value) => set("people", { ...draft.people, coadvisor: value })} text={text} required={false} placeholder={text.optional} /></label></div>
            <FieldNote>{formFieldHints[uiLanguage].advisorNames}</FieldNote>
            <CommitteeFields values={draft.people.committeeMembers} hasCoadvisor={Boolean(draft.people.coadvisor.trim())} onChange={(committeeMembers) => set("people", { ...draft.people, committeeMembers })} text={text} />
          </div>
        </section>
        <section className="form-subsection" aria-labelledby="request-cataloging-heading">
          <h3 id="request-cataloging-heading">{text.catalogingData}</h3>
          <div className="form-subsection__fields">
            <div className="special-cases"><span>{text.specialCases}</span>{[["cotutelle", text.cotutelle, text.cotutelleHelp], ["double_degree", text.doubleDegree, text.doubleDegreeHelp]].map(([value, label, help]) => <label className="check special-case-label" key={value}><input type="checkbox" checked={draft.specialCases.includes(value)} onChange={(e) => set("specialCases", e.target.checked ? [...draft.specialCases, value] : draft.specialCases.filter((item) => item !== value))} /><span className="request-field-title"><AppIcon name={value === "cotutelle" ? "account" : "book"} />{label}</span><span className="tooltip" tabIndex={0} aria-label={`${text.optional}: ${label}`}>i<span role="tooltip">{help}</span></span></label>)}</div>
            <div className="form-row"><label data-review-field="deposit-year"><span className="request-field-heading"><FieldTitle icon="calendar">{dateFieldCopy[uiLanguage].deposit}</FieldTitle><FieldTooltip text={dateFieldCopy[uiLanguage].depositHelp} /></span><input required type="date" min="1900-01-01" value={draft.depositDate} onChange={(e) => set("depositDate", e.target.value)} /></label><label data-review-field="defense-year"><span className="request-field-heading"><FieldTitle icon="calendar">{selectedProgram?.work_type === "thesis" || selectedProgram?.work_type === "dissertation" ? dateFieldCopy[uiLanguage].defense : dateFieldCopy[uiLanguage].presentation}</FieldTitle><FieldTooltip text={dateFieldCopy[uiLanguage].approvalHelp} /></span><input required type="date" min="1900-01-01" max={draft.depositDate || undefined} value={draft.defenseDate} onChange={(e) => set("defenseDate", e.target.value)} /></label></div>
            <div className="form-row">
              {isMpCecre ? <label data-review-field="extent"><FieldTitle icon="book">{text.volumeCount}</FieldTitle><select required value={draft.extentCount} onChange={(e) => set("extentCount", e.target.value)}><option value="">{text.select}</option><option value="2">2</option><option value="3">3</option></select></label> : <label data-review-field="extent"><span className="request-field-heading"><FieldTitle icon="document">{text.pageCount}</FieldTitle><FieldTooltip text={dateFieldCopy[uiLanguage].pagesHelp} /></span><input required type="number" min="1" max="99999" value={draft.extentCount} onChange={(e) => set("extentCount", e.target.value)} /></label>}
              <label className="request-illustrations-field" data-review-field="illustrations"><FieldTitle icon="review">{text.illustrations}</FieldTitle><select required value={draft.hasIllustrations} onChange={(e) => set("hasIllustrations", e.target.value as "" | "yes" | "no")}><option value="">{text.select}</option><option value="yes">{text.yes}</option><option value="no">{text.no}</option></select></label>
            </div>
          </div>
        </section>
      </fieldset>

      <fieldset disabled={submitting} className="form-section form-step form-step--3">
        <legend className="sr-only">{steps[2].label}</legend>
        <p className="form-section__intro">{text.intro}</p>
        <FieldNote>{formFieldHints[uiLanguage].keywordPairs} {draft.originalLanguageSelected && <><br />{({ pt: "Ordem dos idiomas:", en: "Language order:", es: "Orden de los idiomas:", de: "Reihenfolge der Sprachen:", fr: "Ordre des langues :", it: "Ordine delle lingue:" } as Record<FormLanguage, string>)[uiLanguage]} <strong>{keywordLanguages.map((column) => languageOptionName(column.language, text)).join(" → ")}</strong>.</>}</FieldNote>
        {draft.originalLanguageSelected ? <section className={`keyword-pairs keyword-pairs--${keywordLanguages.length}`} aria-label={text.keywords}>
          <div className="keyword-pairs__labels">{keywordLanguages.map((column) => <h3 key={column.language}>{languageOptionName(column.language, text)}</h3>)}</div>
          {Array.from({ length: draft.keywordsPt.length }, (_, index) => <div className="keyword-pair" key={index}>
            {keywordLanguages.map((column) => <label data-review-field={`keyword-${column.language}-${index}`} key={column.language}><span className="keyword-pair__mobile-label">{text.term.replace("{number}", String(index + 1))} · {languageOptionName(column.language, text)}</span><input required minLength={2} maxLength={100} aria-label={`${text.term.replace("{number}", String(index + 1))} — ${languageName(column.language, text)}`} value={draft[column.key][index] ?? ""} onChange={(event) => setListItem(column.key, index, event.target.value)} placeholder={`${text.term.replace("{number}", String(index + 1))} · ${languageName(column.language, text)}`} /><small>{column.language === draft.originalLanguage ? text.oneTerm : text.equivalentToLeft}</small></label>)}
            {index >= 3 && <button className="text-button text-button--remove" type="button" onClick={() => removeKeywordPair(index)}>{({ pt: "Remover linha", en: "Remove row", es: "Eliminar fila", de: "Zeile entfernen", fr: "Supprimer la ligne", it: "Rimuovi riga" } as Record<FormLanguage, string>)[uiLanguage]}</button>}
          </div>)}
          {draft.keywordsPt.length < 5 && <button className="add-field" type="button" onClick={addKeywordPair}>{({ pt: "+ Adicionar linha de palavras-chave", en: "+ Add keyword row", es: "+ Añadir fila de palabras clave", de: "+ Schlagwortzeile hinzufügen", fr: "+ Ajouter une ligne de mots-clés", it: "+ Aggiungi riga di parole chiave" } as Record<FormLanguage, string>)[uiLanguage]}</button>}
        </section> : <FieldNote>{text.select}: {text.originalLanguage}</FieldNote>}
      </fieldset>

      <fieldset disabled={submitting} className="form-section form-step form-step--4">
        <legend className="sr-only">{steps[3].label}</legend>
        <label data-review-field="public-url"><FieldTitle icon="link">{text.publicLink}</FieldTitle><input required type="url" pattern="https://.*" value={draft.publicWorkUrl} onChange={(e) => set("publicWorkUrl", e.target.value)} placeholder="https://..." /></label>
        <div className="public-link-guidance"><FieldNote>{formFieldHints[uiLanguage].publicResource} {text.noPdf}<br />{text.linkNote}<br /><Link className="public-link-guidance__guide" href="/ajuda/artigos/compartilhar-link-publico" target="_blank" rel="noopener noreferrer"><AppIcon name="external" />{text.guide}</Link></FieldNote></div>
        <div className="declarations">
          <label className="check" data-review-field="declaration-approved"><input required type="checkbox" checked={draft.defendedAndApproved} onChange={(e) => set("defendedAndApproved", e.target.checked)} /> {text.declarations[0]}</label>
          <label className="check" data-review-field="declaration-file"><input required type="checkbox" checked={draft.finalFileConfirmed} onChange={(e) => set("finalFileConfirmed", e.target.checked)} /> {text.declarations[1]}</label>
          <label className="check" data-review-field="declaration-approval"><input required type="checkbox" checked={draft.approvalPageConfirmed} onChange={(e) => set("approvalPageConfirmed", e.target.checked)} /> {text.declarations[2]}</label>
          <label className="check" data-review-field="declaration-shared-file"><input required type="checkbox" checked={draft.sharedFileUnchangedConfirmed} onChange={(e) => set("sharedFileUnchangedConfirmed", e.target.checked)} /> {sharedFileDeclarationCopy[uiLanguage].declaration}</label>
          <label className="check declaration-cancellation" data-review-field="declaration-cancellation"><input required type="checkbox" checked={draft.cancellationAcknowledged} onChange={(e) => set("cancellationAcknowledged", e.target.checked)} /><strong>{cancellationAcknowledgementCopy[uiLanguage].declaration}</strong></label>
        </div>
        <label data-review-field="library-note"><FieldTitle icon="document">{text.libraryNote}</FieldTitle><textarea maxLength={2000} rows={4} value={draft.libraryNote} onChange={(e) => set("libraryNote", e.target.value)} placeholder={text.optional} /></label>
      </fieldset>

      <section className="form-section form-step form-step--5 review-panel" aria-label={text.review}><ReviewSummary items={reviewItems} onNavigate={jumpToField} text={text} subtitleNeedsReview={subtitleNeedsReview} subtitleIsGerman={draft.originalLanguage === "de"} /></section>
      <nav className="request-analysis-sections__toolbar student-form-toolbar" aria-label={uiText(interfaceLanguage, "Navegação entre etapas da solicitação")}>
        <span>{uiLanguage === "pt" ? `Etapa ${activeStep} de ${steps.length}` : `${activeStep} / ${steps.length}`}</span>
        <div>
          {activeStep > 1 && <button disabled={submitting} className="request-analysis-sections__previous" type="button" onClick={() => navigateStep(activeStep - 1)}><AppIcon name="arrowRight" />{text.back}: {steps[activeStep - 2].label}</button>}
          {activeStep < 5
            ? <button disabled={submitting} type="button" onClick={() => navigateStep(activeStep + 1)}>{text.next}: {steps[activeStep].label}<AppIcon name="arrowRight" /></button>
            : <button className="student-form-toolbar__submit" type="button" onClick={() => void submitRequest()} disabled={submitting || !submissionReady}><AppIcon name="upload" /><span>{submitting ? text.sending : text.send}{!submissionReady && <small>{text.fillPending}</small>}</span></button>}
        </div>
      </nav>
      {draftStorageError && <div className="draft-status draft-status--error" role="alert"><AppIcon name="help" /><div><strong>{guidanceFor(text).savingError}</strong></div></div>}
      {pendingFormLanguage && <OriginalLanguageDialog language={pendingFormLanguage} text={text} onCancel={() => setPendingFormLanguage(null)} onConfirm={() => { selectOriginalLanguage(pendingFormLanguage, true); setPendingFormLanguage(null); }} />}
    </form>
  );
}

function FieldTitle({ icon, children }: { icon: AppIconName; children: React.ReactNode }) {
  return <span className="request-field-title"><AppIcon name={icon} />{children}</span>;
}

const directNameHint: Record<FormLanguage, string> = { pt: "Use o nome na forma direta", en: "Use the name in natural order", es: "Use el nombre en orden directo", de: "Namen in direkter Reihenfolge", fr: "Saisissez le nom dans l’ordre direct", it: "Usa il nome nell’ordine diretto" };

function NameOrderHint({ text }: { text: Copy }) {
  return <span className="request-author-hint" role="status">
    <AppIcon name="close" /><span>{directNameHint[copyLanguage(text)]}<strong>Ana Maria de Souza</strong></span>
  </span>;
}

function DirectNameInput({ value, onChange, text, required = true, placeholder }: { value: string; onChange: (value: string) => void; text: Copy; required?: boolean; placeholder?: string }) {
  const [commaAttempted, setCommaAttempted] = useState(false);
  const warningTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (warningTimeout.current) clearTimeout(warningTimeout.current); }, []);
  const warn = () => {
    setCommaAttempted(true);
    if (warningTimeout.current) clearTimeout(warningTimeout.current);
    warningTimeout.current = setTimeout(() => setCommaAttempted(false), 5000);
  };
  return <span className="request-author-input"><input required={required} minLength={3} maxLength={300} placeholder={placeholder} value={value} onKeyDown={(event) => { if (event.key === ",") { event.preventDefault(); warn(); } }} onChange={(event) => { if ((event.target.value.match(/,/g)?.length ?? 0) > (value.match(/,/g)?.length ?? 0)) { warn(); return; } onChange(event.target.value); }} />{(commaAttempted || value.includes(",")) && <NameOrderHint text={text} />}</span>;
}

function AuthorFields({ values, onChange, text, maxAuthors }: { values: string[]; onChange: (authors: string[], resetSelection?: boolean) => void; text: Copy; maxAuthors?: number }) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const move = (from: number, to: number) => { if (from === to) return; const next = [...values]; const [author] = next.splice(from, 1); next.splice(to, 0, author); onChange(next, true); };
  return <section className="dynamic-fields"><FieldTitle icon="person">{text.nameDirectExample}</FieldTitle><FieldNote>{text.raueOrder}</FieldNote>{maxAuthors === 3 && <FieldNote>{uiText(copyLanguage(text), "O TFG admite no máximo três autores.")}</FieldNote>}{values.map((value, index) => <div className="dynamic-field dynamic-field--draggable" key={index} draggable onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex !== null) move(draggedIndex, index); setDraggedIndex(null); }}><OrderControls index={index} count={values.length} onMove={move} text={text} /><label data-review-field={`author-${index}`}><FieldTitle icon="person">{text.authorNumber.replace("{number}", String(index + 1))}</FieldTitle><DirectNameInput value={value} onChange={(name) => onChange(values.map((author, position) => position === index ? name : author))} text={text} /></label>{values.length > 1 && <button type="button" className="text-button text-button--remove" onClick={() => onChange(values.filter((_, position) => position !== index), true)}>{text.remove}</button>}</div>)}<button type="button" className="add-field" disabled={maxAuthors !== undefined && values.length >= maxAuthors} onClick={() => { if (maxAuthors === undefined || values.length < maxAuthors) onChange([...values, ""], true); }}>{text.addAuthor}</button></section>;
}

function CommitteeFields({ values, hasCoadvisor, onChange, text }: { values: string[]; hasCoadvisor: boolean; onChange: (members: string[]) => void; text: Copy }) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const firstMemberPosition = hasCoadvisor ? 3 : 2;
  const move = (from: number, to: number) => { if (from === to) return; const next = [...values]; const [member] = next.splice(from, 1); next.splice(to, 0, member); onChange(next); };
  return <section className="dynamic-fields committee-fields"><FieldTitle icon="account">{text.committee}</FieldTitle><p className="field-help"><AppIcon name="help" /><span>{guidanceFor(text).committeeNote}</span></p>{values.map((value, index) => <div className="dynamic-field dynamic-field--draggable" key={index} draggable onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex !== null) move(draggedIndex, index); setDraggedIndex(null); }}><OrderControls index={index} count={values.length} onMove={move} text={text} /><label data-review-field={`committee-${index}`}><FieldTitle icon="person">{guidanceFor(text).memberPosition.replace("{number}", String(firstMemberPosition + index))}</FieldTitle><DirectNameInput value={value} onChange={(name) => onChange(values.map((member, position) => position === index ? name : member))} text={text} required={false} /></label><button type="button" className="text-button text-button--remove" onClick={() => onChange(values.filter((_, position) => position !== index))}>{text.remove}</button></div>)}<button type="button" className="add-field" onClick={() => onChange([...values, ""])}>{text.addCommitteeMember}</button></section>;
}

type TitleLanguage = "pt" | "en" | "es" | "de" | "fr" | "it";
type KeywordKey = "keywordsPt" | "keywordsEn" | "keywordsOriginal" | "keywordsAdditional";
function keywordColumns(draft: StudentRequestDraft): { language: RequestLanguage; key: KeywordKey }[] {
  const additional = additionalEquivalentLanguage(draft);
  const languages: RequestLanguage[] = [draft.originalLanguage, ...requiredEquivalentLanguages(draft.originalLanguage), ...(additional ? [additional] : [])];
  return languages.map((language) => ({ language, key: language === "pt" ? "keywordsPt" : language === "en" ? "keywordsEn" : language === draft.originalLanguage ? "keywordsOriginal" : "keywordsAdditional" }));
}
function OriginalLanguageField({ draft, text, onLanguageChange }: { draft: StudentRequestDraft; text: Copy; onLanguageChange: (language: FormLanguage) => void }) {
  const languages: TitleLanguage[] = ["en", "es", "de", "fr", "it"];
  return <label className="original-language-first" data-review-field="original-language"><FieldTitle icon="book">{text.originalLanguage}</FieldTitle><select required value={draft.originalLanguageSelected ? draft.originalLanguage : ""} onChange={(event) => onLanguageChange(event.target.value as FormLanguage)}><option value="">{text.select}</option><option value="pt">{languageOptionName("pt", text)}</option>{languages.map((language) => <option key={language} value={language}>{languageOptionName(language, text)}</option>)}</select></label>;
}

function EquivalentTitlesFields({ draft, onChange, text }: { draft: StudentRequestDraft; onChange: (titles: StudentRequestDraft["equivalentTitles"]) => void; text: Copy }) {
  const required = requiredEquivalentLanguages(draft.originalLanguage);
  const guidance = {
    pt: { note: "Preencha o título e, se houver, o subtítulo no idioma indicado em cada campo. Os idiomas obrigatórios são fixos; para incluir outro idioma, use o botão abaixo.", fixed: (equivalent: string, original: string) => `${equivalent} selecionado automaticamente pelo sistema porque você selecionou ${original} como idioma original do trabalho.` },
    en: { note: "Enter the title and subtitle, if any, in the language shown for each field. Required languages are fixed; use the button below to add another language.", fixed: (equivalent: string, original: string) => `${equivalent} was selected automatically because you chose ${original} as the original language of the work.` },
    es: { note: "Escriba el título y, si lo hay, el subtítulo en el idioma indicado en cada campo. Los idiomas obligatorios son fijos; use el botón de abajo para añadir otro.", fixed: (equivalent: string, original: string) => `${equivalent} se seleccionó automáticamente porque eligió ${original} como idioma original del trabajo.` },
    de: { note: "Geben Sie Titel und gegebenenfalls Untertitel in der angegebenen Sprache ein. Die Pflichtsprachen sind festgelegt; mit der Schaltfläche unten können Sie eine weitere Sprache hinzufügen.", fixed: (equivalent: string, original: string) => `${equivalent} wurde automatisch ausgewählt, weil Sie ${original} als Originalsprache der Arbeit gewählt haben.` },
    fr: { note: "Saisissez le titre et, le cas échéant, le sous-titre dans la langue indiquée pour chaque champ. Les langues obligatoires sont fixes ; utilisez le bouton ci-dessous pour en ajouter une autre.", fixed: (equivalent: string, original: string) => `${equivalent} a été sélectionné automatiquement parce que vous avez choisi ${original} comme langue originale du travail.` },
    it: { note: "Inserisci il titolo e, se presente, il sottotitolo nella lingua indicata per ogni campo. Le lingue obbligatorie sono fisse; usa il pulsante qui sotto per aggiungerne un'altra.", fixed: (equivalent: string, original: string) => `${equivalent} è stato selezionato automaticamente perché hai scelto ${original} come lingua originale del lavoro.` },
  }[copyLanguage(text)];
  const languages: TitleLanguage[] = ["pt", "en", "es", "de", "fr", "it"];
  const titles = draft.equivalentTitles;
  const available = (index: number) => languages.filter((language) => language !== draft.originalLanguage && !required.includes(language) && (language === titles[index]?.language || !titles.some((item) => item.language === language)));
  const update = (index: number, patch: Partial<StudentRequestDraft["equivalentTitles"][number]>) => onChange(titles.map((item, position) => position === index ? { ...item, ...patch } : item));
  return <section className="equivalent-titles">
    <div className="equivalent-titles__heading"><strong><FieldTitle icon="document">{text.titleEquivalents}</FieldTitle></strong><p>{guidance.note}</p></div>
    {titles.map((item, index) => {
      const fixedExplanation = index < required.length ? guidance.fixed(languageOptionName(required[index], text), languageOptionName(draft.originalLanguage, text)) : "";
      return <div className="form-row equivalent-title-row" key={`${item.language}-${index}`}>
        <label data-review-field={`title-equivalent-${item.language || "missing"}`}><span className="equivalent-title-language-label"><FieldTitle icon="book">{guidanceFor(text).equivalentLanguage}</FieldTitle>{fixedExplanation && <span className="tooltip" tabIndex={0} aria-label={fixedExplanation}>i<span role="tooltip">{fixedExplanation}</span></span>}</span>{index < required.length ? <input className="equivalent-title-fixed-input" value={languageOptionName(required[index], text)} readOnly aria-label={languageOptionName(required[index], text)} /> : <select required value={item.language} onChange={(event) => update(index, { language: event.target.value as StudentRequestDraft["equivalentTitles"][number]["language"] })}><option value="">{text.select}</option>{available(index).map((language) => <option key={language} value={language}>{languageOptionName(language, text)}</option>)}</select>}</label>
        <label data-review-field={`title-equivalent-${item.language}`}><FieldTitle icon="document">{item.language ? formFieldHints[copyLanguage(text)].equivalentTitle(languageName(item.language, text)) : text.titleEquivalents}</FieldTitle><input required minLength={3} maxLength={500} value={item.title} onChange={(event) => update(index, { title: event.target.value })} placeholder={guidanceFor(text).equivalentPlaceholder} /></label>
        {titles.length > required.length && index >= required.length && <button className="text-button text-button--remove" type="button" onClick={() => onChange(titles.filter((_, position) => position !== index))}>{text.remove}</button>}
      </div>;
    })}
    {titles.length < required.length + 1 && available(titles.length).length > 0 && <button className="add-field" type="button" onClick={() => onChange([...titles, { language: "", title: "" }])}>{text.addEquivalentTitle}</button>}
  </section>;
}

type ReviewItem = { label: string; step: number; field: string; optional?: boolean; value?: string; issue?: string; valid: boolean };
function validWorkDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1900 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function getReviewItems(draft: StudentRequestDraft, programs: Program[], text: Copy): ReviewItem[] {
  const program = programs.find((item) => item.id === draft.academicProgramId);
  const requiredLanguages = requiredEquivalentLanguages(draft.originalLanguage);
  const columns = keywordColumns(draft);
  const pairCount = Math.max(3, ...columns.map((column) => draft[column.key].length));
  const validName = (value: string) => value.trim().length >= 3 && value.trim().length <= 300;
  const validTitle = (value: string) => value.trim().length >= 3 && value.trim().length <= 500;
  const requiredKeywords = (values: string[], language: RequestLanguage) => Array.from({ length: pairCount }, (_, index) => {
    const term = values[index]?.trim() ?? "";
    const duplicate = Boolean(term) && values.findIndex((value) => value.trim().toLocaleLowerCase() === term.toLocaleLowerCase()) !== index;
    return { label: text.keywordNumber.replace("{number}", String(index + 1)).replace("{language}", languageName(language, text)), step: 3, field: `keyword-${language}-${index}`, valid: term.length >= 2 && term.length <= 100 && !duplicate, issue: duplicate ? guidanceFor(text).duplicateTerm : undefined };
  });
  const items: ReviewItem[] = [
    ...(program?.code === "architecture-urbanism-undergraduate" && draft.people.additionalAuthors.length > 2 ? [{ label: uiText(copyLanguage(text), "TFG: informe no máximo três autores."), step: 2, field: "author-2", valid: false }] : []),
    { label: text.programName, step: 1, field: "program", valid: Boolean(program) },
    { label: text.registration, step: 1, field: "registration", valid: /^[0-9]{3,30}$/.test(draft.registrationNumber.trim()) },
    ...((["athdc-specialization", "architecture-urbanism-undergraduate"].includes(program?.code ?? "") ? [draft.people.author, ...draft.people.additionalAuthors] : [draft.people.author]).map((author, index) => ({ label: ["athdc-specialization", "architecture-urbanism-undergraduate"].includes(program?.code ?? "") ? text.authorNumber.replace("{number}", String(index + 1)) : text.author, step: 2, field: ["athdc-specialization", "architecture-urbanism-undergraduate"].includes(program?.code ?? "") ? `author-${index}` : "author", valid: validName(author) }))),
    { label: text.titleOriginal, step: 2, field: "title", valid: validTitle(draft.title) },
    { label: text.originalLanguage, step: 2, field: "original-language", valid: draft.originalLanguageSelected },
    ...requiredLanguages.filter((language) => !draft.equivalentTitles.some((item) => item.language === language)).map((language) => ({ label: `${text.titleEquivalentRequired}: ${languageName(language, text)}`, step: 2, field: draft.originalLanguageSelected ? "title-equivalent-missing" : "original-language", valid: false })),
    { label: text.advisorReview, step: 2, field: "advisor", valid: validName(draft.people.advisor) },
    { label: text.coadvisorReview, step: 2, field: "coadvisor", optional: true, valid: !draft.people.coadvisor.trim() || validName(draft.people.coadvisor) },
    { label: text.subtitle, step: 2, field: "subtitle", optional: true, valid: draft.subtitle.length <= 500 },
    ...draft.equivalentTitles.map((item) => ({ label: item.language ? formFieldHints[copyLanguage(text)].equivalentTitle(languageName(item.language, text)) : text.titleEquivalents, step: 2, field: `title-equivalent-${item.language}`, valid: Boolean(item.language) && validTitle(item.title) && item.language !== draft.originalLanguage && draft.equivalentTitles.filter((other) => other.language === item.language).length === 1 })),
    { label: text.birthAckReview, step: 2, field: "birth-year-acknowledgement", optional: true, valid: true },
    ...(["athdc-specialization", "architecture-urbanism-undergraduate"].includes(program?.code ?? "") && draft.people.additionalAuthors.length > 0 && draft.people.birthYearAcknowledged ? [{ label: requesterAuthorCopy[copyLanguage(text)].label, step: 2, field: "birth-year-author", valid: draft.people.birthYearAuthorIndex !== null && draft.people.birthYearAuthorIndex >= 0 && draft.people.birthYearAuthorIndex <= draft.people.additionalAuthors.length }] : []),
    ...draft.people.committeeMembers.map((member, index) => ({ label: guidanceFor(text).memberPosition.replace("{number}", String(index + (draft.people.coadvisor.trim() ? 3 : 2))), step: 2, field: `committee-${index}`, optional: true, valid: !member.trim() || validName(member) })),
    ...Array.from({ length: pairCount }, (_, index) => columns.map((column) => requiredKeywords(draft[column.key], column.language)[index])).flat(),
    ...(pairCount > 5 ? [{ label: ({ pt: "Remova as linhas extras: o máximo é cinco.", en: "Remove extra rows: the maximum is five.", es: "Elimine las filas adicionales: el máximo es cinco.", de: "Entfernen Sie zusätzliche Zeilen: maximal fünf sind erlaubt.", fr: "Supprimez les lignes supplémentaires : le maximum est de cinq.", it: "Rimuovi le righe in più: il massimo è cinque." } as Record<FormLanguage, string>)[copyLanguage(text)], step: 3, field: `keyword-${columns[0].language}-5`, valid: false }] : []),
    { label: text.publicHttps, step: 4, field: "public-url", valid: isPublicWorkUrlCandidate(draft.publicWorkUrl), issue: formFieldHints[copyLanguage(text)].publicResource },
    { label: dateFieldCopy[copyLanguage(text)].deposit, step: 2, field: "deposit-year", valid: validWorkDate(draft.depositDate) },
    { label: program?.work_type === "thesis" || program?.work_type === "dissertation" ? dateFieldCopy[copyLanguage(text)].defense : dateFieldCopy[copyLanguage(text)].presentation, step: 2, field: "defense-year", valid: validWorkDate(draft.defenseDate) && validWorkDate(draft.depositDate) && draft.defenseDate <= draft.depositDate },
    { label: text.pageOrVolumeReview, step: 2, field: "extent", valid: program?.code === "mp-cecre-master" ? ["2", "3"].includes(draft.extentCount) : /^\d+$/.test(draft.extentCount) && Number(draft.extentCount) >= 1 && Number(draft.extentCount) <= 99999 },
    { label: text.illustrationsReview, step: 2, field: "illustrations", valid: ["yes", "no"].includes(draft.hasIllustrations) },
    ...draft.specialCases.map((specialCase) => ({ label: specialCase === "cotutelle" ? text.cotutelle : text.doubleDegree, step: 2, field: `special-case-${specialCase}`, valid: true })),
    { label: text.libraryNote, step: 4, field: "library-note", optional: true, valid: draft.libraryNote.length <= 2000 },
    ...text.declarationReview.map((label, index) => ({ label, step: 4, field: ["declaration-approved", "declaration-file", "declaration-approval"][index], valid: [draft.defendedAndApproved, draft.finalFileConfirmed, draft.approvalPageConfirmed][index] })),
    { label: sharedFileDeclarationCopy[copyLanguage(text)].review, step: 4, field: "declaration-shared-file", valid: draft.sharedFileUnchangedConfirmed },
    { label: cancellationAcknowledgementCopy[copyLanguage(text)].review, step: 4, field: "declaration-cancellation", valid: draft.cancellationAcknowledged },
  ];
  const values: Record<string, string> = {
    program: program?.name ?? "", registration: draft.registrationNumber,
    author: draft.people.author, title: draft.title, subtitle: draft.subtitle,
    "original-language": draft.originalLanguageSelected ? languageName(draft.originalLanguage, text) : "", advisor: draft.people.advisor,
    coadvisor: draft.people.coadvisor, "library-note": draft.libraryNote,
    "public-url": draft.publicWorkUrl, "deposit-year": draft.depositDate,
    "defense-year": draft.defenseDate, extent: draft.extentCount,
    illustrations: draft.hasIllustrations === "yes" ? text.yes : draft.hasIllustrations === "no" ? text.no : "",
    "birth-year-acknowledgement": draft.people.birthYearAcknowledged ? text.yes : "",
    "birth-year-author": draft.people.birthYearAuthorIndex === null ? "" : [draft.people.author, ...draft.people.additionalAuthors][draft.people.birthYearAuthorIndex] ?? "",
    "declaration-approved": draft.defendedAndApproved ? text.yes : "",
    "declaration-file": draft.finalFileConfirmed ? text.yes : "",
    "declaration-approval": draft.approvalPageConfirmed ? text.yes : "",
    "declaration-shared-file": draft.sharedFileUnchangedConfirmed ? text.yes : "",
    "declaration-cancellation": draft.cancellationAcknowledged ? text.yes : "",
  };
  draft.specialCases.forEach((specialCase) => { values[`special-case-${specialCase}`] = text.yes; });
  [draft.people.author, ...draft.people.additionalAuthors].forEach((name, index) => { values[`author-${index}`] = name; });
  draft.people.committeeMembers.forEach((name, index) => { values[`committee-${index}`] = name; });
  draft.equivalentTitles.forEach((item) => { values[`title-equivalent-${item.language}`] = item.title; });
  columns.forEach((column) => draft[column.key].forEach((term, index) => { values[`keyword-${column.language}-${index}`] = term; }));
  return items.map((item) => ({ ...item, value: values[item.field] }));
}

export function isStudentDraftComplete(draft: StudentRequestDraft, programs: Program[]) {
  return getReviewItems(draft, programs, uiCopy.pt).every((item) => item.valid);
}

export function StudentDraftSummary({ programs, userId, emptyMessage, preview = false, previewHref = "/painel/visao-estudante?tela=solicitacao" }: { programs: Program[]; userId: string; emptyMessage?: string; preview?: boolean; previewHref?: string }) {
  const [draft, setDraft] = useState<StudentRequestDraft | null>(null);
  const draftKey = studentRequestDraftKey(userId);
  const [ready, setReady] = useState(false);
  const { language } = useInterfaceLanguage();

  useEffect(() => {
    if (preview) {
      try {
        const stored = sessionStorage.getItem(studentPreviewDraftKey);
        if (stored) { const parsed = JSON.parse(stored); setDraft(restoreStudentRequestDraft(parsed.draft ?? parsed)); }
      } catch { /* O resumo fictício permanece vazio. */ }
      setReady(true);
      return;
    }
    let active = true;
    const loadDraft = async () => {
      try {
        const { data, error } = await createClient().from("student_request_drafts").select("payload,updated_at").eq("user_id", userId).maybeSingle();
        if (error) throw error;
        const stored = localStorage.getItem(draftKey);
        const local = stored ? JSON.parse(stored) : null;
        const parsed = local && (!data || Date.parse(local.savedAt ?? "") > Date.parse(data.updated_at)) ? local : data?.payload;
        if (active) setDraft(parsed ? restoreStudentRequestDraft(parsed.draft ?? parsed) : null);
      } catch { /* Um rascunho indisponível não impede o acesso ao painel. */ }
      finally { if (active) setReady(true); }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === draftKey) void loadDraft(); };
    void loadDraft();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", loadDraft);
    return () => { active = false; window.removeEventListener("storage", onStorage); window.removeEventListener("focus", loadDraft); };
  }, [draftKey, userId, preview]);

  if (!ready) return null;
  if (!draft) return emptyMessage ? <p>{emptyMessage}</p> : null;
  const text = uiCopy[language] as Copy;
  const labels = {
    pt: ["Rascunho em andamento", "preenchidos", "pendentes", "com erro", "Preenchido", "Pendente", "Com erro"],
    en: ["Draft in progress", "completed", "pending", "with errors", "Completed", "Pending", "Error"],
    es: ["Borrador en curso", "completados", "pendientes", "con error", "Completado", "Pendiente", "Error"],
    de: ["Entwurf in Bearbeitung", "ausgefüllt", "offen", "mit Fehler", "Ausgefüllt", "Offen", "Fehler"],
    fr: ["Brouillon en cours", "remplis", "en attente", "avec erreur", "Rempli", "En attente", "Erreur"],
    it: ["Bozza in corso", "compilati", "in sospeso", "con errore", "Compilato", "In sospeso", "Errore"],
  }[language];
  const reviewItems = getReviewItems(draft, programs, text);
  const complete = reviewItems.every((item) => item.valid);
  const items = reviewItems.filter((item) => !item.optional || item.value?.trim());
  const categories = [1, 2, 3, 4].map((step) => {
    const fields = items.filter((item) => item.step === step);
    return {
      step,
      label: text.steps[step - 1],
      fields,
      filled: fields.filter((item) => item.valid).length,
      pending: fields.filter((item) => !item.valid && !item.value?.trim()).length,
      errors: fields.filter((item) => !item.valid && item.value?.trim()).length,
    };
  });
  return <section className="student-draft-summary" aria-label={labels[0]}>
    <div className="student-draft-summary__heading"><AppIcon name="document" /><strong>{labels[0]}</strong></div>
    <DraftProgress items={reviewItems} language={language} reviewHref={preview ? previewHref : "/painel/solicitacao/nova?revisao=1"} />
    {!complete && <div className="student-draft-summary__categories">{categories.map((category) => <details key={category.step} className="student-draft-summary__category">
      <summary><span>{category.label}</span><small>{category.filled} {labels[1]} · {category.pending} {labels[2]}{category.errors ? ` · ${category.errors} ${labels[3]}` : ""}</small></summary>
      <ul>{category.fields.map((item, index) => {
        const status = item.valid ? labels[4] : item.value?.trim() ? labels[6] : labels[5];
        return <li key={`${item.field}-${index}`} className={`student-draft-summary__field student-draft-summary__field--${item.valid ? "filled" : item.value?.trim() ? "error" : "pending"}`}><span>{item.label}</span><strong>{status}</strong></li>;
      })}</ul>
    </details>)}</div>}
  </section>;
}

function DraftProgress({ items, language, onReview, reviewHref }: { items: ReviewItem[]; language: FormLanguage; onReview?: () => void; reviewHref?: string }) {
  const relevant = new Map<string, ReviewItem>();
  for (const item of items) {
    if (item.optional && item.valid) continue;
    const key = `${item.step}:${item.field}`;
    if (!relevant.has(key) || !item.valid) relevant.set(key, item);
  }
  const fields = [...relevant.values()];
  const completed = fields.filter((item) => item.valid).length;
  const complete = items.every((item) => item.valid);
  const percent = complete ? 100 : fields.length ? Math.min(99, Math.round(completed / fields.length * 100)) : 0;
  const copy = {
    pt: ["Preenchimento", "concluído", "restante"], en: ["Completion", "complete", "remaining"],
    es: ["Progreso", "completado", "restante"], de: ["Fortschritt", "abgeschlossen", "verbleibend"],
    fr: ["Progression", "terminé", "restant"], it: ["Avanzamento", "completato", "rimanente"],
  }[language];
  const reviewLabel = { pt: "Ir para a revisão final", en: "Go to final review", es: "Ir a la revisión final", de: "Zur abschließenden Prüfung", fr: "Passer à la vérification finale", it: "Vai alla revisione finale" }[language];
  const content = <><span className="student-draft-progress__label"><strong>{copy[0]}</strong><span>{percent}% {copy[1]} · {100 - percent}% {copy[2]}</span></span><progress max={100} value={percent} aria-label={copy[0]}>{percent}%</progress>{complete && (reviewHref || onReview) && <span className="student-draft-progress__cta"><AppIcon name="arrowRight" />{reviewLabel}</span>}</>;
  if (complete && reviewHref) return <Link className="student-draft-progress student-draft-progress--ready" href={reviewHref} aria-label={reviewLabel}>{content}</Link>;
  if (complete && onReview) return <button className="student-draft-progress student-draft-progress--ready" type="button" onClick={onReview} aria-label={reviewLabel}>{content}</button>;
  return <div className={`student-draft-progress${complete ? " student-draft-progress--complete" : ""}`}>{content}</div>;
}

function ReviewSummary({ items, onNavigate, text, subtitleNeedsReview = false, subtitleIsGerman = false }: { items: ReviewItem[]; onNavigate: (step: number, field: string) => void; text: Copy; subtitleNeedsReview?: boolean; subtitleIsGerman?: boolean }) {
  const grouping = [{ title: text.steps[0], step: 1 }, { title: text.steps[1], step: 2 }, { title: text.steps[2], step: 3 }, { title: text.steps[3], step: 4 }];
  const pendingGroups = grouping.map((group) => ({ ...group, fields: items.filter((item) => item.step === group.step && !item.valid) })).filter((group) => group.fields.length);
  const completedGroups = grouping.filter((group) => !pendingGroups.some((pending) => pending.step === group.step));
  const invalidCount = pendingGroups.reduce((count, group) => count + group.fields.length, 0);
  const copy = ({
    pt: { issues: "itens para resolver", stage: "etapa com pendências", stages: "etapas com pendências", pendingOne: "erro/pendência", pendingMany: "erros/pendências", completed: "Etapas prontas", revisit: "Revisar esta etapa", fix: "Ir ao campo", missing: "Preencha este campo.", invalid: "Confira a informação preenchida.", declaration: "Confirme esta declaração." },
    en: { issues: "items to resolve", stage: "step with pending items", stages: "steps with pending items", pendingOne: "error/pending", pendingMany: "errors/pending", completed: "Completed steps", revisit: "Review this step", fix: "Go to field", missing: "Fill in this field.", invalid: "Check the information entered.", declaration: "Confirm this statement." },
    es: { issues: "elementos por resolver", stage: "etapa con pendientes", stages: "etapas con pendientes", pendingOne: "error/pendencia", pendingMany: "errores/pendencias", completed: "Etapas completas", revisit: "Revisar esta etapa", fix: "Ir al campo", missing: "Complete este campo.", invalid: "Revise la información ingresada.", declaration: "Confirme esta declaración." },
    de: { issues: "Punkte zu bearbeiten", stage: "Schritt mit offenen Punkten", stages: "Schritte mit offenen Punkten", pendingOne: "Fehler/offen", pendingMany: "Fehler/offen", completed: "Abgeschlossene Schritte", revisit: "Diesen Schritt prüfen", fix: "Zum Feld", missing: "Füllen Sie dieses Feld aus.", invalid: "Prüfen Sie die eingegebene Angabe.", declaration: "Bestätigen Sie diese Erklärung." },
    fr: { issues: "éléments à corriger", stage: "étape avec des éléments en attente", stages: "étapes avec des éléments en attente", pendingOne: "erreur/à corriger", pendingMany: "erreurs/à corriger", completed: "Étapes terminées", revisit: "Revoir cette étape", fix: "Aller au champ", missing: "Remplissez ce champ.", invalid: "Vérifiez la saisie.", declaration: "Confirmez cette déclaration." },
    it: { issues: "elementi da risolvere", stage: "fase con elementi in sospeso", stages: "fasi con elementi in sospeso", pendingOne: "errore/in sospeso", pendingMany: "errori/in sospeso", completed: "Fasi completate", revisit: "Rivedi questa fase", fix: "Vai al campo", missing: "Compila questo campo.", invalid: "Controlla le informazioni inserite.", declaration: "Conferma questa dichiarazione." },
  } as const)[copyLanguage(text)];
  return <>
    <h2>{text.review}</h2>
    <div className={`review-action-summary review-action-summary--${invalidCount ? "pending" : "ok"}`} role="status">
      <span className="review-action-summary__icon"><AppIcon name={invalidCount ? "help" : "check"} /></span>
      <span className="review-action-summary__text"><strong>{invalidCount ? `${invalidCount} ${copy.issues}` : text.allValid}</strong>{invalidCount > 0 && <small>{pendingGroups.length} {pendingGroups.length === 1 ? copy.stage : copy.stages}</small>}</span>
    </div>
    {subtitleNeedsReview && <button className="subtitle-capitalization-warning subtitle-capitalization-warning--review" type="button" onClick={() => onNavigate(2, "subtitle")}><AppIcon name="help" /><span>{(subtitleIsGerman ? germanSubtitleCopy : subtitleCapitalizationCopy)[copyLanguage(text)].warning}</span><AppIcon name="arrowRight" /></button>}
    {pendingGroups.length > 0 && <div className="review-action-list" aria-label={text.pending}>{pendingGroups.map((group) => <section className="review-action-group" key={group.step}>
      <h3><AppIcon name={stepsIcon(group.step)} /><span>{group.title}</span><span className="request-step-status request-step-status--pending review-action-group__count" aria-label={`${group.fields.length} ${group.fields.length === 1 ? copy.pendingOne : copy.pendingMany}`}>{group.fields.length}<span className="request-step-status__detail" aria-hidden="true">{group.fields.length === 1 ? copy.pendingOne : copy.pendingMany}</span></span></h3>
      <div className="review-action-group__items">{group.fields.map((item, index) => <button type="button" key={`${item.field}-${index}`} className="review-action-item" onClick={() => onNavigate(item.step, item.field)}>
        <span className="review-action-item__content"><strong>{item.label}</strong><small className="review-action-item__issue">{item.issue || (item.field.startsWith("declaration") ? copy.declaration : item.value?.trim() ? copy.invalid : copy.missing)}</small></span>
        <span className="review-action-item__target">{copy.fix}<AppIcon name="arrowRight" /></span>
      </button>)}</div>
    </section>)}</div>}
    {completedGroups.length > 0 && <div className="review-completed-steps"><span>{copy.completed}</span><ul>{completedGroups.map((group) => {
      const filled = items.filter((item) => item.step === group.step && item.valid && item.value?.trim());
      return <li key={group.step}><details><summary><AppIcon name="check" /><span>{group.title}</span><AppIcon name="arrowRight" /></summary>
        <div className="review-completed-steps__content"><dl>{filled.map((item, index) => <div key={`${item.field}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
          <button type="button" onClick={() => onNavigate(group.step, filled[0]?.field ?? "")}>{copy.revisit}<AppIcon name="arrowRight" /></button>
        </div>
      </details></li>;
    })}</ul></div>}
  </>;
}

function OrderControls({ index, count, onMove, text }: { index: number; count: number; onMove: (from: number, to: number) => void; text: Copy }) {
  return <span className="order-controls"><button type="button" disabled={index === 0} aria-label={`${guidanceFor(text).moveUp}: ${index + 1}`} onClick={() => onMove(index, index - 1)}>↑</button><button type="button" disabled={index === count - 1} aria-label={`${guidanceFor(text).moveDown}: ${index + 1}`} onClick={() => onMove(index, index + 1)}>↓</button></span>;
}

function FieldNote({ children }: { children: React.ReactNode }) {
  return <p className="field-help"><AppIcon name="help" /><span>{children}</span></p>;
}

function FieldTooltip({ text }: { text: string }) {
  return <span className="tooltip" tabIndex={0} aria-label={text}>i<span role="tooltip">{text}</span></span>;
}

function OriginalLanguageDialog({ language, text, onCancel, onConfirm }: { language: FormLanguage; text: Copy; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const required = requiredEquivalentLanguages(language);
  const modalCopy = {
    pt: { intro: "Se você confirmar, estes serão os idiomas do título e do subtítulo, quando houver:", titles: "Título e subtítulo", review: "Confira o que já digitou. O texto não será traduzido automaticamente." },
    en: { intro: "If you confirm, these will be the languages for the title and subtitle, if any:", titles: "Title and subtitle", review: "Check what you have already entered. Your text will not be translated automatically." },
    es: { intro: "Si confirma, estos serán los idiomas del título y subtítulo, si lo hay:", titles: "Título y subtítulo", review: "Revise lo que ya escribió. El texto no se traducirá automáticamente." },
    de: { intro: "Wenn Sie bestätigen, gelten diese Sprachen für Titel und gegebenenfalls Untertitel:", titles: "Titel und Untertitel", review: "Prüfen Sie Ihre bisherigen Eingaben. Der Text wird nicht automatisch übersetzt." },
    fr: { intro: "Si vous confirmez, voici les langues du titre et du sous-titre, le cas échéant :", titles: "Titre et sous-titre", review: "Vérifiez ce que vous avez déjà saisi. Le texte ne sera pas traduit automatiquement." },
    it: { intro: "Se confermi, queste saranno le lingue del titolo e del sottotitolo, se presente:", titles: "Titolo e sottotitolo", review: "Controlla ciò che hai già inserito. Il testo non verrà tradotto automaticamente." },
  }[copyLanguage(text)];
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="original-language-dialog pronto-modal" aria-labelledby="original-language-dialog-title" onCancel={onCancel}>
    <ModalCloseButton onClick={onCancel} />
    <span className="language-modal__icon"><AppIcon name="help" /></span>
    <h2 id="original-language-dialog-title">{text.languageModalTitle.replace("{language}", languageName(language, text))}</h2>
    <p>{modalCopy.intro}</p>
    <div className="language-modal__requirements"><section><h3>{modalCopy.titles}</h3><p>{languageOptionName(language, text)} → {required.map((item) => languageOptionName(item, text)).join(" → ")}</p></section></div>
    <FieldNote>{modalCopy.review}</FieldNote>
    <div className="language-modal__actions"><button autoFocus type="button" className="button button--secondary" onClick={onCancel}>{guidanceFor(text).cancel}</button><button type="button" className="button button--primary" onClick={onConfirm}>{text.understand}</button></div>
  </dialog>;
}

function stepsIcon(step: number): AppIconName { return (["account", "document", "tag", "shield"] as AppIconName[])[step - 1]; }
