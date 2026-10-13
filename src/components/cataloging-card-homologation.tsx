"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { AppIcon } from "@/components/app-icon";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";
import { showPanelChange } from "@/components/panel-change-toast";
import { A4_PAGE, drawCatalogingCard } from "@/domain/cataloging-card/pdf";
import type { CatalogingCardSnapshot } from "@/domain/cataloging-card/types";
import { createClient } from "@/lib/supabase/client";

export function CatalogingCardHomologation({ requestId, snapshot, homologatedAt, canHomologate, pendingReason, nadaConstaApproved }: {
  requestId: string;
  snapshot: CatalogingCardSnapshot;
  homologatedAt: string | null;
  canHomologate: boolean;
  pendingReason: string | null;
  nadaConstaApproved: boolean;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function homologate() {
    if (!canHomologate || busy) return;
    setBusy(true);
    setError("");
    try {
      const document = await PDFDocument.create();
      const page = document.addPage(A4_PAGE);
      const regular = await document.embedFont(StandardFonts.Helvetica);
      const bold = await document.embedFont(StandardFonts.HelveticaBold);
      drawCatalogingCard(page, snapshot, { regular, bold });
      const { error: homologationError } = await createClient().rpc("homologate_cataloging_card", { target_request_id: requestId });
      if (homologationError) throw homologationError;
      setConfirming(false);
      showPanelChange("Ficha homologada!", undefined, { celebration: true, guidance: nadaConstaApproved ? "A ficha será liberada ao estudante." : "A liberação aguardará a aprovação do Nada Consta." });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error && reason.message.includes("As notas excedem") ? reason.message : "Não foi possível homologar. Confira os dados, a referência e a conexão; depois tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return <section id="request-analysis-review-action" className="cataloging-homologation" aria-label="Homologação da ficha">
    <div className="cataloging-homologation__top">
      <div className="cataloging-homologation__decision">
        <div className="cataloging-homologation__heading"><AppIcon name={homologatedAt ? "check" : "review"} /><div><strong>{homologatedAt ? "Ficha homologada" : "Homologação da ficha"}</strong><p>{homologatedAt ? `Decisão registrada em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(homologatedAt))}.` : "Registre a versão da ficha aprovada pela biblioteca."}</p></div></div>
        {!homologatedAt && canHomologate && <label className="check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Conferi os nomes, a descrição física, os assuntos, a CDU, o Cutter e o conteúdo da ficha.</label>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <div className="cataloging-homologation__controls">
        <div className="cataloging-homologation__states" aria-label="Requisitos de liberação">
          <div className={homologatedAt ? "is-ready" : ""}><AppIcon name={homologatedAt ? "check" : "review"} /><span>Ficha</span><strong>{homologatedAt ? "Homologada" : "Por homologar"}</strong></div>
          <div className={nadaConstaApproved ? "is-ready" : ""}><AppIcon name={nadaConstaApproved ? "check" : "document"} /><span>Nada Consta</span><strong>{nadaConstaApproved ? "Aprovado" : "Por aprovar"}</strong></div>
        </div>
        {!homologatedAt && <button className="button button--primary cataloging-homologation__action" type="button" disabled={!canHomologate || !confirmed || busy} onClick={() => setConfirming(true)}><span><strong>{busy ? "Homologando…" : "Homologar ficha catalográfica"}</strong>{!canHomologate && pendingReason && <small className={pendingReason.startsWith("Complete os campos pendentes") ? "is-compact" : undefined}>{pendingReason}</small>}{canHomologate && !confirmed && <small>Confirme a revisão à esquerda.</small>}</span><AppIcon name={canHomologate ? "check" : "lock"} /></button>}
        <p className="cataloging-homologation__release">Liberação: ficha homologada + Nada Consta aprovado.</p>
      </div>
    </div>
    {confirming && <FinalDecisionDialog title="Homologar esta ficha?" description={nadaConstaApproved ? "A ficha será registrada como homologada e poderá ser liberada ao estudante." : "A ficha será registrada como homologada. A liberação ao estudante aguardará a aprovação do Nada Consta."} confirmLabel="Confirmar homologação" busy={busy} onCancel={() => setConfirming(false)} onConfirm={homologate} />}
  </section>;
}
