"use client";

import { ProtectedEmail } from "./protected-email";
import { useInterfaceLanguage } from "./interface-language";
import { privacyCopy } from "@/lib/privacy-copy";

export function PrivacyNoticeContent({ compact = false }: { compact?: boolean }) {
  const { language } = useInterfaceLanguage();
  const copy = privacyCopy[language];
  return <div className={compact ? "privacy-notice-text privacy-notice-text--compact" : "privacy-notice-text"}>
    {copy.sections.map((section, index) => <section key={section.title}>
      <h2>{index + 1}. {section.title}</h2>
      {index === 1 ? <>
        <p><strong>{copy.controllerLabel}</strong> {copy.controller}</p>
        <p><strong>{copy.serviceLabel}</strong> <ProtectedEmail recipient="library" />. <strong>{copy.officerLabel}</strong> {copy.officer}; {copy.institutionalChannel}: <ProtectedEmail recipient="privacy" />.</p>
        <p>{copy.informationPrefix} <a href="https://lgpd.ufba.br/" target="_blank" rel="noreferrer">{copy.informationLink}</a>.</p>
        <p>{copy.legalBasis}</p>
      </> : section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </section>)}
  </div>;
}
