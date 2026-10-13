"use client";

import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";

export function AnalysisKeyboardHint({ step }: { step: "metadata" | "cataloging" | "review" | "documentation" }) {
  const [visible, setVisible] = useState(false);
  const showing = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hint = step === "metadata"
    ? "Use Tab para alcançar as ações e as setas para cima e para baixo para percorrer os campos. Com um campo validável em foco, Enter confirma o dado. Ao editar, Enter salva e Esc descarta; em texto longo, Ctrl+Enter salva sem impedir novas linhas."
    : step === "cataloging"
      ? "Use Tab para percorrer campos e ações. Nos campos de uma linha, Enter confirma o dado e avança para o próximo campo. Nos demais controles, Enter aciona a opção em foco."
      : "Use Tab para percorrer os controles e Enter para acionar a opção em foco. Na barra de etapas, as setas para a esquerda e para a direita mudam de etapa.";
  const content = step === "metadata"
    ? <>Use <kbd>Tab</kbd> para alcançar as ações e <kbd>↑</kbd> <kbd>↓</kbd> para percorrer os campos. Com um campo validável em foco, <kbd>Enter</kbd> confirma o dado. Ao editar, <kbd>Enter</kbd> salva e <kbd>Esc</kbd> descarta; em texto longo, <kbd>Ctrl</kbd> + <kbd>Enter</kbd> salva sem impedir novas linhas.</>
    : step === "cataloging"
      ? <>Use <kbd>Tab</kbd> para percorrer campos e ações. Nos campos de uma linha, <kbd>Enter</kbd> confirma o dado e avança para o próximo campo. Nos demais controles, <kbd>Enter</kbd> aciona a opção em foco.</>
      : <>Use <kbd>Tab</kbd> para percorrer os controles e <kbd>Enter</kbd> para acionar a opção em foco. Na barra de etapas, <kbd>←</kbd> <kbd>→</kbd> mudam de etapa.</>;

  function reveal() {
    if (showing.current) return;
    showing.current = true;
    setVisible(true);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      cooldownTimer.current = setTimeout(() => { showing.current = false; }, 600);
    }, 9_000);
  }

  useEffect(() => {
    const initial = setTimeout(reveal, 300);
    return () => {
      clearTimeout(initial);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  return <div className="analysis-keyboard-hint"><button className="analysis-keyboard-hint__trigger" type="button" aria-label={`Atalhos de teclado: ${hint}`} aria-expanded={visible} onMouseEnter={reveal} onFocus={reveal} onClick={reveal}><AppIcon name="keyboard" /></button><span className={`analysis-keyboard-hint__message${visible ? " is-visible" : ""}`} aria-hidden="true">{content}</span></div>;
}
