import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safePanelDestination } from "@/domain/auth/navigation";

export async function redirectIfAuthenticated(next?: string, client?: Awaited<ReturnType<typeof createClient>>) {
  const supabase = client ?? await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile, error } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (error) redirect("/painel");
  if (profile?.status === "active") redirect(profile.role === "student" ? safePanelDestination(next) : "/painel");
}
