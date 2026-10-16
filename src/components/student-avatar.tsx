export function StudentAvatar({ name, small = false }: { name: string; small?: boolean }) {
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase("pt-BR") ?? "E";
  return <span className={`student-avatar literary-avatar${small ? " student-avatar--small literary-avatar--small" : ""}`} role="img" aria-label={`Avatar de ${name}`}>
    <svg className="student-avatar__mosaic" viewBox="0 0 42 42" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M32 3h4v4h-4zM37 10h3v3h-3zM34 29h5v5h-5zM29 35h4v4h-4zM36 37h3v3h-3z" fill="currentColor" />
    </svg>
    <span className="student-avatar__initial" aria-hidden="true">{initial}</span>
  </span>;
}
