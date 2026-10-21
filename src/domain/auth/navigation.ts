const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const destinations = new Set(["/painel", "/painel/solicitacao", "/painel/solicitacao/corrigir", "/painel/autodeposito"]);

/** Retorna somente destinos internos conhecidos, sem preservar parâmetros arbitrários. */
export function safePanelDestination(value?: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/painel";
  const url = new URL(value, "https://pronto.invalid");
  if (url.origin !== "https://pronto.invalid" || !destinations.has(url.pathname)) return "/painel";
  const requestId = url.searchParams.get("pedido");
  return url.pathname + (url.pathname !== "/painel" && requestId && requestIdPattern.test(requestId) ? `?pedido=${requestId}` : "");
}
