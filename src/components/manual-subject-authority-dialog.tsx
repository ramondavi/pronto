"use client";
import { useEffect,useId,useRef,useState } from "react";
import { createPortal } from "react-dom";
import { ManualSubjectAuthorityForm,type ManualSubjectResult } from "./manual-subject-authority-form";
import { ModalCloseButton } from "./modal-close-button";
import { AppIcon } from "./app-icon";
import type { AuthoritySource } from "@/lib/authority-preview";
export function ManualSubjectAuthorityDialog({requestId,source,onClose,onSaved}:{requestId:string;source:AuthoritySource;onClose:()=>void;onSaved:(term:ManualSubjectResult)=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);const id=useId();const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{if(!mounted)return;const element=dialog.current;element?.showModal();return()=>{if(element?.open)element.close();};},[mounted]);
 if(!mounted)return null;
 return createPortal(<dialog ref={dialog} className="pronto-modal subject-authority-dialog" aria-labelledby={id} onCancel={event=>{event.preventDefault();onClose();}}><header className="catalogue-modal__header"><h2 id={id} className="authority-import-wizard__title"><AppIcon name="tag" />Propor assunto local</h2><ModalCloseButton onClick={onClose} label="Fechar proposta local" /></header><section className="subject-authority-importer catalogue-workflow"><p className="notice">A proposta será salva inativa e ficará vinculada somente ao rascunho deste atendimento. A homologação aguarda revisão e ativação.</p><ManualSubjectAuthorityForm requestId={requestId} initialSource={source} inDialog onClose={onClose} onSaved={onSaved} /></section></dialog>,document.body);
}
