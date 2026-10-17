import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { StudentCodeForm } from "@/components/student-code-form";
import { authPageMetadata } from "@/lib/auth-page-metadata";
import { redirect } from "next/navigation";

export const generateMetadata = () => authPageMetadata("login");

export default function StudentCodePage() {
  if (process.env.STUDENT_EMAIL_OTP_ENABLED !== "true") redirect("/entrar");
  return <AuthShell title="Entrar com código" description="Receba um código temporário no e-mail da sua conta estudantil.">
    <StudentCodeForm />
    <p className="auth-card__footer">Prefere usar senha? <Link href="/entrar">Entrar com senha</Link></p>
  </AuthShell>;
}
