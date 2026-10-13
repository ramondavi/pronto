import type { Metadata } from "next";
import { getInterfaceLanguage } from "@/lib/server-language";

const copy = {
  login: { pt: ["Entrar", "Acesse sua conta Pronto!."], en: ["Sign in", "Access your Pronto! account."], es: ["Iniciar sesión", "Acceda a su cuenta de Pronto!."], de: ["Anmelden", "Melden Sie sich bei Pronto! an."], fr: ["Connexion", "Accédez à votre compte Pronto!."], it: ["Accedi", "Accedi al tuo account Pronto!."] },
  signup: { pt: ["Criar conta", "Crie sua conta no Pronto!."], en: ["Create account", "Create your Pronto! account."], es: ["Crear cuenta", "Cree su cuenta de Pronto!."], de: ["Konto erstellen", "Erstellen Sie Ihr Pronto!-Konto."], fr: ["Créer un compte", "Créez votre compte Pronto!."], it: ["Crea un account", "Crea il tuo account Pronto!."] },
  recover: { pt: ["Recuperar senha", "Receba instruções para recuperar seu acesso ao Pronto!."], en: ["Reset password", "Get instructions to restore access to Pronto!."], es: ["Recuperar contraseña", "Reciba instrucciones para recuperar el acceso a Pronto!."], de: ["Passwort zurücksetzen", "Erhalten Sie Anweisungen zur Wiederherstellung Ihres Zugangs zu Pronto!."], fr: ["Réinitialiser le mot de passe", "Recevez des instructions pour retrouver l’accès à Pronto!."], it: ["Reimposta la password", "Ricevi le istruzioni per recuperare l’accesso a Pronto!."] },
  update: { pt: ["Definir nova senha", "Defina uma nova senha para sua conta Pronto!."], en: ["Set a new password", "Set a new password for your Pronto! account."], es: ["Establecer nueva contraseña", "Establezca una nueva contraseña para su cuenta de Pronto!."], de: ["Neues Passwort festlegen", "Legen Sie ein neues Passwort für Ihr Pronto!-Konto fest."], fr: ["Définir un nouveau mot de passe", "Définissez un nouveau mot de passe pour votre compte Pronto!."], it: ["Imposta una nuova password", "Imposta una nuova password per il tuo account Pronto!."] },
} as const;

export async function authPageMetadata(page: keyof typeof copy): Promise<Metadata> {
  const [title, description] = copy[page][await getInterfaceLanguage()];
  return { title, description, robots: { index: false, follow: false } };
}
