import { redirectIfAuthenticated } from "@/lib/authenticated-redirect";
import { AuthShell } from "@/components/auth-shell";
import { StudentCodeForm } from "@/components/student-code-form";
import { authPageMetadata } from "@/lib/auth-page-metadata";
import { redirect } from "next/navigation";

export const generateMetadata = () => authPageMetadata("login");

export default async function StudentCodePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  await redirectIfAuthenticated(next);
  if (process.env.STUDENT_EMAIL_OTP_ENABLED !== "true") redirect("/entrar");
  return <AuthShell title="Entrar com código" description="Receba um código temporário no e-mail da sua conta estudantil.">
    <StudentCodeForm next={next} />
  </AuthShell>;
}
