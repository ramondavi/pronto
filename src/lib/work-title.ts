export function formatWorkTitle(title: string, subtitle?: string | null) {
  const second = subtitle?.trim();
  return second ? `${title.trim()}: ${second}` : title.trim();
}
