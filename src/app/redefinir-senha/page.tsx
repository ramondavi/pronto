import { updatePassword } from "@/app/auth-actions";
import { AuthFeedback } from "@/components/auth-feedback";
import { AuthShell } from "@/components/auth-shell";
import { authPageMetadata } from "@/lib/auth-page-metadata";
import { PasswordRequirements } from "@/components/password-requirements";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";
import { createRecoveryClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const generateMetadata = () => authPageMetadata("update");

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createRecoveryClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) redirect(`/recuperar-senha?${new URLSearchParams({ error: "O link não está mais válido. Solicite um novo link para redefinir sua senha." })}`);
  const { error } = await searchParams;
  const language = await getInterfaceLanguage();
  return (
    <AuthShell title="Defina uma nova senha" description="Escolha uma nova senha para sua conta institucional.">
      <AuthFeedback error={error} />
      <form className="form-stack" action={updatePassword}>
        <PasswordRequirements passwordLabel="Nova senha" confirmationLabel="Confirmar nova senha" />
        <button className="button button--primary button--full" type="submit">{uiText(language, "Atualizar senha")}</button>
      </form>
    </AuthShell>
  );
}
