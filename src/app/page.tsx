import Link from "next/link";
import { IconBuildingArch } from "@tabler/icons-react";
import { HeroGeometry } from "@/components/hero-geometry";
import { AuthorityDiscoveryPanel } from "@/components/authority-discovery-panel";
import { AuthorityDiscoverySearch } from "@/components/authority-discovery-search";
import { HeroClassificationPhrase } from "@/components/hero-cdu-word";
import { HomeJourney } from "@/components/home-journey";
import { HomeSectionNavigation } from "@/components/home-section-navigation";
import { Notice } from "@/components/notice";
import { ClarityHeading } from "@/components/clarity-heading";
import { AnimatedSectionTitle } from "@/components/animated-section-title";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { formatLibraryHour, formatServiceDate, isCurrentServiceAnnouncement, isLibraryClosedNow, isLibraryClosureAnnouncement, libraryClosingTime, serviceDayKey } from "@/lib/service-announcements";
import { AppIcon } from "@/components/app-icon";
import { getPublishedKnowledge } from "@/lib/knowledge-service";
import { getInterfaceLanguage } from "@/lib/server-language";
import { homeCopy } from "@/lib/home-copy";
import { homeJourneyCopy } from "@/lib/home-journey-copy";
import { benefitIcons, homeBenefitsCopy } from "@/lib/home-benefits-copy";
import { uiText } from "@/lib/ui-text";
import { authorityDiscoveryCopy } from "@/lib/authority-discovery-copy";
import { authorityUsageCopy } from "@/lib/authority-usage-copy";
import { authorityPublicCopy } from "@/lib/authority-public-copy";

const catalogPhrases = {
  pt: "Fichas catalográficas",
  en: "Catalog Record",
  es: "fichas catalográficas",
  de: "Katalogeinträge",
  fr: "notices de catalogage",
  it: "schede catalografiche",
} as const;

