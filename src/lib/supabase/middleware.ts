import { safePanelDestination } from "@/domain/auth/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: CookieToSet[]) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const redirectWithCookies = (url: URL) => {
    const redirected = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
    return redirected;
  };
  if (user && ["/entrar", "/entrar/codigo", "/cadastro"].includes(request.nextUrl.pathname)) {
    const { data: profile, error } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
    if (error || profile?.status === "active") {
      const destination = profile?.role === "student" ? safePanelDestination(request.nextUrl.searchParams.get("next")) : "/painel";
      return redirectWithCookies(new URL(destination, request.url));
    }
  }
  const protectedRoute = request.nextUrl.pathname.startsWith("/painel") || request.nextUrl.pathname === "/redefinir-senha";
  if (!user && protectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    if (request.nextUrl.pathname === "/redefinir-senha") {
      redirectUrl.pathname = "/recuperar-senha";
      redirectUrl.search = "error=O%20link%20n%C3%A3o%20est%C3%A1%20mais%20v%C3%A1lido.%20Solicite%20um%20novo%20link%20para%20redefinir%20sua%20senha.";
      return redirectWithCookies(redirectUrl);
    }
    redirectUrl.pathname = "/entrar";
    redirectUrl.search = "error=Entre%20para%20acessar%20esta%20p%C3%A1gina.";
    const destination = safePanelDestination(request.nextUrl.pathname + request.nextUrl.search);
    if (destination !== "/painel") redirectUrl.searchParams.set("next", destination);
    return redirectWithCookies(redirectUrl);
  }
  return response;
}
