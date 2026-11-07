import Link from "next/link";
import type { AuthorityMapPoint } from "@/lib/authority-map";
import { authorityMapCopy } from "@/lib/authority-map-copy";

type Language = keyof typeof authorityMapCopy;

export function AuthorityMapPreview({ points, language }: { points: AuthorityMapPoint[]; language: Language }) {
  const t = authorityMapCopy[language];
  const brazil = points.filter((point) => point.in_brazil && point.longitude >= -73.9833 && point.longitude <= -34.8027 && point.latitude >= -33.7438 && point.latitude <= 5.2718);
  const places = Array.from(new Map(brazil.map((point) => [point.place_label.toLocaleLowerCase("pt-BR"), point])).values()).slice(0, 4);
  const examples = [
    { place_label: "Manaus", latitude: -3.12, longitude: -60.02 },
    { place_label: "Belém", latitude: -1.46, longitude: -48.49 },
    { place_label: "Brasília", latitude: -15.79, longitude: -47.88 },
    { place_label: "Salvador", latitude: -12.97, longitude: -38.51 },
    { place_label: "São Paulo", latitude: -23.55, longitude: -46.63 },
  ];
  const markers = places.length ? places.map((point) => ({ ...point, real: true as const })) : examples.map((point) => ({ ...point, real: false as const }));
  return <div className="authority-map-preview" aria-label={t.preview} role="group">
    <div className="authority-map-preview__canvas">
      <div className="authority-map-preview__brazil" />
      <Link className="authority-map-preview__open" href="/autoridades/mapa" aria-label={t.open} />
      {markers.map((point, index) => {
        const style = { left: `${8 + (point.longitude + 73.9833) / 39.1806 * 84}%`, top: `${2 + (5.2718 - point.latitude) / 39.0156 * 96}%`, animationDelay: `${index * 2.4}s` };
        const content = <><i /><span>{point.place_label}</span></>;
        return point.real
          ? <Link className="authority-map-preview__point authority-map-preview__point--real" href={`/autoridades/mapa?autoridade=${encodeURIComponent(point.authority_id)}`} key={`${point.authority_id}-${point.place_label}`} style={style} aria-label={`${point.place_label}: ${point.term_label}`}>{content}</Link>
          : <span className="authority-map-preview__point authority-map-preview__point--example" key={point.place_label} style={style} aria-hidden="true">{content}</span>;
      })}
    </div>
  </div>;
}
