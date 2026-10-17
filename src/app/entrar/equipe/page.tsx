import { redirect } from "next/navigation";

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  const params = new URLSearchParams({ perfil: "equipe" });
  if (error) params.set("error", error);
  if (message) params.set("message", message);
  redirect(`/entrar?${params}`);
}
