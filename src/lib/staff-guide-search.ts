export type StaffGuideSearchRow = { published_slug: string | null; published_title: string | null; published_summary: string | null; published_html: string | null; published_section: string | null };

export const normalizeGuideSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function findStaffGuidePages(rows: StaffGuideSearchRow[], query: string) {
  const term = normalizeGuideSearch(query.trim());
  if (term.length < 2) return [];
  return rows.filter((row) => row.published_slug && row.published_title && normalizeGuideSearch(`${row.published_title} ${row.published_summary ?? ""} ${row.published_section ?? ""} ${(row.published_html ?? "").replace(/<[^>]+>/g, " ")}`).includes(term)).slice(0, 8);
}
