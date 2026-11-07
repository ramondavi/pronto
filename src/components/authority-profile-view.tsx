import { AppIcon, type AppIconName } from "@/components/app-icon";
import type { AuthorityPublicProfile } from "@/components/subject-authority-public-profile";

const labels = {
  pt: ["O que é", "Na produção da Faculdade", "Exemplos públicos", "Quando usar", "Quando evitar", "Por que este nome", "Relações com outros temas", "Fontes de fundamentação", "Revisado em"],
  en: ["What it means", "In the Faculty’s research", "Public examples", "When to use", "When to avoid", "Why this name", "Links to other themes", "Supporting sources", "Reviewed on"],
  es: ["Qué significa", "En la producción de la Facultad", "Ejemplos públicos", "Cuándo usar", "Cuándo evitar", "Por qué este nombre", "Relaciones con otros temas", "Fuentes de referencia", "Revisado el"],
  de: ["Bedeutung", "In der Forschung der Fakultät", "Öffentliche Beispiele", "Wann verwenden", "Wann vermeiden", "Warum dieser Name", "Beziehungen zu anderen Themen", "Quellen", "Geprüft am"],
  fr: ["Signification", "Dans les travaux de la Faculté", "Exemples publics", "Quand utiliser", "Quand éviter", "Pourquoi ce nom", "Liens avec d’autres thèmes", "Sources", "Révisé le"],
  it: ["Significato", "Nella produzione della Facoltà", "Esempi pubblici", "Quando usare", "Quando evitare", "Perché questo nome", "Relazioni con altri temi", "Fonti", "Revisionato il"],
} as const;

const entries: { key: keyof Omit<AuthorityPublicProfile, "reviewed_at">; icon: AppIconName; professional: boolean }[] = [
  { key: "plain_definition", icon: "book", professional: false },
  { key: "academic_context", icon: "document", professional: false },
  { key: "public_examples", icon: "link", professional: false },
  { key: "use_when", icon: "check", professional: true },
  { key: "avoid_when", icon: "help", professional: true },
  { key: "preferred_form_reason", icon: "shield", professional: true },
  { key: "relationship_explanation", icon: "hierarchy", professional: true },
  { key: "evidence_sources", icon: "document", professional: true },
];

export function AuthorityProfileView({ profile, language, professional = false, compact = false }: { profile?: AuthorityPublicProfile | null; language: keyof typeof labels; professional?: boolean; compact?: boolean }) {
  if (!profile) return null;
  const visible = entries.map((entry, index) => ({ ...entry, label: labels[language][index] })).filter((entry) => entry.professional === professional && profile[entry.key]?.trim());
  if (!visible.length && !(professional && profile.reviewed_at)) return null;
  return <div className={`authority-profile-view${compact ? " authority-profile-view--compact" : ""}`}>
    {visible.map((entry) => <section className="authority-profile-view__item" key={entry.key}><h3><AppIcon name={entry.icon} />{entry.label}</h3><p>{profile[entry.key]}</p></section>)}
    {professional && profile.reviewed_at && <p className="authority-profile-view__review"><AppIcon name="calendar" />{labels[language][8]} {new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(profile.reviewed_at))}</p>}
  </div>;
}
