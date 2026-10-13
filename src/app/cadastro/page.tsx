import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { authPageMetadata } from "@/lib/auth-page-metadata";
import { SignupForm } from "@/components/signup-form";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";

export const generateMetadata = () => authPageMetadata("signup");

export default async function SignupPage() {
  const language = await getInterfaceLanguage();
  return (
    <AuthShell title="Crie sua conta" description="Sua conta é única. A matrícula será informada em cada nova solicitação.">
      <SignupForm />
      <p className="auth-card__footer">{uiText(language, "Já tem uma conta?")} <Link href="/entrar">{uiText(language, "Entrar")}</Link></p>
    </AuthShell>
  );
}
