import { AuthShell } from "@/components/auth-shell";
import { RecoverySession } from "./recovery-session";

export default function RecoveryPage() {
  return <AuthShell title="Confirme a alteração da senha" description="Estamos verificando seu link de recuperação.">
    <RecoverySession />
  </AuthShell>;
}
