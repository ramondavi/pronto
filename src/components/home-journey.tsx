"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import type { HomeJourneyCopy } from "@/lib/home-journey-copy";

const icons = ["edit", "review", "document", "upload"] as const satisfies readonly AppIconName[];

export function HomeJourney({ steps, copy }: { steps: [string, string][]; copy: HomeJourneyCopy }) {
  const journeyRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const stages = [...steps.map(([title, summary]) => ({ title, summary })), copy.last];

  useEffect(() => {
    const journey = journeyRef.current;
    if (!journey) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(journey);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!inView || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setAnnounce(false);
        setActive((current) => (current + 1) % stages.length);
      }
    }, 6500);
    return () => window.clearInterval(timer);
  }, [active, inView, paused, reducedMotion, stages.length]);

  return <div className="home-journey" ref={journeyRef} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <p className="home-journey__intro">{copy.intro}</p>
    <div className="home-journey__steps" aria-label={copy.stepLabel}>
      {stages.map((stage, index) => <button
        className="home-journey__step" type="button" key={stage.title}
        aria-pressed={active === index} aria-controls="home-journey-detail"
        onClick={() => { setAnnounce(true); setActive(index); }}
      >
        <span className="home-journey__step-top"><span className="home-journey__number">{String(index + 1).padStart(2, "0")}</span><span className="home-journey__icon"><AppIcon name={icons[index]} /></span></span>
        <strong>{stage.title}</strong><span className="home-journey__summary">{stage.summary}</span>
      </button>)}
    </div>
    <span className="sr-only" role="status" aria-live="polite">{announce ? `${copy.stepLabel} ${active + 1}: ${stages[active].title}` : ""}</span>
    <div className="home-journey__details" id="home-journey-detail">
      {stages.map((stage, index) => {
        const detail = copy.details[index];
        const isActive = active === index;
        return <section className={`home-journey__detail${isActive ? " is-active" : ""}`} key={stage.title} aria-hidden={!isActive} aria-label={`${copy.stepLabel} ${index + 1}: ${stage.title}`}>
          <div className="home-journey__detail-main">
            <p className="eyebrow">{copy.stepLabel} {String(index + 1).padStart(2, "0")} / 04</p>
            <h3>{copy.detailLabel}</h3>
            <ul>{detail.points.map((point) => <li key={point}><span aria-hidden="true"><AppIcon name="check" /></span>{point}</li>)}</ul>
          </div>
          <aside className="home-journey__result">
            <span className="home-journey__result-icon" aria-hidden="true"><AppIcon name={index === 3 ? "check" : "arrowRight"} /></span>
            <p className="eyebrow">{copy.resultLabel}</p>
            <p>{detail.result}</p>
            <Link href={detail.href} tabIndex={isActive ? undefined : -1}>{detail.help}<AppIcon name="arrowRight" /></Link>
          </aside>
        </section>;
      })}
    </div>
  </div>;
}
