"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ModalCloseButton } from "@/components/modal-close-button";
import { AppIcon } from "@/components/app-icon";

type HelpTarget = { element: HTMLElement; mount: HTMLElement; title: string; left?: number };

function helpText(title: string, control?: HTMLElement | null) {
  const value = title.toLocaleLowerCase("pt-BR");
  if (value.includes("nome na aprovação")) return "Transcreva o nome do membro da banca como aparece na folha, página ou ata de aprovação do trabalho, na ordem direta e sem inverter os sobrenomes.";
  if (value.includes("nome como aparece no trabalho")) return "Transcreva o nome exatamente como aparece na folha ou página de rosto, na ordem direta e sem inverter os sobrenomes.";
  if (value.includes("nome autorizado")) return "Informe a forma autorizada do nome para a entrada da ficha. Confira a sugestão com a fonte de autoridade antes de adotá-la.";
  if (value === "fonte") return "Selecione a fonte de vocabulário controlado consultada para estabelecer este assunto. Faça essa escolha antes de informar o termo.";
  if (value.includes("termo preferido")) return "Registre o assunto em português na forma autorizada pela fonte selecionada. Use pelo menos três assuntos e marque um como principal.";
  if (value.includes("equivalente") && value.includes("inglês")) return "Campo opcional. Informe o termo em inglês apenas se a forma equivalente tiver sido confirmada na fonte consultada.";
  if (value.includes("descrição da cdu")) return "Na primeira utilização deste código no Pronto!, registre a descrição conforme a CDU, 2ª edição impressa. Nos usos seguintes, ela será recuperada do cadastro.";
  if (value === "cdu") return "Informe o código da Classificação Decimal Universal adequado ao assunto principal. Você pode consultar códigos já cadastrados enquanto digita.";
  if (value.includes("cutter")) return "Informe o Cutter a partir da forma autorizada do primeiro autor, sem acrescentar a inicial do título. As sugestões acompanham essa forma autorizada; confira o código na tabela antes de escolher.";
  if (value.includes("depósito")) return "Informe a data em que o arquivo do trabalho foi finalizado. A ficha usará apenas o ano; a data completa fica disponível para o RI/UFBA.";
  if (value.includes("local de publicação")) return "Informe a cidade que deve aparecer na ficha. O padrão é Salvador; altere quando o trabalho tiver outro local de publicação.";
  if (value.includes("defesa") || value.includes("apresentação")) return "Informe a data que aparece na folha, ata ou página de aprovação. A ficha usará apenas o ano; a data completa ficará disponível para o RI/UFBA.";
  if (value.includes("quantidade de páginas") || value.includes("quantidade de volumes")) return "Conte da folha ou página de rosto até a última página com informação textual. Confira se a unidade selecionada corresponde ao trabalho.";
  if (value.includes("ilustrações")) return "Indique se o trabalho contém ilustrações. Essa escolha define a indicação de ilustrações na descrição física da ficha.";
  if (value.includes("dimensões")) return "Informe as dimensões físicas somente quando forem pertinentes ao exemplar descrito. A ficha acrescenta a pontuação automaticamente.";
  if (value.includes("material acompanhante")) return "Descreva materiais que acompanham o trabalho, se houver. Deixe vazio quando não existir material adicional.";
  if (value.includes("termo principal") || value.includes("assunto principal")) return "Marque somente um termo como principal. Ele orienta a classificação e a busca de sugestões de CDU; os demais termos continuam como assuntos complementares.";
  if (value.includes("exibir na ficha")) return "Ao marcar, o título equivalente aparecerá na descrição do título da ficha, introduzido pelo sinal de igualdade (=) após o título no idioma original.";
  if (value.includes("designação da orientação") || value.includes("designação da coorientação")) return "Informe a designação conforme aparece logo abaixo da nota de natureza do trabalho na folha ou página de rosto. Ela aparecerá antes do nome da pessoa na nota de orientação da ficha.";
  if (value.includes("título equivalente") || value.includes("título em outro idioma")) return "Inclua o título em outro idioma na ficha apenas quando ele também aparecer na folha ou página de rosto.";
  if (value.includes("título do trabalho")) return "Confira o título principal na folha ou página de rosto. Preserve a grafia e a pontuação necessárias para identificar o trabalho.";
  if (value.includes("subtítulo")) return "Confira o subtítulo na folha ou página de rosto. Deixe vazio quando o trabalho não tiver subtítulo.";
  if (value.includes("referência")) return "Confira os elementos da referência do próprio trabalho e ajuste a redação antes de validá-la.";
  if (value.includes("motivo da devolução")) return "Explique objetivamente o que há de errado no Nada Consta e o que o estudante precisa enviar novamente.";
  if (value.includes("modelo de mensagem")) return "Escolha uma justificativa pronta adequada ao campo ou escreva uma orientação específica ao estudante.";
  if (value.includes("orientação complementar")) return "Acrescente detalhes concretos sobre a correção solicitada. Sem modelo de mensagem, este texto é obrigatório.";
  if (value.includes("nota")) return "As notas adicionais são opcionais. Se usar este campo, confira a redação conforme a AACR2 e confirme cada nota.";
  if (value.includes("registro")) return "Registre os critérios e as decisões da equipe sobre esta análise. O conteúdo é interno e salvo automaticamente.";
  if (value.includes("resposta ao estudante")) return "Escreva uma resposta objetiva à mensagem do estudante. Ela será enviada conforme o fluxo de validação dos metadados.";
  if (value.includes("conferi os nomes")) return "Marque depois de revisar os nomes, a descrição física, os assuntos, a classificação e o conteúdo da ficha.";
  const placeholder = control?.getAttribute("placeholder")?.trim();
  return placeholder ? `Preencha ${title.toLocaleLowerCase("pt-BR")} conforme o documento analisado. ${placeholder}. Confira a informação antes de continuar.` : `Confira e informe ${title.toLocaleLowerCase("pt-BR")} de acordo com o trabalho e os documentos apresentados.`;
}

