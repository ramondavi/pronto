import Link from "next/link";
import { AppIcon } from "@/components/app-icon";

export type RetrospectiveRequest = { id: string; protocol: string; title: string; status: string };
const labels: Record<string, string> = { submitted: "Aguardando análise da Biblioteca", in_review: "Em análise pela Biblioteca", changes_requested: "Ação da secretaria: corrigir dados", approved: "Ficha pronta: depositar e informar a URL", completed: "Publicação conferida · concluído", canceled: "Pedido cancelado" };

export function RetrospectiveOverview({ requests }: { requests: RetrospectiveRequest[] }) {
  const pending = requests.filter((request) => !["completed", "canceled"].includes(request.status)).length;
  return <main className="dashboard-main dashboard-main--narrow retrospective-overview">
    <div className="page-heading"><div><p className="eyebrow">Secretaria da RAU+E · Acesso provisório</p><h1><AppIcon className="panel-heading-icon" name="archive" /><span className="panel-heading-text"><span className="panel-heading-text__inner">Acervo retrospectivo</span></span></h1></div></div>
    <section className="panel retrospective-context"><h2>Uma solicitação para cada trabalho</h2><p>Este acesso permite solicitar fichas de trabalhos já defendidos em edições anteriores da residência. Você pode enviar vários pedidos e acompanhá-los nesta lista. O Nada Consta está dispensado.</p>
      <ol className="retrospective-context__steps"><li><strong>Envie os dados do trabalho.</strong> Informe os autores na ordem da folha de rosto e a matrícula do primeiro autor. Seu nome identifica a responsável pelo envio.</li><li><strong>Acompanhe a análise da Biblioteca.</strong> Se houver pedido de correção, abra o protocolo e ajuste os campos indicados.</li><li><strong>Receba a ficha e faça o depósito.</strong> Use o guia do RI/UFBA e informe a URL permanente no protocolo correspondente.</li></ol>
      <Link className="button button--primary button--with-icon" href="/painel/solicitacao/nova"><AppIcon name="document" />Solicitar ficha de outro trabalho</Link>
      <p className="field-help">Depois de todos os trabalhos publicados e conferidos, peça à Biblioteca o encerramento do acesso provisório. O histórico dos pedidos será preservado.</p>
    </section>
    <section className="panel student-request-history"><div><p className="eyebrow">Acompanhamento</p><h2>Trabalhos enviados</h2><p>{requests.length} pedidos · {pending} em andamento</p></div>{!requests.length ? <p>Nenhum trabalho enviado. Comece pelo botão “Solicitar ficha de outro trabalho”.</p> : <ul className="retrospective-overview__requests">{requests.map((request) => <li key={request.id}><div><Link href={`/painel/solicitacao?pedido=${request.id}`}><strong>{request.protocol}</strong> · {request.title}</Link></div><span className="request-status">{labels[request.status] ?? request.status}</span></li>)}</ul>}</section>
  </main>;
}
