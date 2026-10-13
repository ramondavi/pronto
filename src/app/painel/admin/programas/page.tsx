import { AppIcon } from "@/components/app-icon";
import { redirect } from "next/navigation";
import { RepositoryProgramSettings } from "@/components/repository-program-settings";
import { createClient } from "@/lib/supabase/server";
import { panelMetadata } from "@/lib/panel-metadata";
export async function generateMetadata() { return panelMetadata("/painel/admin/programas"); }

export default async function ProgramSettingsPage(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();const {data:profile}=user?await supabase.from("profiles").select("role").eq("id",user.id).single():{data:null};if(profile?.role!=="administrator")redirect("/painel");const {data:programs}=await supabase.from("academic_programs").select("id,name,level,repository_deposit_enabled,repository_collection_label,coordination_magic_link_enabled,coordination_contacts(name,email,active)").eq("active",true).order("name");return <main className="dashboard-main"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="book" />Programas e coordenações</h1></div></div><RepositoryProgramSettings programs={programs??[]}/></main>}
