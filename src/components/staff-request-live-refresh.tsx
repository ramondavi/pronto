"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Refreshes only the open case; polling covers unavailable Realtime delivery. */
export function StaffRequestLiveRefresh({ requestId, updatedAt, status }: { requestId: string; updatedAt: string; status: string }) {
  const router = useRouter();
  const version = useRef(`${updatedAt}:${status}`);
  useEffect(() => { version.current = `${updatedAt}:${status}`; }, [updatedAt, status]);
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let checking = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      timer = setTimeout(() => { if (!disposed) router.refresh(); }, 180);
    };
    const check = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const { data, error } = await supabase.from("cataloging_requests").select("updated_at,status").eq("id", requestId).maybeSingle();
        if (!disposed && !error && data && `${data.updated_at}:${data.status}` !== version.current) {
          version.current = `${data.updated_at}:${data.status}`;
          refresh();
        }
      } catch { /* A later notification or poll retries temporary connection failures. */ } finally { checking = false; }
    };
    const notice = (event: Event) => { if ((event as CustomEvent<{ requestId: string }>).detail?.requestId === requestId) refresh(); };
    const channel = supabase.channel(`open-staff-request-${requestId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "cataloging_requests", filter: `id=eq.${requestId}` }, refresh).subscribe();
    const interval = setInterval(() => { void check(); }, 15000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("staff:request-updated", notice);
    return () => { disposed = true; clearTimeout(timer); clearInterval(interval); void supabase.removeChannel(channel); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); window.removeEventListener("staff:request-updated", notice); };
  }, [requestId, router]);
  return null;
}
