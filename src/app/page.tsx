import Link from "next/link";
import { HeroGeometry } from "@/components/hero-geometry";
import { HeroClassificationPhrase } from "@/components/hero-cdu-word";
import { HomeJourney } from "@/components/home-journey";
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

const catalogPhrases = {
  pt: "Fichas catalográficas",
  en: "Catalog Record",
  es: "fichas catalográficas",
  de: "Katalogeinträge",
  fr: "notices de catalogage",
  it: "schede catalografiche",
} as const;

const fallbackHomeFaqs = {
  pt: [["Quem pode usar o Pronto!?", "Estudantes da UFBA que precisam solicitar ficha catalográfica e realizar o autodepósito, além da equipe autorizada da BIB/FA."], ["O trabalho completo é enviado ao Pronto!?", "Não. O estudante informa um link público para análise e o PDF completo permanece no próprio dispositivo durante a mesclagem da ficha."], ["Quando posso baixar a ficha?", "Depois que a ficha for homologada pela biblioteca e o Nada Consta for aprovado."]],
  en: [["Who can use Pronto!?", "UFBA students requesting a catalog record and completing self-deposit, as well as authorized BIB/FA staff."], ["Is the complete work uploaded to Pronto!?", "No. Students provide a public link for review. The complete PDF stays on their device while the catalog record is merged."], ["When can I download the catalog record?", "After library approval and Nada Consta validation."]],
  es: [["¿Quién puede usar Pronto!?", "Estudiantes de la UFBA que solicitan una ficha catalográfica y realizan el autodepósito, además del personal autorizado de BIB/FA."], ["¿Se envía el trabajo completo a Pronto!?", "No. El estudiante facilita un enlace público para la revisión. El PDF completo permanece en su dispositivo durante la combinación con la ficha."], ["¿Cuándo puedo descargar la ficha?", "Después de la aprobación de la biblioteca y la validación del Nada Consta."]],
  de: [["Wer kann Pronto! nutzen?", "Studierende der UFBA, die einen Katalogeintrag beantragen und ihre Arbeit selbst einreichen, sowie autorisierte Mitarbeitende der BIB/FA."], ["Wird die vollständige Arbeit an Pronto! gesendet?", "Nein. Studierende geben einen öffentlichen Link zur Prüfung an. Die vollständige PDF bleibt beim Zusammenführen mit dem Katalogeintrag auf ihrem Gerät."], ["Wann kann ich den Katalogeintrag herunterladen?", "Nach Freigabe durch die Bibliothek und Bestätigung des Nada Consta."]],
  fr: [["Qui peut utiliser Pronto! ?", "Les étudiants de l’UFBA qui demandent une notice de catalogage et effectuent l’auto-dépôt, ainsi que le personnel autorisé de la BIB/FA."], ["Le travail complet est-il envoyé à Pronto! ?", "Non. L’étudiant fournit un lien public pour l’examen. Le PDF complet reste sur son appareil pendant l’assemblage avec la notice."], ["Quand puis-je télécharger la notice ?", "Après validation par la bibliothèque et confirmation du Nada Consta."]],
  it: [["Chi può usare Pronto!?", "Gli studenti UFBA che richiedono una scheda catalografica ed effettuano l’autodeposito, oltre al personale autorizzato BIB/FA."], ["Il lavoro completo viene inviato a Pronto!?", "No. Lo studente fornisce un link pubblico per la revisione. Il PDF completo rimane sul suo dispositivo durante l’unione con la scheda."], ["Quando posso scaricare la scheda?", "Dopo l’approvazione della biblioteca e la convalida del Nada Consta."]],
};

export default async function HomePage() {
  const language = await getInterfaceLanguage();
  const t = homeCopy[language];
  const catalogPhrase = catalogPhrases[language];
  const catalogPosition = t.lead.indexOf(catalogPhrase);
  const benefits = homeBenefitsCopy[language];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const faqs = (await getPublishedKnowledge()).filter((entry) => entry.kind === "faq").map((entry) => {
    const legacyIndex = fallbackHomeFaqs.pt.findIndex(([question]) => question === entry.title);
    const translated = language === "pt" || legacyIndex < 0 ? null : fallbackHomeFaqs[language][legacyIndex];
    return { id: entry.id, question: translated?.[0] ?? entry.title, answer: translated?.[1] ?? entry.summary, featured_position: entry.featured_position };
  });
  const featuredFaqs = faqs.filter((faq) => faq.featured_position !== null).sort((a, b) => (a.featured_position ?? 0) - (b.featured_position ?? 0));
  const homeFaqs = featuredFaqs.length ? featuredFaqs : faqs.length ? faqs.slice(0, 3) : fallbackHomeFaqs[language].map(([question, answer], index) => ({ id: `fallback-home-${index}`, question, answer }));
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
        <section className="hero">
          <HeroGeometry />
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

        <section id="como-funciona" className="section section--muted">
          <div className="container">
            <p className="eyebrow">{t.how}</p>
            <ClarityHeading less={t.less} clearer={t.clearer} />
            <HomeJourney steps={t.steps} copy={homeJourneyCopy[language]} />
          </div>
        </section>

        <section id="vantagens" className="section home-benefits" aria-labelledby="home-benefits-title">
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

        <section id="duvidas-frequentes" className="section home-faq">
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
