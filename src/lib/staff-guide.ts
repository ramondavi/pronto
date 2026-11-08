import "server-only";
import { safeKnowledgeHtml } from "./knowledge-service";
import { staffPanelReferenceByKey } from "./staff-panel-references";
import { staffGuideTopics } from "./staff-guide-topics";
import sanitizeHtml from "sanitize-html";

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type PublishedGuideSource = { published_slug: string | null; published_title: string | null; published_html: string | null };

function topicExcerpt(html: string, topicId: string) {
  const headings = Array.from(html.matchAll(/<h([23])\b[^>]*>[\s\S]*?<\/h\1>/gi)).map((match) => ({
    index: match.index, length: match[0].length, level: Number(match[1]), title: sanitizeHtml(match[0], { allowedTags: [], allowedAttributes: {} }).trim(),
  }));
  const topics = staffGuideTopics(headings.map(({ title, level }) => ({ title, level })));
  const index = topics.findIndex((topic) => topic.id === topicId);
  if (index < 0) return null;
  const end = headings.slice(index + 1).find((heading) => heading.level <= headings[index].level)?.index ?? html.length;
  return { title: topics[index].title, html: html.slice(headings[index].index + headings[index].length, end) };
}

export function safeStaffGuideHtml(html: string, sources: PublishedGuideSource[] = []) {
  const references: string[] = [];
  const inclusions: string[] = [];
  const withMarkers = html.replace(/<div\s+data-guide-include=["']([a-z0-9-]+(?:#topico-[a-z0-9-]+)?)["'](?:\s+data-guide-label=["'][^"']*["'])?\s*>\s*<\/div>/gi, (_match, sourceKey: string) => {
    const [slug, topicId] = sourceKey.split("#");
    const source = sources.find((item) => item.published_slug === slug && item.published_title && item.published_html);
    const excerpt = source && topicId ? topicExcerpt(source.published_html!, topicId) : null;
    const title = excerpt?.title ?? source?.published_title;
    const body = excerpt?.html ?? (!topicId ? source?.published_html : null);
    const marker = `PRONTO_STAFF_INCLUDE_${inclusions.length}_END`;
    if (!source || !title || !body) inclusions.push('<div class="staff-docs__include-missing">Trecho do guia indisponível para este perfil.</div>');
    else {
      const href = `/guia-equipe/${slug}${topicId ? `#${topicId}` : ""}`;
      const cleanBody = body.replace(/<div\s+data-guide-include=["'][^"']+["'][^>]*>\s*<\/div>/gi, "");
      inclusions.push(`<details class="staff-docs__include"><summary><strong>${escapeHtml(title)}</strong><a href="${href}" aria-label="Abrir ${escapeHtml(title)} no capítulo de origem">Abrir no guia ↗</a></summary><div class="staff-docs__include-body knowledge-rich-content">${safeStaffGuideHtml(cleanBody)}</div></details>`);
    }
    return marker;
  }).replace(/<span\s+data-panel-ref=["']([a-z0-9-]+)["']\s*>[^<]*<\/span>/gi, (_match, key: string) => {
    const reference = staffPanelReferenceByKey.get(key);
    if (!reference) return "";
    const marker = `PRONTO_STAFF_REFERENCE_${references.length}_END`;
    references.push(`<span class="staff-panel-reference${reference.kind === "field" ? " staff-panel-reference--field" : ""}" data-panel-ref="${escapeHtml(key)}" title="${escapeHtml(reference.group)}">${reference.icon ? '<span class="staff-panel-reference__icon" aria-hidden="true"></span>' : ""}<span>${escapeHtml(reference.label)}</span></span>`);
    return marker;
  }).replace(/src=(["'])\/api\/staff-guide\/images\/([0-9a-f-]{36})\/([0-9a-f-]{36}\.(?:png|jpg|webp))\1/gi,
    (_match, quote: string, pageId: string, fileName: string) => `src=${quote}https://pronto.invalid/staff-guide/images/${pageId}/${fileName}${quote}`);
  return safeKnowledgeHtml(withMarkers)
    .replace(/PRONTO_STAFF_REFERENCE_(\d+)_END/g, (_match, index: string) => references[Number(index)] ?? "")
    .replace(/PRONTO_STAFF_INCLUDE_(\d+)_END/g, (_match, index: string) => inclusions[Number(index)] ?? "")
    .replace(/https:\/\/pronto\.invalid\/staff-guide\/images\/([0-9a-f-]{36})\/([0-9a-f-]{36}\.(?:png|jpg|webp))/gi,
      (_match, pageId: string, fileName: string) => `/api/staff-guide/images/${pageId}/${fileName}`);
}
