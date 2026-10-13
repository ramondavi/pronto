"use client";

import { useState } from "react";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

type InstitutionalEmailInputProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function completeInstitutionalEmail(value: string) {
  const trimmed = value.trim();
  return /^[^@\s]+@?$/.test(trimmed) ? `${trimmed.replace(/@$/, "")}@ufba.br` : trimmed;
}

export function InstitutionalEmailInput({ value, onValueChange, placeholder = "Seu e-mail @ufba.br", ...accessibility }: InstitutionalEmailInputProps) {
  const { language } = useInterfaceLanguage();
  const [localValue, setLocalValue] = useState("");
  const currentValue = value ?? localValue;

  function update(nextValue: string) {
    if (onValueChange) onValueChange(nextValue);
    else setLocalValue(nextValue);
  }

  function complete(input: HTMLInputElement, advance: boolean) {
    const nextValue = completeInstitutionalEmail(input.value);
    input.value = nextValue;
    update(nextValue);
    if (advance && nextValue.includes("@")) {
      const nextField = input.form?.querySelector<HTMLElement>('input[name="password"], button[type="submit"]');
      nextField?.focus();
    }
  }

  return <input type="email" name="email" autoComplete="email" placeholder={uiText(language, placeholder)} value={currentValue} required {...accessibility}
    onChange={(event) => update(event.target.value)}
    onBlur={(event) => complete(event.currentTarget, false)}
    onKeyDown={(event) => {
      if (event.key === "@" && /^[^@\s]+$/.test(event.currentTarget.value.trim())) {
        event.preventDefault();
        complete(event.currentTarget, true);
      } else if (event.key === "Enter" && event.currentTarget.value.trim()) {
        event.preventDefault();
        complete(event.currentTarget, true);
      }
    }} />;
}
