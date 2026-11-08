"use client";

import { useRef } from "react";
import Link from "next/link";
import { logout } from "@/app/auth-actions";
import { AppIcon } from "./app-icon";
import { LiteraryAvatar } from "./literary-avatar";

export function StaffGuideIdentity({ userId, fullName, role, avatarChoice }: { userId: string; fullName: string; role: string; avatarChoice?: number | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  return <div className="staff-docs__identity"><Link className="staff-docs__account" href="/painel/conta" aria-label={`Minha conta: ${fullName}`}><LiteraryAvatar id={userId} label={fullName} choice={avatarChoice} small /><span><strong>{firstName}</strong><small>{role === "administrator" ? "Administrador" : "Catalogador"}</small></span></Link><form action={logout} id="staff-guide-logout-form"><button className="staff-docs__logout" type="button" onClick={() => dialogRef.current?.showModal()} aria-label="Sair da conta" title="Sair da conta"><AppIcon name="logout" /></button></form><dialog ref={dialogRef} className="dashboard-logout-dialog pronto-modal" aria-labelledby="staff-guide-logout-title" onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}><div className="dashboard-logout-dialog__content"><div className="dashboard-logout-dialog__heading"><span className="dashboard-logout-dialog__icon"><AppIcon name="logout" /></span><div><p className="eyebrow">Sair da conta</p><h2 id="staff-guide-logout-title">Deseja sair do Pronto!?</h2></div></div><p>Sua sessão será encerrada neste navegador.</p><div className="dashboard-logout-dialog__actions"><button className="button button--secondary button--with-icon" type="button" onClick={() => dialogRef.current?.close()}><AppIcon name="check" />Continuar no guia</button><button className="button button--danger button--with-icon" type="submit" form="staff-guide-logout-form"><AppIcon name="logout" />Sair da conta</button></div></div></dialog></div>;
}
