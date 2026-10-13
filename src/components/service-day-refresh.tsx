"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { serviceDayKey } from "@/lib/service-announcements";

export function ServiceDayRefresh() {
  const router = useRouter();

  useEffect(() => {
    let currentDay = serviceDayKey(new Date());
    const update = () => {
      const nextDay = serviceDayKey(new Date());
      if (nextDay !== currentDay) {
        currentDay = nextDay;
        router.refresh();
      }
    };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [router]);

  return null;
}
