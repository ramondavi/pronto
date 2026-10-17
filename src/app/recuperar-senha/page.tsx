import { AuthShell } from "@/components/auth-shell";
import { AuthFeedback } from "@/components/auth-feedback";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
import { authPageMetadata } from "@/lib/auth-page-metadata";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";

export const generateMetadata = () => authPageMetadata("recover");

export default async function PasswordRecoveryPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  return (
    <AuthShell title="Recupere sua senha" description="Informe o e-mail da sua conta. Se estiver cadastrado, enviaremos um link para criar outra senha.">
      <AuthFeedback error={error} message={message} />
      <PasswordRecoveryForm />
      <Link className="auth-flow__back" href="/entrar"><AppIcon name="undo" />Voltar ao login</Link>
    </AuthShell>
  );
}
