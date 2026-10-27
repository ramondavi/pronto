import type { ComponentProps } from "react";

export const defaultCduEdition = "2ª edição (IBICT, 2007)";
export const previousCduEdition = "1ª edição (IBICT, 1997)";

export function CduEditionSelect({ value, defaultValue, ...props }: ComponentProps<"select">) {
  const selected = value ?? defaultValue;
  const legacy = typeof selected === "string" && selected !== defaultCduEdition && selected !== previousCduEdition;
  return <select {...props} value={value} defaultValue={defaultValue}>
    <option value={defaultCduEdition}>{defaultCduEdition}</option>
    <optgroup label="Edição defasada"><option value={previousCduEdition}>{previousCduEdition}</option></optgroup>
    {legacy && <optgroup label="Registro anterior"><option value={selected}>{selected || "Edição não registrada"}</option></optgroup>}
  </select>;
}
