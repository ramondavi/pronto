"use client";
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

// Progressive enhancement confined to this control. React 19.1's nesting checks do
// not yet recognize the standardized button/selectedcontent pair inside a select.
// Keep React responsible for the options and install the native display pair after
// mounting; unsupported browsers retain the ordinary native select.
export function CatalogueSelect({ children, ...props }: ComponentPropsWithoutRef<"select">) {
 const select = useRef<HTMLSelectElement>(null);
 useEffect(() => {
  const element = select.current;
  if (!element || !CSS.supports("appearance", "base-select")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.append(document.createElement("selectedcontent"));
  element.prepend(button);
  return () => { button.remove(); };
 }, []);
 return <select {...props} ref={select}>{children}</select>;
}
