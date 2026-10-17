import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { AuthFeedback } from "@/components/auth-feedback";
import { loginStaff } from "@/app/auth-actions";
import { authPageMetadata } from "@/lib/auth-page-metadata";
import { InstitutionalEmailInput } from "@/components/institutional-email-input";

export const generateMetadata = () => authPageMetadata("login");

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  return <AuthShell title="Acesso da biblioteca" description="Área de bibliotecários e administração do Pronto!.">
    <AuthFeedback error={error} message={message} />
    <form className="form-stack" action={loginStaff}>
      <label>E-mail institucional<InstitutionalEmailInput /></label>
      <label>Senha<input type="password" name="password" autoComplete="current-password" placeholder="Sua senha" required /></label>
      <div className="form-row form-row--between"><span /><Link href="/recuperar-senha">Esqueci minha senha</Link></div>
      <button className="button button--primary button--full" type="submit">Entrar</button>
    </form>
    <p className="auth-card__footer">É estudante? <Link href="/entrar">Acesse sua conta aqui</Link></p>
  </AuthShell>;
}
