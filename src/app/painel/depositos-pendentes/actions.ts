"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const origins = new Set(["https://prontobib.vercel.app", "https://pronto-git-codex-ajustes-administrac-c0c3a4-ramondavis-projects.vercel.app"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function enqueueDepositReminders(input: { ids: string[]; all: boolean; programId: string; search: string }) {
  if (!input || !Array.isArray(input.ids) || input.ids.length > 100 || input.ids.some((id) => typeof id !== "string" || !uuid.test(id)) || typeof input.all !== "boolean" || typeof input.search !== "string" || typeof input.programId !== "string" || (input.programId && !uuid.test(input.programId))) {
    return { queued: 0, remaining: 0, error: "Seleção inválida. Atualize a lista e tente novamente." };
  }
  const requestedOrigin = (await headers()).get("origin") ?? "";
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const origin = origins.has(requestedOrigin) ? requestedOrigin : origins.has(configuredOrigin) ? configuredOrigin : "https://prontobib.vercel.app";
  const { data, error } = await (await createClient()).rpc("enqueue_repository_deposit_reminders", {
    target_request_ids: [...new Set(input.ids)], program_filter: input.programId || null,
    search_text: input.search.slice(0, 150), all_matching: input.all, site_origin: origin,
  });
  if (error) return { queued: 0, remaining: 0, error: "Não foi possível agendar os lembretes. Confira se o guia está habilitado e se sua conta tem permissão para finalizar atendimentos." };
  return { queued: Number(data?.queued ?? 0), remaining: Number(data?.remaining ?? 0), error: null };
}
