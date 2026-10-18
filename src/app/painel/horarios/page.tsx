import { AppIcon } from "@/components/app-icon";
import { DailyClosingControl } from "@/components/daily-closing-control";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { panelMetadata } from "@/lib/panel-metadata";
import { userHasPermission } from "@/lib/staff-permissions";

export async function generateMetadata() { return panelMetadata("/painel/horarios"); }

export default async function LibraryHoursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (!profile || profile.status !== "active") redirect("/painel");
  const allowed = await userHasPermission(supabase, "library.hours.change", profile.role);
  if (!allowed) redirect("/painel");
  const { data: dailyHours } = await supabase.from("library_daily_hours").select("service_date,closing_time").order("service_date");
  return <main className="dashboard-main dashboard-main--narrow"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="calendar" /><span className="panel-heading-text"><span className="panel-heading-text__inner">Horários da biblioteca</span></span></h1></div></div><section className="panel admin-section"><DailyClosingControl initialHours={dailyHours ?? []} /></section></main>;
}
