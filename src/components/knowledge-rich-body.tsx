"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppIcon, type AppIconName } from "./app-icon";
import { publicInterfaceReferenceByKey } from "@/lib/public-interface-references";
import { staffPanelReferenceByKey } from "@/lib/staff-panel-references";

export function KnowledgeRichBody({ html }: { html: string }) {
  const body = useRef<HTMLDivElement>(null);
  const [icons, setIcons] = useState<{ host: HTMLElement; icon: AppIconName }[]>([]);
  useEffect(() => {
    const next: { host: HTMLElement; icon: AppIconName }[] = [];
    body.current?.querySelectorAll<HTMLElement>(".staff-panel-reference[data-panel-ref]").forEach((element) => {
      const key = element.dataset.panelRef ?? "";
      const icon = publicInterfaceReferenceByKey.get(key)?.icon ?? staffPanelReferenceByKey.get(key)?.icon;
      const host = element.querySelector<HTMLElement>(".staff-panel-reference__icon");
      if (icon && host) next.push({ host, icon });
    });
    setIcons(next);
  }, [html]);
  return <><div ref={body} className="knowledge-rich-content" dangerouslySetInnerHTML={{ __html: html }} />{icons.map(({ host, icon }, index) => createPortal(<AppIcon name={icon} />, host, index))}</>;
}
