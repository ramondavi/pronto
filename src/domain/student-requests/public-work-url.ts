/** Checks that a public work link points beyond a provider's home page. */
export function isPublicWorkUrlCandidate(value: string): boolean {
  if (value !== value.trim() || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(url.hostname)
      && !/^\d+(?:\.\d+){3}$/.test(url.hostname)
      && url.pathname.split("/").some(Boolean);
  } catch {
    return false;
  }
}
