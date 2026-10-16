"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const codeGlyphs = "0123456789.CDU:-";
const firstWordCodes = ["72.04", "025.31", "72.03", "004.6"];
const secondWordCodes = ["025.31:72.04", "72.03-004.6", "021.642:72.03", "025.31-72.04"];

function scramble(target: string, revealed: number, step: number) {
  return Array.from(target, (character, index) => {
    if (index < revealed) return character;
    return codeGlyphs[(index * 7 + step * 5) % codeGlyphs.length];
  }).join("");
}

function HeroCduWord({ target, codes, delay = 0, onComplete }: { target: string; codes: readonly string[]; delay?: number; onComplete?: () => void }) {
  const [display, setDisplay] = useState(codes[0] ?? target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      setDisplay(codes[0] ?? target);
      interval = window.setInterval(() => {
        frame += 1;
        if (frame < codes.length) {
          setDisplay(codes[frame]);
          return;
        }
        const revealed = Math.min(target.length, frame - codes.length + 1);
        setDisplay(revealed === target.length ? target : scramble(target, revealed, frame));
        if (revealed === target.length) {
          window.clearInterval(interval);
          onComplete?.();
        }
      }, 75);
    }, delay);

    return () => { window.clearTimeout(start); window.clearInterval(interval); };
  }, [codes, delay, onComplete, target]);

  return <span className="hero__classification-word"><span className="hero__classification-target">{target}</span><span className="hero__classification-display" data-complete={display === target}>{display}</span></span>;
}

export function HeroClassificationPhrase({ text }: { text: string }) {
  const [highlighted, setHighlighted] = useState(false);
  const highlightTimer = useRef<number | null>(null);
  const markComplete = useCallback(() => {
    if (highlightTimer.current !== null) return;
    highlightTimer.current = window.setTimeout(() => {
      setHighlighted(true);
      highlightTimer.current = null;
    }, 420);
  }, []);

  useEffect(() => () => {
    if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
  }, []);

  const words = text.split(" ");
  return <span className={`hero__classification-phrase${highlighted ? " is-highlighted" : ""}`}>{words.map((word, index) => <span key={`${word}-${index}`}><HeroCduWord target={word} codes={index % 2 === 0 ? firstWordCodes : secondWordCodes} delay={120 + index * 100} onComplete={index === words.length - 1 ? markComplete : undefined} />{index < words.length - 1 ? " " : ""}</span>)}</span>;
}
