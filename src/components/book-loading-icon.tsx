export function BookLoadingIcon({ compact = false }: { compact?: boolean }) {
  const page = "M12 6.5c2.8-1.7 5.3-2 8-1.2v11.5c-2.7-.8-5.2-.5-8 1.2V6.5Z";
  return <svg className={compact ? "book-loading-icon--compact" : "book-loading-icon"} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path className="book-loading-icon__cover" d="M2.5 5.5c3.2-1.1 6.4-.8 9.5 1v13c-3.1-1.8-6.3-2.1-9.5-1V5.5Zm19 0c-3.2-1.1-6.4-.8-9.5 1v13c3.1-1.8 6.3-2.1 9.5-1V5.5Z" />
    {["one", "two", "three"].map((turn) => (
      <g className={`book-loading-icon__page book-loading-icon__page--${turn}`} key={turn}>
        <path className="book-loading-icon__sheet" d={page} />
        <path className="book-loading-icon__page-lines" d="M14 9.5c1.4-.5 2.7-.6 4-.35M14 12c1.4-.5 2.7-.6 4-.35M14 14.5c1.4-.5 2.7-.6 4-.35" />
      </g>
    ))}
  </svg>;
}
