"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedSectionTitle({ title, id, theme }: { title: string; id?: string; theme: "benefits" | "faq" }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heading = titleRef.current;
    if (!heading) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.5) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return <h2 ref={titleRef} id={id} className={`section__title animated-section-title animated-section-title--${theme}${visible ? " is-visible" : ""}`}><span>{title}</span>{theme === "benefits" && <i className="animated-section-title__path-marker" aria-hidden="true" />}</h2>;
}
