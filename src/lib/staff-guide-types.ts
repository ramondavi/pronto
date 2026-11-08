import type { StaffGuideSection } from "./staff-guide-sections";

export type StaffGuidePage = {
  id: string; slug: string; section: StaffGuideSection;
  audience: "team" | "administrator"; position: number;
  draft_title: string; draft_summary: string; draft_html: string; draft_screens: string;
  published_slug: string | null; published_section: string | null; published_audience: string | null; published_position: number | null;
  published_title: string | null; published_summary: string | null; published_html: string | null; published_screens: string | null;
  published_at: string | null; reviewed_version: string | null; updated_at: string;
};

export const staffGuideFields = "id,slug,section,audience,position,draft_title,draft_summary,draft_html,draft_screens,published_slug,published_section,published_audience,published_position,published_title,published_summary,published_html,published_screens,published_at,reviewed_version,updated_at";
