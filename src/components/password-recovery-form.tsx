import { requestPasswordReset } from "@/app/auth-actions";
import { InstitutionalEmailInput } from "./institutional-email-input";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";

export async function PasswordRecoveryForm() {
  const language = await getInterfaceLanguage();
  return <form className="form-stack" action={requestPasswordReset}>
    <label>{uiText(language, "E-mail institucional")}<InstitutionalEmailInput /></label>
    <button className="button button--primary button--full" type="submit">{uiText(language, "Enviar link de recuperação")}</button>
  </form>;
}
