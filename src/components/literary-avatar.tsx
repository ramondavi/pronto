"use client";

// Preserve the existing database values so saved choices continue to work.
const slots = [...Array.from({ length: 17 }, (_, index) => index), 24] as const;

export const NEUTRAL_AVATARS = slots.map((slot, index) => ({ slot, number: index + 1 }));

const colors = [
  ["#173e45", "#75c7b2"], ["#43385f", "#baa7e8"], ["#7a3e37", "#efab85"],
  ["#244f78", "#8ac7e5"], ["#5c4936", "#d8b37c"], ["#375b4a", "#a9d49c"],
] as const;

export function avatarChoiceFor(id: string, choice?: number | null) {
  if (typeof choice === "number" && Number.isInteger(choice) && choice >= 0 && choice < 75) {
    const slot = Math.floor(choice / 3);
    return (NEUTRAL_AVATARS.find((avatar) => avatar.slot === slot) ?? NEUTRAL_AVATARS[slot % NEUTRAL_AVATARS.length]).slot * 3;
  }
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return NEUTRAL_AVATARS[hash % NEUTRAL_AVATARS.length].slot * 3;
}

export function LiteraryAvatar({ id, label, choice, small = false }: { id: string; label: string; choice?: number | null; small?: boolean }) {
  const slot = avatarChoiceFor(id, choice) / 3;
  const avatar = NEUTRAL_AVATARS.find((item) => item.slot === slot) ?? NEUTRAL_AVATARS[0];
  const index = avatar.number - 1;
  const [background, accent] = colors[index % colors.length];
  const band = Math.floor(index / colors.length);
  const offset = (index % 3) * 8 + band * 5;

  return <span className={`literary-avatar${small ? " literary-avatar--small" : ""}`} role="img" aria-label={`Avatar ${avatar.number} de ${label}`}>
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <rect width="160" height="160" fill={background} />
      <circle cx={35 + offset} cy={46} r="42" fill={accent} opacity="0.82" />
      <circle cx={122 - offset} cy="120" r="53" fill={accent} opacity="0.56" />
      <path d={index % 2 === 0 ? "M-10 124 Q64 62 170 88 L170 170 L-10 170Z" : "M-10 96 Q75 151 170 60 L170 170 L-10 170Z"} fill={accent} opacity="0.64" />
      <circle cx={80} cy={80} r={18 + band * 7 + (index % 3) * 2} fill={background} opacity="0.86" />
      <circle cx={80} cy={80} r="9" fill={accent} />
    </svg>
  </span>;
}
