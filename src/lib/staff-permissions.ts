import "server-only";

import { createClient } from "@/lib/supabase/server";

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
  if (!error) return data === true;
  if (error.code === "PGRST202") return previousRoleAccess[code]?.includes(role) ?? false;
  return false;
}
