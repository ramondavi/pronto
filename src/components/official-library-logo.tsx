import Image from "next/image";

export function OfficialLibraryLogo({ decorative = false, variant = "default" }: { decorative?: boolean; variant?: "header" | "auth" | "sidebar" | "footer" | "default" }) {
  return (
    <a className={`official-library-logo official-library-logo--${variant}`} href="https://arquitetura.ufba.br/pt-br/sobre-0" target="_blank" rel="noreferrer" aria-label="Biblioteca da Faculdade de Arquitetura da UFBA">
      <Image
        className="official-library-logo__light"
        src="/logo-biblioteca-faufba-light.png"
        alt={decorative ? "" : "Biblioteca da Faculdade de Arquitetura da UFBA"}
        width={779}
        height={325}
        sizes="(max-width: 560px) 76px, 112px"
      />
      <Image className="official-library-logo__dark" src="/logo-biblioteca-faufba-dark.png" alt="" aria-hidden="true" width={779} height={325} sizes="(max-width: 560px) 76px, 112px" unoptimized />
    </a>
  );
}
