"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canChangeAuthenticatedEmail, isUfbaEmail, isValidBirthDate, normalizeEmail, normalizedSignupMetadata, validateEmailChange, validateSignupFields, type SignupErrors } from "@/domain/auth/account";
import { validatePassword } from "@/domain/auth/password";
import { createClient } from "@/lib/supabase/server";
import { PRIVACY_NOTICE_VERSION } from "@/domain/privacy/notice";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";

function destination(path: string, kind: "error" | "message" | "session_error" | "session_message", text: string) {
  return `${path}?${kind}=${encodeURIComponent(text)}`;
}

async function siteOrigin() {
  const headerStore = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? headerStore.get("origin") ?? "http://localhost:3000";
}

export type SignupState = { errors: SignupErrors; formError: string | null };

export async function signup(_previousState: SignupState, formData: FormData): Promise<SignupState> {
  const input = {
    fullName: String(formData.get("name") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
    privacyAccepted: formData.get("privacyAccepted") === "on",
  };
  const errors = validateSignupFields(input);
  if (Object.keys(errors).length > 0) return { errors, formError: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: normalizeEmail(input.email),
    password: input.password,
    options: {
      data: { ...normalizedSignupMetadata(input), privacy_notice_version: PRIVACY_NOTICE_VERSION },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });
  if (error) return { errors: {}, formError: "Não foi possível criar a conta. Confira os dados ou tente novamente." };
  redirect(destination("/entrar", "message", "Conta criada. Confirme seu e-mail @ufba.br antes de entrar."));
}

export async function updateBirthDate(formData: FormData) {
  const birthDate = String(formData.get("birthDate") ?? "");
  if (!isValidBirthDate(birthDate)) redirect(destination("/painel/conta", "error", "Informe uma data de nascimento válida."));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(destination("/entrar", "error", "Sua sessão expirou. Entre novamente para informar a data de nascimento."));
  const { error } = await supabase.rpc("set_student_birth_date", { target_birth_date: birthDate });
  if (error?.message.includes("birth_date_already_set")) redirect(destination("/painel/conta", "error", "A data de nascimento já foi informada. Somente um administrador pode corrigi-la."));
  if (error) redirect(destination("/painel/conta", "error", "Não foi possível salvar a data de nascimento. Tente novamente."));
  revalidatePath("/painel/conta");
  redirect(destination("/painel/conta", "message", "Data de nascimento salva."));
}

export async function login(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next") === "/painel/solicitacao/corrigir" ? "/painel/solicitacao/corrigir" : "/painel";
  const loginError = (message: string) => `${destination("/entrar", "error", message)}${next === "/painel" ? "" : `&next=${encodeURIComponent(next)}`}`;
  if (!isUfbaEmail(email) || !password) redirect(loginError("Informe e-mail institucional e senha."));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.status === 429) redirect(loginError("Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente."));
  if (error?.status && error.status >= 500) redirect(loginError("O serviço de autenticação está temporariamente indisponível. Tente novamente em instantes."));
  if (error || !data.user) redirect(loginError("E-mail ou senha inválidos, ou e-mail ainda não confirmado."));

  const { data: profile, error: profileError } = await supabase.from("profiles").select("status").eq("id", data.user.id).single();
  if (profileError) redirect(loginError("Não foi possível conferir sua conta agora. Tente novamente em instantes."));
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect(destination("/entrar", "error", "Esta conta não está ativa. Procure a biblioteca."));
  }
  redirect(next);
}

