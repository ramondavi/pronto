import { AppIcon } from "@/components/app-icon";

export function RepositoryEmailContact({ label }: { label: string }) {
  return <div className="repository-email-contact"><span>{label}</span><a href="mailto:repositorio@ufba.br"><AppIcon name="message" /><strong>repositorio@ufba.br</strong></a></div>;
}
