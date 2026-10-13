"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function useStaffPanel() {
  const pathname = usePathname();
  const [staffPanel, setStaffPanel] = useState(false);
  useEffect(() => {
    const update = () => setStaffPanel(Boolean(document.querySelector('[data-staff-panel="true"]')));
    update();
    const root = document.getElementById("conteudo");
    if (!root) return;
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-staff-panel"] });
    return () => observer.disconnect();
  }, [pathname]);
  return staffPanel;
}
