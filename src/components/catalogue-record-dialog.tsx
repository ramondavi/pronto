"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";

export function CatalogueRecordDialog({ title, children, footer, busy = false, onClose }: { title: string; children: ReactNode; footer?: ReactNode; busy?: boolean; onClose: () => void }) {
 const ref = useRef<HTMLDialogElement>(null); const id = useId();
 useEffect(() => { const previous = document.activeElement; const dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus({preventScroll:true}); }; }, []);
 return createPortal(<dialog ref={ref} className="pronto-modal catalogue-record-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><header className="catalogue-modal__header"><h2 id={id}><AppIcon name="book" />{title}</h2><ModalCloseButton onClick={onClose} disabled={busy} /></header><div className="catalogue-record-dialog__body">{children}</div>{footer && <footer className="catalogue-record-dialog__footer">{footer}</footer>}</dialog>,document.body);
}
export function CatalogueConfirmation({ title, label, children, onClose, onConfirm }: {title:string;label:string;children:ReactNode;onClose:()=>void;onConfirm:()=>Promise<boolean>}) {
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function confirm(){if(busy)return;setBusy(true);setError("");try{if(await onConfirm())onClose();else setError("A alteração não foi confirmada. Confira o aviso e tente novamente.");}catch{setError("Não foi possível confirmar a alteração. Confira a situação do cadastro antes de tentar novamente.");}finally{setBusy(false);}}
 return <CatalogueRecordDialog title={title} busy={busy} onClose={onClose} footer={<><button type="button" className="button button--secondary" disabled={busy} onClick={onClose}>Manter como está</button><button type="button" className="button button--primary" disabled={busy} aria-busy={busy} onClick={()=>void confirm()}><AppIcon name={busy?"clock":"eyeOff"} />{busy?"Salvando…":label}</button></>}>{children}{error && <div className="notice notice--error" role="alert">{error}</div>}</CatalogueRecordDialog>;
}
