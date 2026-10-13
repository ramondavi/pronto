"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "./app-icon";
import { showPanelChange } from "@/components/panel-change-toast";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function NadaConstaUpload({ requestId, document }: { requestId: string; document: { original_name: string; size_bytes: number; status: string; rejection_reason: string | null } | null }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!file || busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("requestId", requestId); form.set("file", file);
      const response = await fetch("/api/nada-consta", { method: "POST", body: form });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ? t(result.error) : t("Não foi possível enviar o documento.")); return; }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      showPanelChange(t("Nada Consta enviado"));
      router.refresh();
    } catch {
      setError(t("Não foi possível enviar o documento. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }
  const canUpload = !document || document.status === "rejected";
  const status = t(document?.status === "approved" ? "Documento validado" : document?.status === "pending" ? "Em conferência pela biblioteca" : "Envie um novo arquivo");
  return <section className="panel nada-consta-panel" aria-labelledby="nada-consta-title">
    <header className="nada-consta-heading"><span className="nada-consta-heading__icon"><AppIcon name="document" /></span><div><p className="eyebrow">{t("Próxima etapa do protocolo")}</p><h2 id="nada-consta-title">{t("Envio do Nada Consta")}</h2><p>{t("Assim que tiver o documento, envie o PDF por aqui. A biblioteca pode conferi-lo enquanto analisa seu trabalho.")}</p></div></header>
    <aside className="nada-consta-observation" aria-label={t("Antes de solicitar o Nada Consta")}><AppIcon name="help" /><div><strong>{t("Antes de solicitar o Nada Consta")}</strong><p>{t("Solicite o documento no")} <a className="public-link-guidance__guide nada-consta-observation__inline-link" href="https://pergamum.bib.ufba.br/" target="_blank" rel="noopener noreferrer"><AppIcon name="external" />Meu Pergamum</a>. {t("É preciso estar sem pendências com as bibliotecas da UFBA. Após a emissão, seu cadastro nas bibliotecas é encerrado, inclusive para empréstimos; por isso, faça a solicitação quando estiver concluindo o curso.")}</p><Link className="public-link-guidance__guide" href="/ajuda/artigos/emitir-nada-consta" target="_blank" rel="noopener noreferrer"><AppIcon name="external" />{t("Veja o guia para emitir o Nada Consta")} ↗</Link></div></aside>
    <ol className="nada-consta-steps" aria-label={t("Etapas do Nada Consta")}>
      <li><span className="nada-consta-steps__icon"><AppIcon name="document" /></span><div><strong>1. {t("Separe o documento")}</strong><p>{t("Tenha o PDF do Nada Consta, com até 5 MB.")}</p></div></li>
      <li><span className="nada-consta-steps__icon"><AppIcon name="upload" /></span><div><strong>2. {t("Envie o arquivo")}</strong><p>{t("Escolha o PDF abaixo e confirme o envio.")}</p></div></li>
      <li><span className="nada-consta-steps__icon"><AppIcon name="review" /></span><div><strong>3. {t("Aguarde a biblioteca")}</strong><p>{t("Você verá aqui o resultado da conferência.")}</p></div></li>
    </ol>
    {document && <div className={`nada-consta-status nada-consta-status--${document.status}`} role="status"><AppIcon name={document.status === "approved" ? "check" : document.status === "rejected" ? "review" : "search"} /><div><strong>{status}</strong><span>{document.original_name} · {formatBytes(document.size_bytes)}</span>{document.rejection_reason && <p>{t("Motivo informado pela biblioteca:")} {document.rejection_reason}</p>}</div></div>}
    {canUpload && <div className="nada-consta-upload">
      <div className="nada-consta-upload__intro"><strong>{t(document?.status === "rejected" ? "Escolha um novo PDF para reenviar" : "Pronto para enviar?")}</strong><span>{t("O arquivo só será enviado quando você clicar em Enviar Nada Consta.")}</span></div>
      <input ref={inputRef} id="nada-consta-file" type="file" accept="application/pdf,.pdf" aria-label={t("Selecionar PDF do Nada Consta")} aria-describedby="nada-consta-file-hint" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} />
      <div className="nada-consta-picker"><AppIcon name={file ? "document" : "upload"} /><div><strong>{file ? file.name : t("Nenhum arquivo selecionado")}</strong><span id="nada-consta-file-hint">{file ? `${formatBytes(file.size)} · ${t("PDF selecionado")}` : t("Escolha um arquivo PDF de até 5 MB")}</span></div><div className="nada-consta-picker__actions"><button className="button button--secondary button--small" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>{t(file ? "Trocar PDF" : "Escolher PDF")}</button>{file && <button className="button button--secondary button--small button--with-icon" type="button" disabled={busy} onClick={() => { setFile(null); setError(""); if (inputRef.current) inputRef.current.value = ""; }}><AppIcon name="close" />{t("Remover arquivo")}</button>}</div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button--primary button--with-icon" type="button" disabled={!file || busy} onClick={submit}><AppIcon name="upload" />{t(busy ? "Enviando…" : "Enviar Nada Consta")}</button>
    </div>}
    <p className="nada-consta-next"><AppIcon name="shield" /><span>{t("A ficha fica disponível quando o trabalho é homologado e o Nada Consta é validado.")}</span></p>
  </section>;
}

function formatBytes(value: number) { return value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(2)} MB`; }
