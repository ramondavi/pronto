"use server";

import { redirectIfAuthenticated } from "@/lib/authenticated-redirect";
import { safePanelDestination } from "@/domain/auth/navigation";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { canChangeAuthenticatedEmail, isUfbaEmail, isValidBirthDate, normalizeEmail, normalizedSignupMetadata, validateEmailChange, validateSignupFields, type SignupErrors } from "@/domain/auth/account";
import { validatePassword } from "@/domain/auth/password";
import { createClient } from "@/lib/supabase/server";
import { verifyPasswordRecovery } from "@/lib/supabase/password-recovery";
import { PRIVACY_NOTICE_VERSION } from "@/domain/privacy/notice";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";

function destination(path: string, kind: "error" | "message" | "session_error" | "session_message", text: string) {
  return `${path}?${kind}=${encodeURIComponent(text)}`;
}

async function siteOrigin() {
  const headerStore = await headers();
  if (process.env.NODE_ENV === "development") {
    const origin = headerStore.get("origin");
    if (origin === "http://127.0.0.1:3100" || origin === "http://localhost:3100") return origin;
    return "http://127.0.0.1:3100";
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? headerStore.get("origin") ?? "http://127.0.0.1:3100";
}

function recoveryEmailClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase recovery environment variables are not configured.");
  // The email may be opened in a different browser from the one that requested it.
  return createSupabaseClient(url, key, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type SignupState = { errors: SignupErrors; formError: string | null };

export async function signup(_previousState: SignupState, formData: FormData): Promise<SignupState> {
  await redirectIfAuthenticated(String(formData.get("next") ?? ""));
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

async function loginWithPassword(formData: FormData, audience: "student" | "staff") {
  const next = safePanelDestination(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  await redirectIfAuthenticated(next, supabase);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const loginError = (message: string) => {
    const params = new URLSearchParams();
    if (audience === "staff") params.set("perfil", "equipe");
    params.set("error", message);
    if (next !== "/painel") params.set("next", next);
    return `/entrar?${params}`;
  };
  if (!isUfbaEmail(email) || !password) redirect(loginError("Informe e-mail institucional e senha."));

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.status === 429) redirect(loginError("Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente."));
  if (error?.status && error.status >= 500) redirect(loginError("O serviço de autenticação está temporariamente indisponível. Tente novamente em instantes."));
  if (error || !data.user) redirect(loginError("E-mail ou senha inválidos, ou e-mail ainda não confirmado."));

  const { data: profile, error: profileError } = await supabase.from("profiles").select("status, role").eq("id", data.user.id).single();
  if (profileError) {
    await supabase.auth.signOut();
    redirect(loginError("Não foi possível conferir sua conta agora. Tente novamente em instantes."));
  }
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect(loginError("Esta conta não está ativa. Procure a biblioteca."));
  }
  if ((audience === "student" && profile.role !== "student") || (audience === "staff" && profile.role === "student")) {
    await supabase.auth.signOut();
    redirect(loginError(audience === "student" ? "Esta é uma conta da biblioteca. Use o acesso da equipe." : "Esta é uma conta de estudante. Use o acesso de estudantes."));
  }
  redirect(next);
}

export async function login(formData: FormData) {
  return loginWithPassword(formData, "student");
}

export async function loginStaff(formData: FormData) {
  return loginWithPassword(formData, "staff");
}

export type StudentCodeRequestState = { status: "idle" | "sent" | "error"; email: string; message: string; sentAt: number; error: string };
export type StudentCodeVerifyState = { error: string };

export async function requestStudentCode(_previousState: StudentCodeRequestState, formData: FormData): Promise<StudentCodeRequestState> {
  await redirectIfAuthenticated(String(formData.get("next") ?? ""));
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const failure = (message: string): StudentCodeRequestState => _previousState.status === "sent"
    ? { ..._previousState, error: message }
    : { status: "error", email, message, sentAt: 0, error: message };
  if (process.env.STUDENT_EMAIL_OTP_ENABLED !== "true") return failure("O acesso por código ainda não está disponível.");
  if (!isUfbaEmail(email)) return failure("Use seu endereço institucional @ufba.br.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error?.status === 429) return failure("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  if (error) return failure("Não foi possível enviar o código agora. Tente novamente em instantes.");
  return { status: "sent", email, message: "Se esta for uma conta estudantil cadastrada, enviaremos um código para esse e-mail.", sentAt: Date.now(), error: "" };
}

export async function verifyStudentCode(_previousState: StudentCodeVerifyState, formData: FormData): Promise<StudentCodeVerifyState> {
  await redirectIfAuthenticated(String(formData.get("next") ?? ""));
  if (process.env.STUDENT_EMAIL_OTP_ENABLED !== "true") return { error: "O acesso por código ainda não está disponível." };
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const token = String(formData.get("code") ?? "").trim();
  if (!isUfbaEmail(email) || !/^\d{6,8}$/.test(token)) return { error: "Informe o código numérico recebido por e-mail." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) return { error: "Código inválido ou expirado. Confira o e-mail ou solicite outro código." };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).single();
  if (profileError || !profile || profile.role !== "student" || profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: "Este acesso é exclusivo para estudantes com conta ativa." };
  }
  redirect(safePanelDestination(String(formData.get("next") ?? "")));
}

export type PasswordResetRequestState = { status: "idle" | "sent" | "error"; sentAt: number; email: string; message: string };

export async function requestPasswordReset(_previousState: PasswordResetRequestState, formData: FormData): Promise<PasswordResetRequestState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isUfbaEmail(email)) return { status: "error", sentAt: 0, email, message: "Use seu endereço institucional @ufba.br." };
  const supabase = recoveryEmailClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteOrigin()}/auth/recuperacao` });
  if (error) return { status: "error", sentAt: 0, email, message: "Não foi possível enviar o link agora. Aguarde um instante e tente novamente." };
  return { status: "sent", sentAt: Date.now(), email, message: "Se o endereço estiver cadastrado, enviaremos as instruções." };
}

export async function confirmPasswordRecovery(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const invalidLink = "O link não está mais válido. Solicite um novo link para redefinir sua senha.";
  if (!tokenHash) redirect(destination("/recuperar-senha", "error", invalidLink));
  const supabase = await createClient();
  const { data, error } = await verifyPasswordRecovery(supabase, tokenHash);
  if (error) {
    const explanation = error.status === 429
      ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
      : !error.status || error.status >= 500
        ? "Não foi possível validar o link agora. Tente novamente em instantes."
        : invalidLink;
    redirect(destination("/recuperar-senha", "error", explanation));
  }
  if (!data.session || !data.user) redirect(destination("/recuperar-senha", "error", invalidLink));
  redirect("/redefinir-senha");
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

  const { error } = await recoveryEmailClient().auth.resetPasswordForEmail(user.email, { redirectTo: `${await siteOrigin()}/auth/recuperacao` });
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
