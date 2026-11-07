"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppIcon } from "@/components/app-icon";
import { authorityGuidedCopy } from "@/lib/authority-guided-copy";

type GuidedCopy = typeof authorityGuidedCopy[keyof typeof authorityGuidedCopy];

export function AuthorityDetailView({ hero, children, professionalContent, marcText, professionalTitle, professionalSubtitle, copy }: {
  hero: ReactNode;
  children: ReactNode;
  professionalContent: ReactNode;
  marcText: string;
  professionalTitle: string;
  professionalSubtitle: string;
  copy: GuidedCopy;
}) {
  const [professional, setProfessional] = useState(false);
  const [tab, setTab] = useState<"details" | "marc">("details");
  const [copyMessage, setCopyMessage] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!professional) return;
    const frame = requestAnimationFrame(() => heroRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [professional]);

  async function copyMarc() {
    try {
      await navigator.clipboard.writeText(marcText);
      setCopyMessage(copy.copiedMarc);
    } catch {
      setCopyMessage(copy.copyFailed);
    }
  }

  return <>
    <div className="public-authority-detail__hero-wrap" ref={heroRef}>
      {hero}
      <button className="authority-professional-switch" type="button" aria-expanded={professional} aria-controls="authority-detail-content" onClick={() => { setProfessional((value) => !value); setTab("details"); }}>
        <span className="authority-professional__summary-icon"><AppIcon name="book" /></span>
        <span className="authority-professional__summary-copy"><strong>{professionalTitle}</strong><small>{professionalSubtitle}</small></span>
        <AppIcon className="authority-professional-switch__arrow" name={professional ? "chevronDown" : "arrowRight"} />
      </button>
    </div>
    <div id="authority-detail-content" ref={detailRef}>
      {professional ? <section className="authority-professional-view" aria-label={professionalTitle}>
        <div className="authority-professional-view__heading"><div><span className="authority-professional-view__eyebrow">{professionalTitle}</span><h2>{professionalSubtitle}</h2></div><button type="button" className="button button--secondary button--small" onClick={() => setProfessional(false)}>{copy.back}</button></div>
        <div className="authority-professional-view__tabs" role="tablist" aria-label={professionalTitle}>
          <button type="button" role="tab" id="authority-details-tab" aria-controls="authority-details-panel" aria-selected={tab === "details"} onClick={() => setTab("details")}><AppIcon name="document" />{copy.detailsTab}</button>
          <button type="button" role="tab" id="authority-marc-tab" aria-controls="authority-marc-panel" aria-selected={tab === "marc"} onClick={() => setTab("marc")}><AppIcon name="book" />{copy.marcTab}</button>
        </div>
        {tab === "details" ? <div id="authority-details-panel" role="tabpanel" aria-labelledby="authority-details-tab" className="authority-professional-view__details">{professionalContent}</div> : <div id="authority-marc-panel" role="tabpanel" aria-labelledby="authority-marc-tab" className="authority-professional-view__marc">
          <div className="authority-professional-view__marc-heading"><h3>{copy.marcTab}</h3><button type="button" className="button button--primary button--small" onClick={copyMarc}><AppIcon name="copy" />{copy.copyMarc}</button></div>
          <div className="authority-professional-view__guidance notice notice--alert"><span className="notice__symbol"><AppIcon name="help" /></span><div><p>{copy.marcViewHelp}</p><p>{copy.marcLegend}</p></div></div>
          <div className="authority-professional-view__code" onCopy={(event) => { event.clipboardData.setData("text/plain", marcText); event.preventDefault(); }}><code>{marcText.split("\n").map((line, index) => <span className="authority-professional-view__code-line" key={index}><strong>{line.slice(0, 4)}</strong>{line.slice(4)}</span>)}</code></div>
          <p className="authority-professional-view__copy-status" role="status">{copyMessage}</p>
        </div>}
      </section> : <div className="public-authority-detail__grid"><div className="public-authority-detail__content">{children}</div></div>}
    </div>
  </>;
}
