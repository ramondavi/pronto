export function cardPublicUrl(token: string) {
  // Este domínio permanece como ponte após a futura migração para a infraestrutura da UFBA.
  return `https://prontobib.vercel.app/f/${token}`;
}
