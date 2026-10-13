"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";

type Labels = { trigger: string; how: string; benefits: string; questions: string };

export function HeaderExploreMenu({ labels }: { labels: Labels }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuRef.current) {
        setOpen(false);
        menuRef.current.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);

  return <div className={`site-header__explore${open ? " is-open" : ""}`} ref={menuRef}
    onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
    onPointerLeave={(event) => { if (event.pointerType === "mouse") setOpen(false); }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
  >
    <button type="button" aria-label={labels.trigger} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((current) => !current)}><AppIcon name="compass" /><span>{labels.trigger}</span></button>
    <div className="site-header__explore-menu" id={menuId} aria-hidden={!open}>
      <Link href="/#como-funciona" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}><AppIcon name="review" />{labels.how}</Link>
      <Link href="/#vantagens" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}><AppIcon name="sparkles" />{labels.benefits}</Link>
      <Link href="/#duvidas-frequentes" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}><AppIcon name="help" />{labels.questions}</Link>
    </div>
  </div>;
}
