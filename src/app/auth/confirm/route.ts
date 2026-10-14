import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (tokenHash && type === "recovery") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (!error) return NextResponse.redirect(new URL("/redefinir-senha", url.origin));
  }
  return NextResponse.redirect(new URL("/recuperar-senha?error=O%20link%20n%C3%A3o%20est%C3%A1%20mais%20v%C3%A1lido.%20Solicite%20um%20novo%20link.", url.origin));
}
