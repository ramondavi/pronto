export type StaffGuideTopic = { id: string; title: string; level: number };

export function staffGuideTopics(headings: { title: string; level: number }[]): StaffGuideTopic[] {
  const used = new Set<string>();
  return headings.map(({ title, level }, index) => {
    const base = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `topico-${index + 1}`;
    let id = `topico-${base}`;
    let suffix = 2;
    while (used.has(id)) id = `topico-${base}-${suffix++}`;
    used.add(id);
    return { id, title, level };
  });
}
