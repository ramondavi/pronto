"use client";

import { AppIcon } from "./app-icon";

export function ModalCloseButton({ onClick, disabled = false, label = "Fechar janela" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return <button className="pronto-modal__close" type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}><AppIcon name="close" /></button>;
}
