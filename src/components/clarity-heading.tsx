"use client";

import { useEffect, useState } from "react";

export function ClarityHeading({ less = "Menos repetição.", clearer = "Mais clareza." }: { less?: string; clearer?: string }) {
  const [visible, setVisible] = useState(false);
  const wordStart = less.lastIndexOf(" ") + 1;
  const prefix = less.slice(0, wordStart);
  const ending = less.slice(wordStart);
  const punctuation = /[.!?]$/.test(ending) ? ending.slice(-1) : "";
  const repeatedWord = ending.slice(0, ending.length - punctuation.length);

  useEffect(() => {
    const section = document.getElementById("como-funciona");
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.5) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return <h2 className={`section__title section__title--single-line${visible ? " is-visible" : ""}`}><span className="sr-only">{less} {clearer}</span><span aria-hidden="true"><span className="section__title--less-repetition">{prefix}<span className="section__title--repetition-word" data-word={repeatedWord}>{repeatedWord}</span></span>{punctuation}</span> <span className="section__title--clearer" aria-hidden="true">{clearer}</span></h2>;
}
