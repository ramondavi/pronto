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
  const protectedRoute = request.nextUrl.pathname.startsWith("/painel") || request.nextUrl.pathname === "/redefinir-senha";
  if (!user && protectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    if (request.nextUrl.pathname === "/redefinir-senha") {
      redirectUrl.pathname = "/recuperar-senha";
      redirectUrl.search = "error=O%20link%20n%C3%A3o%20est%C3%A1%20mais%20v%C3%A1lido.%20Solicite%20um%20novo%20link%20para%20redefinir%20sua%20senha.";
      return NextResponse.redirect(redirectUrl);
    }
    redirectUrl.pathname = "/entrar";
    redirectUrl.search = "error=Entre%20para%20acessar%20esta%20p%C3%A1gina.";
    if (request.nextUrl.pathname === "/painel/solicitacao/corrigir") redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  return response;
}
