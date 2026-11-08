"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppIcon, type AppIconName } from "./app-icon";
import { staffPanelReferenceByKey } from "@/lib/staff-panel-references";

export function StaffGuideArticleBody({ html }: { html: string }) {
  const articleRef = useRef<HTMLElement>(null);
  const [icons, setIcons] = useState<{ host: HTMLElement; icon: AppIconName }[]>([]);
  useEffect(() => {
    const nextIcons: { host: HTMLElement; icon: AppIconName }[] = [];
    articleRef.current?.querySelectorAll<HTMLElement>(".staff-panel-reference[data-panel-ref]").forEach((element) => {
      const reference = staffPanelReferenceByKey.get(element.dataset.panelRef ?? "");
      const iconHost = element.querySelector<HTMLElement>(".staff-panel-reference__icon");
      if (!reference?.icon || !iconHost) return;
      nextIcons.push({ host: iconHost, icon: reference.icon });
    });
    setIcons(nextIcons);
  }, [html]);
  return <><article ref={articleRef} className="knowledge-rich-content staff-docs__article-body" dangerouslySetInnerHTML={{ __html: html }} />{icons.map(({ host, icon }, index) => createPortal(<AppIcon name={icon} />, host, index))}</>;
}
