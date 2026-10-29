export type ManualAuthorityMode = "transcribe" | "local";
export type AuthorityReference = { id: string; kind: "bibliographic" | "current_request" | "request"; citation: string; protocol: string; url: string; location: string; evidence: string };
export function foundationPending(rationale: string, references: AuthorityReference[], requestId?: string): string {
 if (rationale.trim().length < 10) return "Explique por que o termo precisa ser criado";
 if (rationale.length > 4000) return "Reduza a justificativa para até 4.000 caracteres";
 if (!references.length || references.length > 10) return "Informe de uma a dez referências";
 for (const reference of references) {
  if (reference.kind === "bibliographic" && reference.citation.trim().length < 3) return "Identifique a referência bibliográfica";
  if (reference.kind === "current_request" && !requestId) return "Informe o protocolo do trabalho de referência";
  if (reference.kind === "request" && !reference.protocol.trim()) return "Informe o protocolo do trabalho de referência";
  if (reference.evidence.trim().length < 3) return "Informe a evidência que fundamenta o termo";
  if (reference.citation.length > 1000 || reference.evidence.length > 1000 || reference.location.length > 240 || reference.url.length > 2000) return "Reduza o tamanho dos campos da referência";
  if (reference.kind === "bibliographic" && reference.url.trim() && !/^https:\/\/\S+$/i.test(reference.url.trim())) return "Use um link HTTPS na referência";
 }
 return "";
}
export function serializeFoundation(rationale: string, references: AuthorityReference[], requestId?: string) {
 return { rationale:rationale.trim(), references:references.map(reference=>({kind:reference.kind === "bibliographic" ? "bibliographic" : "request",citation:reference.citation.trim() || null,protocol:reference.kind === "request" ? reference.protocol.trim() : null,request_id:reference.kind === "current_request" ? requestId : null,url:reference.kind === "bibliographic" ? reference.url.trim() || null : null,location:reference.location.trim() || null,evidence:reference.evidence.trim()})) };
}
