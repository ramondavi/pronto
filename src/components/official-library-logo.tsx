export function OfficialLibraryLogo({ decorative = false, variant = "default" }: { decorative?: boolean; variant?: "header" | "auth" | "sidebar" | "footer" | "default" }) {
  return (
    <a className={`official-library-logo official-library-logo--${variant}`} href="https://arquitetura.ufba.br/pt-br/sobre-0" target="_blank" rel="noreferrer" aria-label="Biblioteca da Faculdade de Arquitetura da UFBA">
      <svg className="official-library-logo__art" viewBox="0 0 779 325" aria-hidden="true" focusable="false">
        <rect x="8" y="8" width="763" height="194" fill="currentColor" />
        <text x="45" y="175" textLength="711" lengthAdjust="spacingAndGlyphs" fill="var(--surface-raised)">biblioteca</text>
        <text className="official-library-logo__faufba" x="328" y="314" fontSize="160" textLength="430" lengthAdjust="spacingAndGlyphs" fill="currentColor">faufba</text>
      </svg>
      {!decorative && <span className="sr-only">Biblioteca da Faculdade de Arquitetura da UFBA</span>}
    </a>
  );
}
