"use client";

import { useState, type ReactNode } from "react";

export function AuthorityDiscoveryPanel({ children }: { children: ReactNode }) {
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const expanded = pointerInside || focusInside;

  return <section className="authority-discovery" data-expanded={expanded} aria-labelledby="authority-discovery-title"
    onPointerEnter={(event) => { if (event.pointerType === "mouse") setPointerInside(true); }}
    onPointerLeave={(event) => { if (event.pointerType === "mouse") setPointerInside(false); }}
    onFocusCapture={() => setFocusInside(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false); }}>
    {children}
  </section>;
}
