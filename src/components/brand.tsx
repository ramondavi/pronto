import Link from "next/link";
import Image from "next/image";
import { BrandPixels } from "@/components/brand-pixels";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand ${compact ? "brand--compact" : ""}`} aria-label="Pronto! — Página inicial">
      <span className="brand__logo"><Image className="brand__image brand__image--light" src="/logo-pronto-v3-light.png" alt="Pronto! Biblioteca FAUFBA" width={1570} height={368} priority /><Image className="brand__image brand__image--dark" src="/logo-pronto-v3-dark.png" alt="" width={1570} height={368} priority /><BrandPixels /></span>
    </Link>
  );
}
