"use client";

import { useState } from "react";
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import type { HomeJourneyCopy } from "@/lib/home-journey-copy";

const icons = ["edit", "review", "document", "upload"] as const satisfies readonly AppIconName[];

export function HomeJourney({ steps, copy }: { steps: [string, string][]; copy: HomeJourneyCopy }) {
  const [active, setActive] = useState(0);
  const stages = [...steps.map(([title, summary]) => ({ title, summary })), copy.last];
  const selected = copy.details[active];

  return <div className="home-journey">
    <p className="home-journey__intro">{copy.intro}</p>
    <div className="home-journey__steps" aria-label={copy.stepLabel}>
      {stages.map((stage, index) => <button
        className="home-journey__step" type="button" key={stage.title}
        aria-pressed={active === index} aria-controls="home-journey-detail"
        onClick={() => setActive(index)}
      >
        <span className="home-journey__step-top"><span className="home-journey__number">{String(index + 1).padStart(2, "0")}</span><span className="home-journey__icon"><AppIcon name={icons[index]} /></span></span>
        <strong>{stage.title}</strong><span className="home-journey__summary">{stage.summary}</span>
      </button>)}
    </div>
    <section className="home-journey__detail" id="home-journey-detail" key={active} aria-live="polite" aria-label={`${copy.stepLabel} ${active + 1}: ${stages[active].title}`}>
      <div className="home-journey__detail-main">
        <p className="eyebrow">{copy.stepLabel} {String(active + 1).padStart(2, "0")} / 04</p>
        <h3>{copy.detailLabel}</h3>
        <ul>{selected.points.map((point) => <li key={point}><span aria-hidden="true"><AppIcon name="check" /></span>{point}</li>)}</ul>
      </div>
      <aside className="home-journey__result">
        <span className="home-journey__result-icon" aria-hidden="true"><AppIcon name={active === 3 ? "check" : "arrowRight"} /></span>
        <p className="eyebrow">{copy.resultLabel}</p>
        <p>{selected.result}</p>
        <Link href={selected.href}>{selected.help}<AppIcon name="arrowRight" /></Link>
      </aside>
    </section>
  </div>;
}
