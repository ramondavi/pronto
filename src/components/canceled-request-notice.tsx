import { AppIcon } from "@/components/app-icon";
import { RelativeDateTime } from "@/components/relative-date-time";

type Labels = {
  status: string;
  reason: string;
  missingReason: string;
  details: string;
  program: string;
  registration: string;
  submitted: string;
  closed: string;
};

export function CanceledRequestNotice({ title, program, registration, submittedAt, reasons, labels }: {
  title: string;
  program: string;
  registration: string;
  submittedAt: string;
  reasons: string[];
  labels: Labels;
}) {
  return <section className="panel request-cancellation-notice" aria-labelledby="canceled-request-title">
    <div className="request-cancellation-notice__heading">
      <span className="request-cancellation-notice__icon" aria-hidden="true"><AppIcon name="close" /></span>
      <div><p className="eyebrow">{labels.status}</p><h2 id="canceled-request-title">{labels.reason}</h2></div>
    </div>
    <div className="request-cancellation-notice__reason">
      <AppIcon name="review" />
      <div>{reasons.length ? <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>{labels.missingReason}</p>}</div>
    </div>
    <div className="request-cancellation-notice__record">
      <p className="eyebrow">{labels.details}</p>
      <h3>{title}</h3>
      <dl className="request-summary__details">
        <div><dt className="request-summary__label"><AppIcon name="book" />{labels.program}</dt><dd>{program}</dd></div>
        <div><dt className="request-summary__label"><AppIcon name="tag" />{labels.registration}</dt><dd>{registration}</dd></div>
        <div><dt className="request-summary__label"><AppIcon name="calendar" />{labels.submitted}</dt><dd><RelativeDateTime value={submittedAt} /></dd></div>
      </dl>
    </div>
    <p className="request-cancellation-notice__footer">{labels.closed}</p>
  </section>;
}
