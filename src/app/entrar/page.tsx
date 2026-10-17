import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { AuthFeedback } from "@/components/auth-feedback";
import { login } from "@/app/auth-actions";
import { authPageMetadata } from "@/lib/auth-page-metadata";
import { InstitutionalEmailInput } from "@/components/institutional-email-input";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";

export const generateMetadata = () => authPageMetadata("login");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const { error, message, next } = await searchParams;
  const language = await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  return (
    <AuthShell title="Acesso do estudante" description="Acompanhe sua solicitação e veja sempre qual é a próxima etapa.">
      <AuthFeedback error={error} message={message} />
      <form className="form-stack" action={login}>
        {next === "/painel/solicitacao/corrigir" && <input type="hidden" name="next" value={next} />}
        <label>{t("E-mail institucional")}<InstitutionalEmailInput /></label>
        <label>{t("Senha")}<input type="password" name="password" autoComplete="current-password" placeholder={t("Sua senha")} required /></label>
        <div className="form-row form-row--between">
          <label className="check"><input type="checkbox" /> <span>{t("Lembrar de mim")}</span></label>
          <Link href="/recuperar-senha">{t("Esqueci minha senha")}</Link>
        </div>
        <button className="button button--primary button--full" type="submit">{t("Entrar")}</button>
      </form>
      {process.env.STUDENT_EMAIL_OTP_ENABLED === "true" && <p className="auth-card__footer">Prefere entrar sem senha? <Link href="/entrar/codigo">Receber código por e-mail</Link></p>}
      <p className="auth-card__footer">{t("Ainda não tem conta?")} <Link href="/cadastro">{t("Criar conta")}</Link></p>
      <p className="auth-card__footer">Trabalha na biblioteca? <Link href="/entrar/equipe">Acesso da biblioteca</Link></p>
    </AuthShell>
  );
}
