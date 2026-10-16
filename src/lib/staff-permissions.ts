import "server-only";

import { createClient } from "@/lib/supabase/server";
import { adminPermissionCodes } from "@/lib/admin-navigation";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Mantém o comportamento anterior até a migração do banco ser aplicada.
const previousRoleAccess: Record<string, string[]> = {
  "staff.overview.view": ["cataloger", "administrator"],
  "staff.queue.view": ["cataloger", "administrator"],
  "staff.queue.assume": ["cataloger", "administrator"],
  "staff.queue.release": ["cataloger", "administrator"],
  "staff.queue.reassign": ["administrator"],
  "staff.queue.priority": ["cataloger", "administrator"],
  "staff.case.view": ["cataloger", "administrator"],
  "staff.card.homologate": ["cataloger", "administrator"],
  "staff.nada_consta.validate": ["cataloger", "administrator"],
  "staff.request.close": ["cataloger", "administrator"],
  "library.calendar.view": ["cataloger", "administrator"],
  "library.calendar.manage": ["administrator"],
  "library.hours.change": ["administrator"],
};

export async function userHasPermission(supabase: SupabaseClient, code: string, role: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_permission", { requested_code: code });
  if (!error) {
    if (data === true) return true;
    if (role === "administrator" && adminPermissionCodes.includes(code)) {
      const { data: definition } = await supabase.from("permission_definitions").select("code").eq("code", code).maybeSingle();
      if (!definition) return true; // Migração nova ainda não aplicada no banco local.
    }
    return false;
  }
  if (error.code === "PGRST202") return previousRoleAccess[code]?.includes(role) ?? false;
  return false;
}

export async function userAdminPermissions(supabase: SupabaseClient, role: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_effective_staff_permissions");
  if (!error && Array.isArray(data)) return data.filter((code): code is string => typeof code === "string" && adminPermissionCodes.includes(code));
  return (await Promise.all(adminPermissionCodes.map(async (code) =>
    await userHasPermission(supabase, code, role) ? code : null,
  ))).filter((code): code is string => code !== null);
}
