"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LIBRARY_CLOSING_TIME, isLibraryClosedNow, serviceDayKey } from "@/lib/service-announcements";

export function ServiceDayRefresh({ closingTime = DEFAULT_LIBRARY_CLOSING_TIME }: { closingTime?: string }) {
  const router = useRouter();

  useEffect(() => {
    let currentDay = serviceDayKey(new Date());
    let currentClosure = isLibraryClosedNow(new Date().toISOString(), closingTime);
    const update = () => {
      const now = new Date();
      const nextDay = serviceDayKey(now);
      const nextClosure = isLibraryClosedNow(now.toISOString(), closingTime);
      if (nextDay !== currentDay || nextClosure !== currentClosure) {
        currentDay = nextDay;
        currentClosure = nextClosure;
        router.refresh();
      }
    };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [router, closingTime]);

  return null;
}
