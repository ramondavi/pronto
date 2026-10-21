import { redirectIfAuthenticated } from "@/lib/authenticated-redirect";
import { AuthShell } from "@/components/auth-shell";
import { LoginRoleForm } from "@/components/login-role-form";
import { authPageMetadata } from "@/lib/auth-page-metadata";

export const generateMetadata = () => authPageMetadata("login");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string; perfil?: string }> }) {
  const { error, message, next, perfil } = await searchParams;
  await redirectIfAuthenticated(next);
  return (
    <AuthShell title="Entre na sua conta" description="Escolha como deseja acessar o Pronto!">
      <LoginRoleForm initialRole={perfil === "equipe" ? "staff" : "student"} error={error} message={message} next={next} otpEnabled={process.env.STUDENT_EMAIL_OTP_ENABLED === "true"} />
    </AuthShell>
  );
}
