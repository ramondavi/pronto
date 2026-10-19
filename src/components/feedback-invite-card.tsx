import Link from "next/link";
import { FeedbackSparkles } from "@/components/feedback-sparkles";

export function FeedbackInviteCard({ href, request = false, label }: { href: string; request?: boolean; label: (text: string) => string }) {
  return <section className="feedback-invite panel">
    <FeedbackSparkles />
    <div>
      <p className="eyebrow">{label(request ? "Convite especial" : "Sua opinião faz diferença")}</p>
      <h2>{label(request ? "Ajude a melhorar o Pronto! e a BIB/FAUFBA" : "Como foi sua experiência com o Pronto!?")}</h2>
      <p>{label(request ? "Você concluiu todas as etapas. Conte como foi sua experiência em cerca de 3 minutos. Sua avaliação não altera o resultado do protocolo." : "Sua avaliação leva cerca de 3 minutos e ajuda a melhorar o sistema e o atendimento da BIB/FAUFBA.")}</p>
    </div>
    <Link className="button button--primary" href={href}>{label(request ? "Avaliar minha experiência" : "Responder avaliação")}</Link>
  </section>;
}
