import { AppIcon } from "@/components/app-icon";

export function StudentRequestHistoryEmpty({ title, description }: { title: string; description: string }) {
  return <section className="student-request-history student-request-history--empty" aria-label={title}>
    <AppIcon name="archive" />
    <h2>{title}</h2>
    <p>{description}</p>
  </section>;
}
