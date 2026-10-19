import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { RelativeDateTime } from "@/components/relative-date-time";

type Props = {
  title: string;
  protocol: string;
  program: string;
  completedAt: string;
  href: string;
  labels: { completed: string; protocol: string; program: string; completedAt: string; view: string };
};

export function StudentCompletedRecord({ title, protocol, program, completedAt, href, labels }: Props) {
  return <section className="next-action__completed-record" aria-label={labels.completed}>
    <span className="next-action__completed-icon" aria-hidden="true"><AppIcon name="check" /></span>
    <div className="next-action__completed-body">
      <p className="eyebrow">{labels.completed}</p>
      <h3>{title}</h3>
      <dl>
        <div><dt><AppIcon name="document" />{labels.protocol}</dt><dd>{protocol}</dd></div>
        <div><dt><AppIcon name="book" />{labels.program}</dt><dd>{program}</dd></div>
        <div><dt><AppIcon name="calendar" />{labels.completedAt}</dt><dd><RelativeDateTime value={completedAt} /></dd></div>
      </dl>
      <Link className="button button--secondary button--small button--with-icon" href={href}><AppIcon name="arrowRight" />{labels.view}</Link>
    </div>
  </section>;
}
