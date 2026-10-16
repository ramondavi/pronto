"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NEUTRAL_AVATARS, PRONTO_AVATAR_CHOICE, LiteraryAvatar, avatarChoiceFor } from "./literary-avatar";
import { StudentAvatar } from "./student-avatar";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { AppIcon } from "@/components/app-icon";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function StaffAvatarPicker({ userId, fullName, currentChoice }: { userId: string; fullName: string; currentChoice: number | null }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [selected, setSelected] = useState(() => currentChoice === PRONTO_AVATAR_CHOICE ? PRONTO_AVATAR_CHOICE : avatarChoiceFor(userId, currentChoice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const avatarName = selected === PRONTO_AVATAR_CHOICE ? "Pronto!" : NEUTRAL_AVATARS.find((item) => item.slot * 3 === selected)?.name ?? NEUTRAL_AVATARS[0].name;

  async function choose(choice: number) {
    if (saving || choice === selected) return;
    const previous = selected;
    setSelected(choice);
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.rpc("choose_staff_avatar", { target_choice: choice });
    setSaving(false);
    if (updateError) {
      setSelected(previous);
      setError(t("Não foi possível salvar o avatar. Tente novamente."));
      showPanelChangeError(t("Avatar não salvo"), t("Confira a conexão e tente novamente."));
      return;
    }
    showPanelChange(t("Avatar salvo"), currentChoice === null ? undefined : async () => {
      const { error: undoError } = await supabase.rpc("choose_staff_avatar", { target_choice: previous });
      if (undoError) throw undoError;
      setSelected(previous);
      router.refresh();
    });
    router.refresh();
  }

  return <section className="panel staff-avatar-picker" aria-labelledby="staff-avatar-picker-title">
    <div className="staff-avatar-picker__heading"><div><h2 id="staff-avatar-picker-title"><AppIcon name="person" />{t("Escolher avatar")}</h2><p>{t("Escolha um símbolo do Pronto! ou que una livros e arquitetura.")}</p></div><p className="staff-avatar-picker__selection" aria-live="polite">{t("Seu avatar")}: <strong>{avatarName}</strong>{saving && <span className="staff-avatar-picker__status" role="status"> {t("Salvando…")}</span>}</p></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="staff-avatar-picker__gallery" aria-label={t("Avatares disponíveis")}>
      <button type="button" className={selected === PRONTO_AVATAR_CHOICE ? "is-selected" : ""} aria-label={`${t("Escolher")} Pronto!${selected === PRONTO_AVATAR_CHOICE ? `, ${t("selecionado")}` : ""}`} aria-pressed={selected === PRONTO_AVATAR_CHOICE} disabled={saving} onClick={() => void choose(PRONTO_AVATAR_CHOICE)}><StudentAvatar name={fullName} /><span>Pronto!</span></button>
      {NEUTRAL_AVATARS.map((item) => {
        const choice = item.slot * 3;
        return <button key={item.slot} type="button" className={selected === choice ? "is-selected" : ""} aria-label={`${t("Escolher")} ${item.name}${selected === choice ? `, ${t("selecionado")}` : ""}`} aria-pressed={selected === choice} disabled={saving} onClick={() => void choose(choice)}><LiteraryAvatar id={userId} label={item.name} choice={choice} /><span>{item.name}</span></button>;
      })}
    </div>
  </section>;
}
