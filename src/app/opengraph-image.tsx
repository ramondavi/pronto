import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Logo do Pronto! sobre fundo claro com quadrados inspirados no pictograma";

const squares = [
  { left: 48, top: 46, side: 84, color: "#dceaf3" },
  { left: 155, top: 74, side: 36, color: "#bcd7e7" },
  { left: 96, top: 163, side: 48, color: "#c9e0ed" },
  { left: 25, top: 233, side: 24, color: "#a8cde1" },
  { left: 1023, top: 42, side: 92, color: "#d2e5ef" },
  { left: 1137, top: 100, side: 34, color: "#a8cde1" },
  { left: 1084, top: 194, side: 42, color: "#bfd9e8" },
  { left: 51, top: 472, side: 96, color: "#d6e8f1" },
  { left: 175, top: 537, side: 34, color: "#afd1e3" },
  { left: 1031, top: 490, side: 82, color: "#c9e0ed" },
  { left: 1147, top: 533, side: 25, color: "#a8cde1" },
];

export default async function OpenGraphImage() {
  const logo = await readFile(path.join(process.cwd(), "public", "logo-pronto-v9-complete-light.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", overflow: "hidden", background: "#eff5f9" }}>
      {squares.map((square, index) => <div key={index} style={{ position: "absolute", left: square.left, top: square.top, width: square.side, height: square.side, borderRadius: 6, background: square.color }} />)}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 570, height: 400, border: "1px solid #d5e3ec", borderRadius: 24, background: "#ffffff", boxShadow: "0 18px 48px rgba(31, 73, 112, 0.12)" }}>
        <img src={logoSrc} alt="" width={500} height={114} style={{ objectFit: "contain", position: "relative", left: 48, top: -7 }} />
      </div>
    </div>,
    size,
  );
}
