import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RecoverySession } from "./recovery-session";

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const { token_hash: tokenHash, type } = await searchParams;
  // Older email templates sent the token hash to this legacy destination.
  if (tokenHash && type === "recovery") {
    redirect(`/auth/confirm?${new URLSearchParams({ token_hash: tokenHash, type })}`);
  }
  return <AuthShell title="Confirme a alteração da senha" description="Estamos verificando seu link de recuperação.">
    <RecoverySession />
  </AuthShell>;
}