const fallbackHomeFaqs = {
  pt: [["Quem pode usar o Pronto!?", "Estudantes da UFBA que precisam solicitar ficha catalográfica e realizar o autodepósito, além da equipe autorizada da BIB/FA."], ["O trabalho completo é enviado ao Pronto!?", "Não. O estudante informa um link público para análise e o PDF completo permanece no próprio dispositivo durante a mesclagem da ficha."], ["Quando posso baixar a ficha?", "Depois que a ficha for homologada pela biblioteca e o Nada Consta for aprovado."], ["Onde acompanho minha solicitação?", "No seu painel, você acompanha o andamento do pedido, lê as orientações da biblioteca e vê se precisa fazer algo."], ["Posso corrigir os dados depois de enviar?", "Se a biblioteca devolver a solicitação para correção, você pode ajustar os campos liberados no painel e enviar novamente."], ["Como faço o autodepósito?", "Após a liberação da ficha, confira no painel as orientações para seu curso e siga as etapas no Repositório Institucional da UFBA."]],
  en: [["Who can use Pronto!?", "UFBA students requesting a catalog record and completing self-deposit, as well as authorized BIB/FA staff."], ["Is the complete work uploaded to Pronto!?", "No. Students provide a public link for review. The complete PDF stays on their device while the catalog record is merged."], ["When can I download the catalog record?", "After library approval and Nada Consta validation."], ["Where can I track my request?", "In your dashboard, you can follow its progress, read the library's guidance, and see whether you need to take action."], ["Can I correct information after submitting?", "If the library returns your request for corrections, you can edit the available fields in your dashboard and submit it again."], ["How do I complete self-deposit?", "After your catalog record is released, check the guidance for your course in your dashboard and follow the steps in UFBA's Institutional Repository."]],
  es: [["¿Quién puede usar Pronto!?", "Estudiantes de la UFBA que solicitan una ficha catalográfica y realizan el autodepósito, además del personal autorizado de BIB/FA."], ["¿Se envía el trabajo completo a Pronto!?", "No. El estudiante facilita un enlace público para la revisión. El PDF completo permanece en su dispositivo durante la combinación con la ficha."], ["¿Cuándo puedo descargar la ficha?", "Después de la aprobación de la biblioteca y la validación del Nada Consta."], ["¿Dónde sigo mi solicitud?", "En tu panel puedes seguir el progreso, leer las orientaciones de la biblioteca y ver si necesitas realizar alguna acción."], ["¿Puedo corregir los datos después de enviarlos?", "Si la biblioteca devuelve la solicitud para corregirla, puedes modificar los campos habilitados en el panel y volver a enviarla."], ["¿Cómo hago el autodepósito?", "Después de la liberación de la ficha, consulta en el panel las orientaciones para tu curso y sigue los pasos en el Repositorio Institucional de la UFBA."]],
  de: [["Wer kann Pronto! nutzen?", "Studierende der UFBA, die einen Katalogeintrag beantragen und ihre Arbeit selbst einreichen, sowie autorisierte Mitarbeitende der BIB/FA."], ["Wird die vollständige Arbeit an Pronto! gesendet?", "Nein. Studierende geben einen öffentlichen Link zur Prüfung an. Die vollständige PDF bleibt beim Zusammenführen mit dem Katalogeintrag auf ihrem Gerät."], ["Wann kann ich den Katalogeintrag herunterladen?", "Nach Freigabe durch die Bibliothek und Bestätigung des Nada Consta."], ["Wo kann ich meinen Antrag verfolgen?", "Im Dashboard sehen Sie den Bearbeitungsstand, Hinweise der Bibliothek und ob Sie etwas unternehmen müssen."], ["Kann ich Angaben nach dem Absenden korrigieren?", "Wenn die Bibliothek den Antrag zur Korrektur zurückgibt, können Sie die freigegebenen Felder im Dashboard anpassen und erneut absenden."], ["Wie funktioniert die Selbsteinreichung?", "Nach Freigabe des Katalogeintrags finden Sie im Dashboard die Hinweise für Ihren Studiengang und folgen den Schritten im institutionellen Repositorium der UFBA."]],
  fr: [["Qui peut utiliser Pronto! ?", "Les étudiants de l’UFBA qui demandent une notice de catalogage et effectuent l’auto-dépôt, ainsi que le personnel autorisé de la BIB/FA."], ["Le travail complet est-il envoyé à Pronto! ?", "Non. L’étudiant fournit un lien public pour l’examen. Le PDF complet reste sur son appareil pendant l’assemblage avec la notice."], ["Quand puis-je télécharger la notice ?", "Après validation par la bibliothèque et confirmation du Nada Consta."], ["Où suivre ma demande ?", "Dans votre espace, vous pouvez suivre son avancement, lire les consignes de la bibliothèque et voir si une action est nécessaire."], ["Puis-je corriger les données après l’envoi ?", "Si la bibliothèque renvoie votre demande pour correction, vous pouvez modifier les champs autorisés dans votre espace et l’envoyer à nouveau."], ["Comment effectuer l’auto-dépôt ?", "Après la mise à disposition de la notice, consultez les consignes pour votre formation dans votre espace et suivez les étapes du dépôt institutionnel de l’UFBA."]],
  it: [["Chi può usare Pronto!?", "Gli studenti UFBA che richiedono una scheda catalografica ed effettuano l’autodeposito, oltre al personale autorizzato BIB/FA."], ["Il lavoro completo viene inviato a Pronto!?", "No. Lo studente fornisce un link pubblico per la revisione. Il PDF completo rimane sul suo dispositivo durante l’unione con la scheda."], ["Quando posso scaricare la scheda?", "Dopo l’approvazione della biblioteca e la convalida del Nada Consta."], ["Dove posso seguire la mia richiesta?", "Nel pannello puoi seguirne l'avanzamento, leggere le indicazioni della biblioteca e vedere se devi intervenire."], ["Posso correggere i dati dopo l’invio?", "Se la biblioteca restituisce la richiesta per correzioni, puoi modificare i campi abilitati nel pannello e inviarla di nuovo."], ["Come faccio l’autodeposito?", "Dopo il rilascio della scheda, consulta nel pannello le indicazioni per il tuo corso e segui i passaggi nel Repositorio istituzionale dell’UFBA."]],
};

