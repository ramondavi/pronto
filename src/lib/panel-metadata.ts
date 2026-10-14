import "server-only";

import type { Metadata } from "next";
import { dashboardTrail } from "@/lib/breadcrumb-copy";
import { getInterfaceLanguage } from "@/lib/server-language";
import { createClient } from "@/lib/supabase/server";

export async function panelMetadata(pathname: string, options: { responsible?: string | null; area?: string | null; tab?: string | null; origin?: string | null; protocol?: string | null } = {}): Promise<Metadata> {
  let language = await getInterfaceLanguage();
  if (pathname === "/painel" || pathname.startsWith("/painel/conta")) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "cataloger" || profile?.role === "administrator") language = "pt";
    }
  } else if (pathname.startsWith("/painel/fila") || pathname.startsWith("/painel/atendimento") || pathname.startsWith("/painel/admin") || pathname === "/painel/calendario" || pathname === "/painel/horarios" || pathname === "/painel/visao-estudante") language = "pt";
  const trail = dashboardTrail(language, pathname, options);
  return { title: { absolute: `${trail.map((item) => item.label).reverse().join(" › ")} | Pronto!` }, robots: { index: false, follow: false } };
}

export async function panelRequestMetadata(id: string, ficha: boolean, origin?: string | null): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase.from("cataloging_requests").select("protocol").eq("id", id).maybeSingle();
  return panelMetadata(`/painel/atendimento/${id}${ficha ? "/ficha" : ""}`, { protocol: data?.protocol, origin });
}
