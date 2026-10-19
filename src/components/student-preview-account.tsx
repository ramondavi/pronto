"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { AccountConfirmForm } from "@/components/account-confirm-form";
import { AccountPasswordLinkForm } from "@/components/account-password-link-form";
import { StudentAvatar } from "@/components/student-avatar";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function StudentPreviewAccount() {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const [email, setEmail] = useState("estudante.exemplo@ufba.br");
  const [newEmail, setNewEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("pronto:student-preview-account") ?? "null") as { email?: string; birthDate?: string } | null;
      if (saved?.email) setEmail(saved.email);
      if (saved?.birthDate) setBirthDate(saved.birthDate);
    } catch { /* A conta fictícia volta aos dados iniciais. */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("pronto:student-preview-account", JSON.stringify({ email, birthDate })); } catch { /* A demonstração continua nesta página. */ }
  }, [email, birthDate]);

  return <div className="account-page">
    <section id="account-profile" className="panel account-page__profile" aria-labelledby="account-profile-title">
      <div className="account-page__identity"><span className="account-page__monogram" aria-hidden="true"><StudentAvatar name={t("Estudante")} /></span><div><p className="eyebrow">{t("Estudante")}</p><h2 id="account-profile-title">{t("Estudante")}</h2></div></div>
      <dl className="account-page__facts"><div><AppIcon name="message" /><dt>{t("E-mail institucional")}</dt><dd>{email}</dd></div><div><AppIcon name="idCard" /><dt>{t("CPF")}</dt><dd>***.***.***-**</dd></div>{birthDate && <div><AppIcon name="calendar" /><dt>{t("Data de nascimento")}</dt><dd>{new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${birthDate}T12:00:00Z`))}</dd></div>}</dl>
      <p className="account-page__profile-note">{t("A matrícula será informada ao abrir uma nova solicitação, conforme seu vínculo acadêmico atual.")}</p>
    </section>
    {!birthDate && <section className="panel account-email-panel account-page__birth-date"><div><p className="eyebrow">{t("Complete seus dados")}</p><h2>{t("Informar data de nascimento")}</h2><p>{t("A data completa fica salva na sua conta. O ano poderá ser utilizado na ficha catalográfica caso você autorize quando solicitá-la. Após salvar, somente um administrador poderá corrigir essa data.")}</p></div><form className="form-stack" onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get("birthDate"); if (typeof value === "string") { setBirthDate(value); setFeedback(t("Data informada apenas nesta demonstração.")); } }}><label>{t("Data de nascimento")}<input type="date" name="birthDate" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required /></label><button className="button button--primary" type="submit">{t("Salvar data")}</button></form></section>}
    <section id="account-access" className="account-page__section" aria-labelledby="account-access-title">
      <div className="account-page__section-heading"><AppIcon name="shield" /><h2 id="account-access-title">{t("Acesso e segurança")}</h2></div>
      <div className="account-page__access-grid">
        <section className="panel account-email-panel account-page__access-card"><div className="account-page__access-card-heading"><span><AppIcon name="message" /></span><div><h3>{t("Alterar e-mail")}</h3><p>{t("Use um endereço institucional da UFBA (@ufba.br).")}</p></div></div><AccountConfirmForm action={(form) => { setEmail(String(form.get("email") ?? email)); setNewEmail(""); setFeedback(t("Ação simulada. Nenhum dado da conta foi alterado.")); }} className="account-page__email-form" title={t("Confirmar alteração de e-mail")} description={t("Enviaremos as confirmações de segurança para alterar o endereço informado.")} confirmLabel={t("Confirmar solicitação")} cancelLabel={t("Cancelar")} previewField="email" invalidEmailMessage={t("Use um e-mail @ufba.br.")} currentEmail={email} currentEmailLabel={t("E-mail atual")} newEmailLabel={t("Novo e-mail")}><label>{t("Novo e-mail institucional")}<input type="email" name="email" autoComplete="email" placeholder="novoemail@ufba.br" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required /></label><button className="button button--primary" type="submit">{t("Solicitar alteração")} <AppIcon name="arrowRight" /></button></AccountConfirmForm></section>
        <section className="panel account-email-panel account-page__access-card"><div className="account-page__access-card-heading"><span><AppIcon name="lock" /></span><div><h3>{t("Alterar senha")}</h3><p>{t("Enviaremos um link de confirmação ao seu e-mail institucional para definir a nova senha.")}</p></div></div><AccountPasswordLinkForm userId="student-preview" email={email} preview labels={{ send: t("Enviar link para alterar senha"), sending: t("Enviando link..."), resend: t("Reenviar link para alterar senha"), sent: t("Link enviado"), spam: t("Confira a caixa de entrada e o spam de"), error: t("Não foi possível enviar o link. Aguarde um momento e tente novamente.") }} /></section>
        <section className="panel account-page__sessions"><div className="account-page__access-card-heading"><span><AppIcon name="logout" /></span><div><h3>{t("Sessões em outros dispositivos")}</h3><p>{t("Você continuará conectado aqui. Os outros dispositivos serão desconectados quando suas sessões forem renovadas.")}</p></div></div><AccountConfirmForm action={() => setFeedback(t("Ação simulada. Nenhuma sessão foi encerrada."))} title={t("Encerrar outras sessões?")} description={t("Você continuará conectado neste dispositivo. Os outros serão desconectados quando suas sessões forem renovadas.")} confirmLabel={t("Encerrar outras sessões")} cancelLabel={t("Cancelar")}><button className="button button--secondary" type="submit">{t("Sair dos outros dispositivos")} <AppIcon name="arrowRight" /></button></AccountConfirmForm></section>
      </div>
    </section>
    {feedback && <p className="panel student-preview__account-feedback" role="status">{feedback}</p>}
  </div>;
}