function titleFor(element: HTMLElement) {
  if (element.classList.contains("student-message-note__reply")) return "Resposta ao estudante";
  if (element.classList.contains("citation-inline-editor__toolbar")) return "Referência ABNT";
  if (element.classList.contains("field-review__value")) return element.querySelector(":scope > span")?.textContent?.trim() ?? "Campo da análise";
  const title = (element.querySelector(".cataloging-field-label") ?? element.querySelector(".analysis-help-label") ?? element.querySelector(".field-label-with-tooltip"))?.textContent?.trim();
  if (title) return title.replace(/\s*(?:i|\?)\s*$/, "");
  const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
  return textNode?.textContent?.trim() || element.querySelector("input, textarea, select")?.getAttribute("aria-label") || "Campo da análise";
}

export function AnalysisFieldHelp({ rootRef }: { rootRef: React.RefObject<HTMLDivElement | null> }) {
  const [targets, setTargets] = useState<HelpTarget[]>([]);
  const [open, setOpen] = useState<HelpTarget | null>(null);
  const lastTarget = useRef<HelpTarget | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const collect = () => {
      const labels = [...Array.from(root.querySelectorAll<HTMLLabelElement>("label")), ...Array.from(document.querySelectorAll<HTMLLabelElement>(".analysis-notes-dialog label"))].filter((label) => !label.hasAttribute("data-no-field-help") && (label.control || label.querySelector("input, textarea, select, [contenteditable='true']")));
      const metadata = Array.from(root.querySelectorAll<HTMLElement>(".field-review__value"));
      const citation = Array.from(root.querySelectorAll<HTMLElement>(".citation-inline-editor__toolbar"));
      const replies = Array.from(root.querySelectorAll<HTMLElement>(".student-message-note__reply"));
      const next = [...labels, ...metadata, ...citation, ...replies].map((element) => {
        const preferredMount = element.querySelector<HTMLElement>(".analysis-help-mount") ?? element.querySelector<HTMLElement>(".cataloging-field-label") ?? element.querySelector<HTMLElement>(".analysis-help-label") ?? element.querySelector<HTMLElement>(".field-label-with-tooltip") ?? (element.classList.contains("field-review__value") || element.classList.contains("citation-inline-editor__toolbar") ? element.querySelector<HTMLElement>(":scope > span") : null) ?? (element.classList.contains("student-message-note__reply") ? element.querySelector<HTMLElement>(":scope > strong") : null) ?? element;
        const mount = preferredMount;
        const textNode = mount === element ? Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) : null;
        const range = textNode ? document.createRange() : null;
        if (range && textNode) range.selectNodeContents(textNode);
        const rect = range?.getBoundingClientRect();
        const left = rect && rect.width ? Math.max(0, rect.right - element.getBoundingClientRect().left + 5) : undefined;
        return { element, mount, title: titleFor(element), left };
      });
      setTargets((current) => current.length === next.length && current.every((item, index) => item.element === next[index].element && item.mount === next[index].mount && item.title === next[index].title && item.left === next[index].left) ? current : next);
    };
    const observer = new MutationObserver(() => { if (frame) return; frame = window.requestAnimationFrame(() => { frame = 0; collect(); }); });
    observer.observe(document.body, { childList: true, subtree: true });
    collect();
    return () => { observer.disconnect(); if (frame) window.cancelAnimationFrame(frame); };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const remember = (event: Event) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>("label, .field-review__value, .citation-inline-editor__toolbar, .student-message-note__reply") ?? (event.target.id ? root.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(event.target.id)}"]`) : null) ?? event.target.closest(".citation-inline-editor")?.querySelector<HTMLElement>(".citation-inline-editor__toolbar") ?? null : null;
      lastTarget.current = targets.find((target) => target.element === element) ?? lastTarget.current;
    };
    const shortcut = (event: KeyboardEvent) => {
      if (event.key !== "F12" || event.repeat) return;
      if (open) { event.preventDefault(); event.stopPropagation(); setOpen(null); return; }
      const activeElement = document.activeElement;
      const active = activeElement?.closest<HTMLElement>("label, .field-review__value, .citation-inline-editor__toolbar, .student-message-note__reply") ?? (activeElement?.id ? root.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(activeElement.id)}"]`) : null) ?? activeElement?.closest(".citation-inline-editor")?.querySelector<HTMLElement>(".citation-inline-editor__toolbar");
      const target = targets.find((item) => item.element === active) ?? lastTarget.current;
      if (!target || (!root.contains(target.element) && !target.element.closest(".analysis-notes-dialog"))) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(target);
    };
    root.addEventListener("focusin", remember);
    root.addEventListener("pointerover", remember);
    document.addEventListener("focusin", remember);
    document.addEventListener("pointerover", remember);
    window.addEventListener("keydown", shortcut, true);
    return () => { root.removeEventListener("focusin", remember); root.removeEventListener("pointerover", remember); document.removeEventListener("focusin", remember); document.removeEventListener("pointerover", remember); window.removeEventListener("keydown", shortcut, true); };
  }, [rootRef, targets, open]);

  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  return <>{targets.map((target) => createPortal(<button className={`analysis-field-help-trigger${target.mount === target.element ? " analysis-field-help-trigger--absolute" : ""}`} style={target.left === undefined ? undefined : { left: target.left }} type="button" key="help" aria-label={`Ajuda: ${target.title}`} title={`Ajuda sobre ${target.title}`} onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); lastTarget.current = target; setOpen(target); }}>?</button>, target.mount))}{open && createPortal(<div className="pronto-modal-overlay analysis-field-help-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(null); }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(null); } }}><section className="pronto-modal-surface analysis-field-help-modal" role="dialog" aria-modal="true" aria-labelledby="analysis-field-help-title"><ModalCloseButton onClick={() => setOpen(null)} /><p className="eyebrow">Ajuda do campo</p><h2 id="analysis-field-help-title">{open.title}</h2><p>{helpText(open.title, open.element.querySelector<HTMLElement>("input, textarea, select") ?? (open.element instanceof HTMLLabelElement ? open.element.control as HTMLElement | null : null))}</p>{open.title.toLocaleLowerCase("pt-BR").includes("nome autorizado") && <div className="analysis-field-help-sources"><strong>Consultar nomes</strong><div><a href="https://lattes.cnpq.br/" target="_blank" rel="noopener noreferrer">Lattes CNPq <AppIcon name="external" /></a><a href="https://pergamumweb.ufba.br/pergamumweb/" target="_blank" rel="noopener noreferrer">Pergamum UFBA <AppIcon name="external" /></a></div></div>}<footer><button ref={closeRef} className="button button--primary" type="button" onClick={() => setOpen(null)}>Entendi</button></footer></section></div>, document.body)}</>;
}