export async function requestPasswordReset(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isUfbaEmail(email)) redirect(destination("/recuperar-senha", "error", "Use seu endereço institucional @ufba.br."));
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteOrigin()}/auth/callback?next=/redefinir-senha` });
  if (error) redirect(destination("/recuperar-senha", "error", "Não foi possível enviar o link agora. Aguarde um instante e tente novamente."));
  redirect(destination("/recuperar-senha", "message", "Se o endereço estiver cadastrado, enviaremos as instruções."));
}

export type PrivacyAcknowledgementState = { error?: string; success?: boolean };

export async function acknowledgePrivacyNotice(_previousState: PrivacyAcknowledgementState): Promise<PrivacyAcknowledgementState> {
  void _previousState;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente para continuar." };
  const { error } = await supabase.rpc("acknowledge_privacy_notice", { target_notice_version: PRIVACY_NOTICE_VERSION });
  if (error) return { error: "Não foi possível registrar sua ciência da política. Tente novamente." };
  revalidatePath("/painel", "layout");
  return { success: true };
}

export type PasswordLinkState = { status: "idle" | "sent" | "error"; sentAt: number };

export async function requestAuthenticatedPasswordChange(_previousState: PasswordLinkState): Promise<PasswordLinkState> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) redirect(destination("/entrar", "error", "Sua sessão expirou. Entre novamente para alterar a senha."));

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (!canChangeAuthenticatedEmail(profile?.status)) {
    await supabase.auth.signOut();
    redirect(destination("/entrar", "error", "Não foi possível continuar. Entre novamente ou procure a biblioteca."));
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${await siteOrigin()}/auth/callback?next=/redefinir-senha` });
  if (error) return { status: "error", sentAt: _previousState.sentAt };
  return { status: "sent", sentAt: Date.now() };
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) redirect(destination("/redefinir-senha", "error", passwordError));
  if (password !== confirmation) redirect(destination("/redefinir-senha", "error", "As senhas não coincidem."));
  const supabase = await createClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) redirect(destination("/recuperar-senha", "error", "O link não está mais válido. Solicite um novo link para redefinir sua senha."));
  const { error } = await supabase.auth.updateUser({ password });
  if (error?.status === 401 || error?.status === 403) redirect(destination("/recuperar-senha", "error", "O link não está mais válido. Solicite um novo link para redefinir sua senha."));
  if (error) {
    const explanation = error.code === "same_password"
      ? "A nova senha precisa ser diferente da senha atual. Escolha outra senha."
      : error.code === "weak_password"
        ? "O serviço recusou essa senha por considerá-la insegura. Escolha outra senha."
        : error.code === "reauthentication_needed" || error.code === "session_not_found"
          ? "Sua autorização para alterar a senha expirou. Solicite um novo link."
          : error.status === 429
            ? "Muitas tentativas de alteração de senha. Aguarde alguns minutos e tente novamente."
            : error.status && error.status >= 500
              ? "O serviço de autenticação está temporariamente indisponível. Tente novamente em instantes."
              : "Não foi possível atualizar a senha. Solicite um novo link se o problema continuar.";
    redirect(destination("/redefinir-senha", "error", explanation));
  }
  redirect(destination("/entrar", "message", "Senha atualizada. Você já pode entrar."));
}

export async function requestEmailChange(formData: FormData) {
  const newEmail = normalizeEmail(String(formData.get("email") ?? ""));
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) redirect(destination("/entrar", "error", "Sua sessão expirou. Entre novamente para alterar o e-mail."));

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (!canChangeAuthenticatedEmail(profile?.status)) {
    await supabase.auth.signOut();
    redirect(destination("/entrar", "error", "Não foi possível continuar. Entre novamente ou procure a biblioteca."));
  }

  const validationError = validateEmailChange(newEmail, user.email);
  if (validationError) redirect(destination("/painel/conta", "error", validationError));

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/painel/conta` },
  );
  if (error) redirect(destination("/painel/conta", "error", "Não foi possível solicitar a alteração do e-mail. Confira o endereço ou tente novamente."));
  redirect(destination("/painel/conta", "message", "Solicitação enviada. Conclua as confirmações de segurança enviadas pelo Supabase para alterar o e-mail."));
}

export async function signOutOtherSessions() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect(destination("/entrar", "error", "Sua sessão expirou. Entre novamente para continuar."));
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const language = profile?.role === "cataloger" || profile?.role === "administrator" ? "pt" : await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) redirect(destination("/painel/conta", "session_error", t("Não foi possível encerrar as outras sessões. Tente novamente.")));
  redirect(destination("/painel/conta", "session_message", t("As outras sessões foram encerradas. Você continua conectado neste dispositivo.")));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
