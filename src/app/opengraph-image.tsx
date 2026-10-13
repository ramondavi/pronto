import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getInterfaceLanguage } from "@/lib/server-language";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pronto! Biblioteca FAUFBA — Assistente de Fichas Catalográficas e Autodepósito";

const copy = {
  pt: ["Assistente de Fichas Catalográficas e Autodepósito", "Biblioteca da Faculdade de Arquitetura"],
  en: ["Catalog Record and Self-deposit Assistant", "Faculty of Architecture Library"],
  es: ["Asistente de fichas catalográficas y autodepósito", "Biblioteca de la Facultad de Arquitectura"],
  de: ["Assistent für Katalogeinträge und Selbsteinreichung", "Bibliothek der Fakultät für Architektur"],
  fr: ["Assistant de catalogage et d’auto-dépôt", "Bibliothèque de la faculté d’architecture"],
  it: ["Assistente per schede catalografiche e autodeposito", "Biblioteca della Facoltà di Architettura"],
};

export default async function OpenGraphImage() {
  const [tagline, library] = copy[await getInterfaceLanguage()];
  const logo = await readFile(path.join(process.cwd(), "public", "logo-pronto-v2-light.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 48, background: "#f4f6f9", color: "#172033", padding: "74px" }}><img src={logoSrc} alt="" width={1030} height={241} style={{ objectFit: "contain" }} /><div style={{ display: "flex", flexDirection: "column", gap: 18 }}><span style={{ fontSize: 38, lineHeight: 1.2, fontWeight: 700 }}>{tagline}</span><span style={{ fontSize: 22, color: "#45546b" }}>{library}</span></div></div>, size);
}