export default async function HomePage() {
  const language = await getInterfaceLanguage();
  const t = homeCopy[language];
  const catalogPhrase = catalogPhrases[language];
  const catalogPosition = t.lead.indexOf(catalogPhrase);
  const benefits = homeBenefitsCopy[language];
  const discovery = authorityDiscoveryCopy[language];
  const usageCopy = authorityUsageCopy[language];
  const publicThemeCopy = authorityPublicCopy[language];
  const supabase = await createClient();
  const { data: usageData } = await supabase.rpc("list_public_authority_usage_summary");
  const mostUsed = Array.isArray(usageData) ? usageData as { id: string; label: string; count: number }[] : [];
  const { data: { user } } = await supabase.auth.getUser();
  const faqs = (await getPublishedKnowledge()).filter((entry) => entry.kind === "faq").map((entry) => {
    const legacyIndex = fallbackHomeFaqs.pt.findIndex(([question]) => question === entry.title);
    const translated = language === "pt" || legacyIndex < 0 ? null : fallbackHomeFaqs[language][legacyIndex];
    return { id: entry.id, question: translated?.[0] ?? entry.title, answer: translated?.[1] ?? entry.summary, featured_position: entry.featured_position };
  });
  const featuredFaqs = new Map(faqs.filter((faq) => faq.featured_position !== null).map((faq) => [faq.featured_position, faq]));
  const otherFaqs = faqs.filter((faq) => faq.featured_position === null);
  const homeFaqs = Array.from({ length: 6 }, (_, index) => featuredFaqs.get(index + 1) ?? otherFaqs.shift()).filter((faq): faq is (typeof faqs)[number] => Boolean(faq));
  if (homeFaqs.length === 0) homeFaqs.push(...fallbackHomeFaqs[language].map(([question, answer], index) => ({ id: `fallback-home-${index}`, question, answer, featured_position: index + 1 })));
  const now = new Date().toISOString();
  const [{ data: announcements }, { data: dailyHours }] = await Promise.all([
    supabase.from("library_announcements").select("title,message,type,starts_at,ends_at").eq("active", true).neq("type", "normal").lte("starts_at", now).order("starts_at", { ascending: false }).limit(100),
    supabase.from("library_daily_hours").select("closing_time").eq("service_date", serviceDayKey(now)).maybeSingle(),
  ]);
  const closingTime = libraryClosingTime(dailyHours?.closing_time);
  const currentAnnouncement = announcements?.find((announcement) => isCurrentServiceAnnouncement(announcement, now));
  const closureAnnouncement = announcements?.find((announcement) => isCurrentServiceAnnouncement(announcement, now) && isLibraryClosureAnnouncement(announcement));
  const closed = isLibraryClosedNow(now, closingTime) || closureAnnouncement ? { title: uiText(language, "Biblioteca fechada agora"), message: uiText(language, "Solicite a ficha ainda assim. Analisaremos no próximo dia útil"), reason: closureAnnouncement?.title } : null;
  return (
    <>
      <SiteHeader showServiceStatus={false} closingTimeOverride={closingTime} />
      <main>
        <HomeSectionNavigation />
        <div id="inicio" className="home-hero-landscape">
        <HeroGeometry />
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__content">
              <p className="eyebrow">Biblioteca da Faculdade de Arquitetura · UFBA</p>
              <p className="hero__lead">{catalogPosition < 0 ? t.lead : <><span className="sr-only">{t.lead}</span><span aria-hidden="true">{t.lead.slice(0, catalogPosition)}<HeroClassificationPhrase text={catalogPhrase} />{t.lead.slice(catalogPosition + catalogPhrase.length)}</span></>}</p>
              <p className="hero__description">{t.description}</p>
              {!user && <div className="actions" data-nosnippet><Link className="button button--primary button--with-icon" href="/entrar"><AppIcon name="account" />{t.signIn}</Link><Link className="button button--secondary button--with-icon" href="/cadastro"><AppIcon name="edit" />{t.register}</Link></div>}
            </div>
            <div className="hero__aside">
              <Notice announcement={currentAnnouncement} closed={closed} date={{ value: serviceDayKey(now), label: formatServiceDate(now, language) }} now={now} clockLabel={uiText(language, "Horário atual da biblioteca")} hoursLabel={dailyHours ? uiText(language, "Funcionamento hoje: 8h às {time}", { time: formatLibraryHour(closingTime) }) : uiText(language, "Funcionamento: seg. a sex., 8h às 21h")} mobileHoursLabel={!dailyHours && language === "pt" ? "Padrão: seg. a sex., 8h às 21h" : undefined} closingLabel={uiText(language, "Fechamento previsto hoje às {time}", { time: formatLibraryHour(closingTime) })} copy={t.notice} />
              <div className="requirements">
                <p className="eyebrow">{t.before}</p>
                <h2>{t.requirementTitle}</h2>
                <ul>{t.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <AuthorityDiscoveryPanel>
          <div className="container authority-discovery__inner">
            <AuthorityDiscoverySearch variant="home" />
            <div className="authority-discovery__heading">
              <span className="authority-discovery__mark" aria-hidden="true"><IconBuildingArch stroke={1.5} /></span>
              <p className="eyebrow">{discovery.eyebrow}</p>
              <h2 id="authority-discovery-title">{discovery.title}</h2>
              <div className="authority-discovery__heading-copy">
                <p>{discovery.intro}</p>
                <p className="authority-discovery__detail">{discovery.workExplanation}</p>
                <Link className="authority-discovery__area-link" href="/autoridades/explorar"><span>{publicThemeCopy.browse}</span><span aria-hidden="true">↗</span></Link>
              </div>
            </div>
            {mostUsed.length > 0 && <div className="authority-discovery__popular"><div><p className="eyebrow">{usageCopy.title}</p><p>{usageCopy.intro}</p></div><ol>{mostUsed.map((item) => <li key={item.id}><Link href={`/autoridades/${item.id}`}>{item.label}<span>{item.count} {usageCopy.count} ↗</span></Link></li>)}</ol></div>}
          </div>
        </AuthorityDiscoveryPanel>
        </div>

        <section id="como-funciona" className="section section--muted home-viewport-section">
          <div className="container">
            <p className="eyebrow">{t.how}</p>
            <ClarityHeading less={t.less} clearer={t.clearer} />
            <HomeJourney steps={t.steps} copy={homeJourneyCopy[language]} />
          </div>
        </section>

        <section id="vantagens" className="section home-benefits home-viewport-section" aria-labelledby="home-benefits-title">
          <div className="container">
            <header className="home-benefits__header">
              <div><p className="eyebrow">{benefits.eyebrow}</p><AnimatedSectionTitle title={benefits.title} id="home-benefits-title" theme="benefits" /></div>
              <p>{benefits.introduction}</p>
            </header>
            <div className="home-benefits__grid">
              {benefits.items.map((benefit, index) => <article className={`home-benefits__item${index === 0 ? " home-benefits__item--featured" : ""}`} key={benefit.title}>
                <div className="home-benefits__item-top"><span className="home-benefits__icon"><AppIcon name={benefitIcons[index]} /></span><span className="home-benefits__index">{String(index + 1).padStart(2, "0")}</span></div>
                <h3>{benefit.title}</h3><p>{benefit.description}</p>
              </article>)}
            </div>
          </div>
        </section>

        <section id="duvidas-frequentes" className="section home-faq home-viewport-section">
          <div className="container">
            <p className="eyebrow">{t.faq}</p>
            <AnimatedSectionTitle title={t.faqTitle} theme="faq" />
            <div className="home-faq__list">
              {homeFaqs.map((faq) => <article key={faq.id}><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
