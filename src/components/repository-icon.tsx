import { useId, type SVGProps } from "react";

export function RepositoryIcon(props: SVGProps<SVGSVGElement>) {
  const maskId = useId();
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
    <mask id={maskId}><rect width="64" height="64" fill="white" /><path d="M28 42c6-7 10-13 11-24" stroke="black" strokeWidth="2" strokeLinecap="round" /><path d="M38 31c-8 0-13-4-15-11 7-1 13 3 15 11Zm3-7c-1-7 2-12 7-15 3 7 1 12-7 15Zm-9 15c-7 1-12-2-15-8 7-2 12 0 15 8Zm6-1c2-6 6-9 12-9 0 7-4 11-12 9Z" fill="black" /></mask>
    <circle cx="26" cy="35" r="22" fill="currentColor" opacity=".35" />
    <circle cx="37" cy="29" r="22" fill="currentColor" mask={`url(#${maskId})`} />
  </svg>;
}
