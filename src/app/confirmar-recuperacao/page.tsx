import { confirmPasswordRecovery } from "@/app/auth-actions";
import { AuthShell } from "@/components/auth-shell";
import { authPageMetadata } from "@/lib/auth-page-metadata";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { ...await authPageMetadata("update"), referrer: "no-referrer" };
}

export default async function ConfirmPasswordRecoveryPage({ searchParams }: { searchParams: Promise<{ token_hash?: string }> }) {
  const { token_hash: tokenHash } = await searchParams;
  const language = await getInterfaceLanguage();
  return <AuthShell title="Confirme a alteração da senha" description="Para proteger sua conta, confirme que deseja usar este link antes de definir a nova senha.">
    {tokenHash ? <form className="form-stack" action={confirmPasswordRecovery}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <button className="button button--primary button--full" type="submit">{uiText(language, "Continuar para definir a senha")}</button>
    </form> : <p>{uiText(language, "O link não está mais válido. Solicite um novo link para redefinir sua senha.")}</p>}
  </AuthShell>;
}
