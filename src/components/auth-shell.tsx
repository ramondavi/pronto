import Link from "next/link";
import { Brand } from "./brand";
import { Geometry } from "./geometry";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";

export async function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const language = await getInterfaceLanguage();
  return (
    <main className="auth-shell">
      <Geometry />
      <div className="auth-shell__top">
        <div className="shell-brand"><Brand compact /></div>
      </div>
      <section className="auth-card">
        <p className="eyebrow">{uiText(language, "Acesso seguro")}</p>
        <h1>{uiText(language, title)}</h1>
        <p className="auth-card__description">{uiText(language, description)}</p>
        {children}
        <Link className="back-link" href="/">← {uiText(language, "Voltar para a página inicial")}</Link>
      </section>
    </main>
  );
}
