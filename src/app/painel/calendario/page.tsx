import { AppIcon } from "@/components/app-icon";
import { StaffAnnouncementsCalendar } from "@/components/staff-announcements-calendar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { panelMetadata } from "@/lib/panel-metadata";
import { userHasPermission } from "@/lib/staff-permissions";

export async function generateMetadata() { return panelMetadata("/painel/calendario"); }

export default async function StaffCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (!profile || profile.status !== "active") redirect("/painel");
  const allowed = await userHasPermission(supabase, "library.calendar.view", profile.role);
  if (!allowed) redirect("/painel");
  const { data: announcements } = await supabase.from("library_announcements")
    .select("id,title,message,type,starts_at,ends_at").eq("active", true).order("starts_at", { ascending: false }).limit(100);
  return <main className="dashboard-main dashboard-main--narrow"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="calendar" />Calendário da biblioteca</h1></div></div><section className="panel panel--institutional"><StaffAnnouncementsCalendar announcements={announcements ?? []} /></section></main>;
}
