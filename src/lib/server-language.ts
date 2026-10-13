import "server-only";
import { cookies, headers } from "next/headers";
import { normalizeLanguage } from "@/lib/interface-language";

export async function getInterfaceLanguage() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  return normalizeLanguage(cookieStore.get("pronto-language")?.value ?? requestHeaders.get("accept-language")?.split(",")[0]);
}
