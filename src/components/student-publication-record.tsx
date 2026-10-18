import { AppIcon } from "@/components/app-icon";

export function StudentPublicationRecord({ url, label }: { url?: string | null; label: (text: string) => string }) {
  return <section className="panel publication-record" aria-labelledby="student-publication-title">
    <div className="publication-record__heading"><span className="publication-record__icon"><AppIcon name="book" /></span><div><p className="eyebrow">{label("Publicação no RI/UFBA")}</p><h2 id="student-publication-title">{label("Seu trabalho no repositório")}</h2><p>{label("A biblioteca verificou a publicação e encerrou este protocolo.")}</p></div></div>
    {url ? <a className="button button--secondary button--with-icon publication-record__link" href={url} target="_blank" rel="noopener noreferrer"><AppIcon name="external" />{label("Abrir trabalho publicado no RI/UFBA")}</a> : <p className="publication-record__preview">{label("Na solicitação real, o endereço permanente do trabalho aparece aqui após a verificação pela biblioteca.")}</p>}
    <p className="publication-record__retention"><AppIcon name="shield" /><span>{label("O arquivo do Nada Consta será excluído após 60 dias; o registro da validação será preservado.")}</span></p>
  </section>;
}
