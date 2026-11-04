import Link from "next/link";
import type { AuthorityMapPoint } from "@/lib/authority-map";
import { authorityMapCopy } from "@/lib/authority-map-copy";

type Language = keyof typeof authorityMapCopy;

export function AuthorityMapPreview({ points, language }: { points: AuthorityMapPoint[]; language: Language }) {
  const t = authorityMapCopy[language];
  const brazil = points.filter((point) => point.in_brazil && point.longitude >= -73.9833 && point.longitude <= -34.8027 && point.latitude >= -33.7438 && point.latitude <= 5.2718);
  const places = Array.from(new Map(brazil.map((point) => [point.place_label.toLocaleLowerCase("pt-BR"), point])).values()).slice(0, 4);
  return <Link href="/autoridades/mapa" className="authority-map-preview" aria-label={t.open}>
    <div className="authority-map-preview__top"><span className="eyebrow">{t.preview}</span><span aria-hidden="true">↗</span></div>
    <div className="authority-map-preview__canvas" aria-hidden="true">
      <div className="authority-map-preview__brazil" />
      {places.map((point, index) => <span className="authority-map-preview__point" key={`${point.authority_id}-${point.place_label}`} style={{ left: `${19 + (point.longitude + 73.9833) / 39.1806 * 65}%`, top: `${2 + (5.2718 - point.latitude) / 39.0156 * 96}%`, animationDelay: `${index * 2.8}s` }}><i /> <span>{point.place_label}</span></span>)}
      {places.length === 0 && <span className="authority-map-preview__empty">{t.empty}</span>}
    </div>
    <span className="authority-map-preview__action">{t.open} <span aria-hidden="true">→</span></span>
  </Link>;
}
