"use client";

import { StudentAvatar } from "./student-avatar";

export const PRONTO_AVATAR_CHOICE = 75;

// Valores antigos continuam legíveis; Ateliê passa a usar Pórtico.
export const NEUTRAL_AVATARS = [
  { slot: 0, name: "Pórtico" }, { slot: 1, name: "Estante" },
  { slot: 2, name: "Planta" }, { slot: 3, name: "Arcada" },
  { slot: 4, name: "Luminária" }, { slot: 5, name: "Fachada" },
  { slot: 6, name: "Caderno" }, { slot: 7, name: "Escada" },
  { slot: 8, name: "Janela" },
] as const;

const palettes = [
  ["#e7eee9", "#174d49", "#bb7550"], ["#f0e9df", "#493e50", "#a87d47"],
  ["#e7edf2", "#254e69", "#b56850"], ["#f0e7e4", "#653f43", "#b88e57"],
  ["#e9ecdf", "#465744", "#a76d45"],
] as const;

export function avatarChoiceFor(id: string, choice?: number | null) {
  if (typeof choice === "number" && Number.isInteger(choice) && choice >= 0 && choice < 75) {
    const legacySlot = Math.floor(choice / 3) % 10;
    return (legacySlot === 9 ? 0 : legacySlot) * 3;
  }
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % NEUTRAL_AVATARS.length) * 3;
}

function ArchitecturalMotif({ index }: { index: number }) {
  switch (index) {
    case 0: return <><path d="M35 104V66a45 45 0 0 1 90 0v38M48 103V66a32 32 0 0 1 64 0v37" /><path d="M28 105h104M59 31h42" /></>;
    case 1: return <><path d="M31 35h98v73H31zM38 58h84M38 84h84M48 42v15M57 40v17M69 43v14M86 64v19M96 64v19M107 64v19" /><path d="M25 109h110" /></>;
    case 2: return <><path d="M31 32h98v73H31zM48 32v73M48 59h81M90 59v46M48 84h42M111 75h18" /><path d="m57 43 14 10 12-10M101 41h17" /></>;
    case 3: return <><path d="M25 106V65a25 25 0 0 1 50 0v41M85 106V65a25 25 0 0 1 50 0v41M37 106V66a13 13 0 0 1 26 0v40M97 106V66a13 13 0 0 1 26 0v40" /><path d="M20 107h120" /></>;
    case 4: return <><path d="M78 28v25M55 54h49l-9 22H64zM79 77v29M55 106h49" /><path d="M36 75V36h18M36 55h16M108 36h16v39M108 55h16" /><circle cx="79" cy="83" r="4" /></>;
    case 5: return <><path d="M27 105V48l53-22 53 22v57M39 53h82M47 53v52M113 53v52M62 65h36v40H62zM72 65v40M88 65v40" /><path d="M22 107h116" /></>;
    case 6: return <><path d="M41 33h78v72H41zM50 33v72M60 46h48M60 57h33M60 74h48M60 85h33" /><path d="m75 105 20-24 14 12M35 106h91" /></>;
    case 7: return <><path d="M28 104h104M35 96h25v-19h25V58h25V39h19M35 96v9M60 77v28M85 58v47M110 39v66" /><path d="M38 34h45v21H38zM46 43h29M46 48h22" /></>;
    case 8: return <><path d="M40 27h80v78H40zM49 36h62v60H49zM80 36v60M49 67h62M34 106h92" /><path d="M59 45h13M88 77h13M61 77l8 9 8-9" /></>;
    default: return null;
  }
}

export function LiteraryAvatar({ id, label, choice, small = false }: { id: string; label: string; choice?: number | null; small?: boolean }) {
  if (choice === PRONTO_AVATAR_CHOICE) return <StudentAvatar name={label} small={small} />;
  const index = avatarChoiceFor(id, choice) / 3;
  const avatar = NEUTRAL_AVATARS[index];
  const [background, ink, accent] = palettes[index % palettes.length];
  return <span className={`literary-avatar${small ? " literary-avatar--small" : ""}`} role="img" aria-label={`${avatar.name}: avatar de ${label}`}>
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <rect width="160" height="160" fill={background} />
      <path d="M0 119h160" stroke={accent} strokeWidth="3" opacity=".5" />
      <g fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"><ArchitecturalMotif index={index} /></g>
      <path d="M24 118q30-10 56 4 26-14 56-4v24q-31-8-56 5-25-13-56-5z" fill="#fffdf7" stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M80 122v25M35 125q21-4 35 3M90 128q14-7 35-3" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </svg>
  </span>;
}
