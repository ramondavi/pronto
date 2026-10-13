"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { AppIcon } from "@/components/app-icon";
import { ModalCloseButton } from "@/components/modal-close-button";
import { isUfbaEmail } from "@/domain/auth/account";

export function AccountConfirmForm({ action, children, className, title, description, confirmLabel, cancelLabel, previewField, invalidEmailMessage, currentEmail, currentEmailLabel, newEmailLabel }: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  previewField?: string;
  invalidEmailMessage?: string;
  currentEmail?: string;
  currentEmailLabel?: string;
  newEmailLabel?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const approved = useRef(false);
  const [preview, setPreview] = useState("");
  const [fieldError, setFieldError] = useState("");

  return <>
    <form ref={formRef} className={className} action={action} onSubmit={(event) => {
      if (approved.current) { approved.current = false; return; }
      event.preventDefault();
      const value = previewField ? String(new FormData(event.currentTarget).get(previewField) ?? "") : "";
      if (previewField === "email" && !isUfbaEmail(value)) {
        setFieldError(invalidEmailMessage ?? "Use um e-mail @ufba.br.");
        return;
      }
      setFieldError("");
      if (previewField) setPreview(value);
      dialogRef.current?.showModal();
    }} onChange={() => setFieldError("")}>{children}</form>
    {fieldError && <p className="form-error account-page__field-error" role="alert">{fieldError}</p>}
    <dialog ref={dialogRef} className="pronto-modal account-confirm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <ModalCloseButton onClick={() => dialogRef.current?.close()} />
      <div className="account-confirm-dialog__heading"><span><AppIcon name="shield" /></span><h2 id={titleId}>{title}</h2></div>
      <p id={descriptionId}>{description}</p>
      {preview && currentEmail ? <dl className="account-confirm-dialog__email-change"><div><dt>{currentEmailLabel}</dt><dd>{currentEmail}</dd></div><div><dt>{newEmailLabel}</dt><dd>{preview}</dd></div></dl> : preview && <strong className="account-confirm-dialog__value">{preview}</strong>}
      <div className="account-confirm-dialog__actions"><button className="button button--secondary" type="button" onClick={() => dialogRef.current?.close()}>{cancelLabel}</button><button className="button button--primary" type="button" onClick={() => { dialogRef.current?.close(); approved.current = true; formRef.current?.requestSubmit(); }}>{confirmLabel}</button></div>
    </dialog>
  </>;
}
