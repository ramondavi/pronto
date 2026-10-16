import { panelMetadata } from "@/lib/panel-metadata";
export async function generateMetadata() { return panelMetadata("/painel/conta"); }
import { AppIcon } from "@/components/app-icon";
import { maskCpf } from "@/domain/students/cpf";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { requestEmailChange, signOutOtherSessions, updateBirthDate } from "@/app/auth-actions";
import { PanelMessageNotice } from "@/components/panel-message-notice";
import { StaffAvatarPicker } from "@/components/staff-avatar-picker";
import { LiteraryAvatar } from "@/components/literary-avatar";
import { StudentAvatar } from "@/components/student-avatar";
import { StaffBirthdaySetting } from "@/components/staff-birthday-setting";
import { AccountConfirmForm } from "@/components/account-confirm-form";
import { AccountPasswordLinkForm } from "@/components/account-password-link-form";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";


export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; session_error?: string; session_message?: string }> }) {
  const { error, message, session_error, session_message } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const [{ data: profile }, { data: studentProfile }, { data: staffProfile }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, role, avatar_choice").eq("id", user.id).single(),
    supabase.from("student_profiles").select("cpf, birth_date").eq("profile_id", user.id).maybeSingle(),
    supabase.from("staff_profiles").select("crb, birthday_month, birthday_day").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/entrar");
  const isStaff = profile.role === "cataloger" || profile.role === "administrator";
  const language = isStaff ? "pt" : await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const roleLabel = profile.role === "administrator" ? "Administração" : profile.role === "cataloger" ? "Biblioteca" : "Estudante";
  return (
    <main className="dashboard-main account-page">
      <div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="account" />{t("Minha conta")}</h1></div></div>
      <section id="account-profile" className="panel account-page__profile" aria-labelledby="account-profile-title">
        <div className="account-page__identity"><span className="account-page__monogram" aria-hidden="true">{isStaff ? <LiteraryAvatar id={user.id} label={profile.full_name} choice={profile.avatar_choice} /> : <StudentAvatar name={profile.full_name} />}</span><div><p className="eyebrow">{t(roleLabel)}</p><h2 id="account-profile-title">{profile.full_name}</h2></div></div>
        <dl className="account-page__facts"><div><AppIcon name="message" /><dt>{t("E-mail institucional")}</dt><dd>{profile.email}</dd></div>{profile.role === "student" && studentProfile && <div><AppIcon name="idCard" /><dt>CPF</dt><dd>{maskCpf(studentProfile.cpf)}</dd></div>}{profile.role === "student" && studentProfile?.birth_date && <div><AppIcon name="calendar" /><dt>{t("Data de nascimento")}</dt><dd>{new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${studentProfile.birth_date}T12:00:00Z`))}</dd></div>}{isStaff && <div><AppIcon name="idCard" /><dt>CRB</dt><dd>{staffProfile?.crb?.trim() || "Não cadastrado"}</dd></div>}{isStaff && <StaffBirthdaySetting month={staffProfile?.birthday_month ?? null} day={staffProfile?.birthday_day ?? null} />}</dl>
        {profile.role === "student" && studentProfile && <p className="account-page__profile-note">{t("A matrícula será informada ao abrir uma nova solicitação, conforme seu vínculo acadêmico atual.")}</p>}
      </section>
      {isStaff && <section id="account-personalization" className="account-page__section" aria-labelledby="account-personalization-title"><div className="account-page__section-heading"><AppIcon name="person" /><h2 id="account-personalization-title">{t("Personalização")}</h2></div><StaffAvatarPicker userId={user.id} fullName={profile.full_name} currentChoice={profile.avatar_choice} /></section>}
      {profile.role === "student" && studentProfile && !studentProfile.birth_date && <section className="panel account-email-panel account-page__birth-date"><div><p className="eyebrow">{t("Complete seus dados")}</p><h2>{t("Informar data de nascimento")}</h2><p>{t("A data completa fica salva na sua conta. O ano poderá ser utilizado na ficha catalográfica caso você autorize quando solicitá-la. Após salvar, somente um administrador poderá corrigir essa data.")}</p></div><PanelMessageNotice error={error?.includes("nascimento") || error?.includes("data") ? error : undefined} message={message?.includes("nascimento") ? message : undefined} /><form className="form-stack" action={updateBirthDate}><label>{t("Data de nascimento")}<input type="date" name="birthDate" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required /></label><button className="button button--primary" type="submit">{t("Salvar data")}</button></form></section>}
      <section id="account-access" className="account-page__section" aria-labelledby="account-access-title">
        <div className="account-page__section-heading"><AppIcon name="shield" /><h2 id="account-access-title">{t("Acesso e segurança")}</h2></div>
        <div className="account-page__access-grid">
          <section className="panel account-email-panel account-page__access-card">
            <div className="account-page__access-card-heading"><span><AppIcon name="message" /></span><div><h3>{t("Alterar e-mail")}</h3><p>{t("Use um endereço institucional da UFBA (@ufba.br).")}</p></div></div>
            <PanelMessageNotice error={error?.includes("nascimento") || error?.includes("data") ? undefined : error} message={message?.includes("nascimento") ? undefined : message} />
            <AccountConfirmForm action={requestEmailChange} className="account-page__email-form" title={t("Confirmar alteração de e-mail")} description={t("Enviaremos as confirmações de segurança para alterar o endereço informado.")} confirmLabel={t("Confirmar solicitação")} cancelLabel={t("Cancelar")} previewField="email" invalidEmailMessage={t("Use um e-mail @ufba.br.")} currentEmail={profile.email} currentEmailLabel={t("E-mail atual")} newEmailLabel={t("Novo e-mail")}><label>{t("Novo e-mail institucional")}<input type="email" name="email" autoComplete="email" placeholder="novoemail@ufba.br" required /></label><button className="button button--primary" type="submit">{t("Solicitar alteração")}<AppIcon name="arrowRight" /></button></AccountConfirmForm>
          </section>
          <section className="panel account-email-panel account-page__access-card">
            <div className="account-page__access-card-heading"><span><AppIcon name="lock" /></span><div><h3>{t("Alterar senha")}</h3><p>{t("Enviaremos um link de confirmação ao seu e-mail institucional para definir a nova senha.")}</p></div></div>
            <AccountPasswordLinkForm userId={user.id} email={profile.email} labels={{ send: t("Enviar link para alterar senha"), sending: t("Enviando link..."), resend: t("Reenviar link para alterar senha"), sent: t("Link enviado"), spam: t("Confira a caixa de entrada e o spam de"), error: t("Não foi possível enviar o link. Aguarde um momento e tente novamente.") }} />
          </section>
          <section className="panel account-page__sessions">
            <div className="account-page__access-card-heading"><span><AppIcon name="logout" /></span><div><h3>{t("Sessões em outros dispositivos")}</h3><p>{t("Você continuará conectado aqui. Os outros dispositivos serão desconectados quando suas sessões forem renovadas.")}</p></div></div>
            <PanelMessageNotice error={session_error} message={session_message} />
            <AccountConfirmForm action={signOutOtherSessions} title={t("Encerrar outras sessões?")} description={t("Você continuará conectado neste dispositivo. Os outros serão desconectados quando suas sessões forem renovadas.")} confirmLabel={t("Encerrar outras sessões")} cancelLabel={t("Cancelar")}><button className="button button--secondary" type="submit">{t("Sair dos outros dispositivos")}<AppIcon name="arrowRight" /></button></AccountConfirmForm>
          </section>
        </div>
      </section>
    </main>
  );
}
