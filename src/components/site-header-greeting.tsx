"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SiteHeaderGreeting({ greeting, firstName, userId, fallback }: { greeting: string; firstName: string; userId: string; fallback: string }) {
  const [name, setName] = useState(firstName);

  useEffect(() => {
    if (name) return;
    let active = true;
    const supabase = createClient();
    void supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle().then(({ data }) => {
      if (active) setName(data?.full_name?.trim().split(/\s+/)[0] ?? "");
    });
    return () => { active = false; };
  }, [name, userId]);

  return <span className="site-header__access-greeting" aria-hidden="true">{name ? `${greeting}, ${name}` : fallback}</span>;
}
