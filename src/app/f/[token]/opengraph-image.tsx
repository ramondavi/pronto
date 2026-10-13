import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatWorkTitle } from "@/lib/work-title";

export const alt = "Imagem de compartilhamento do trabalho no Pronto!";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const prontoSquares = [[492, 43, 53, 55], [386, 96, 33, 33], [459, 114, 32, 32], [409, 161, 51, 51], [495, 171, 36, 38], [460, 224, 31, 31], [386, 225, 28, 27], [426, 259, 21, 21], [487, 272, 48, 49]];

export default async function CardOpenGraphImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const { data, error } = await (await createClient()).rpc("get_card_publication", { link_token: token }).maybeSingle();
  if (error || !data) notFound();
  const bibliography = (data as { bibliography?: { title?: string | null; subtitle?: string | null; author?: string | null; program?: string | null; work_nature?: string | null } }).bibliography;
  const title = bibliography?.title ? formatWorkTitle(bibliography.title, bibliography.subtitle) : "Registro bibliográfico";
  const titleSize = title.length > 160 ? 39 : title.length > 105 ? 46 : title.length > 65 ? 54 : 62;
  return new ImageResponse(<div style={{ display: "flex", position: "relative", flexDirection: "column", width: "100%", height: "100%", background: "#F3F3F1", color: "#0A0A0A", fontFamily: "sans-serif", overflow: "hidden" }}>
    {Array.from({ length: 8 }, (_, row) => Array.from({ length: 15 }, (_, column) => {
      const variant = (row * 7 + column * 11) % 9;
      if (variant === 0 || variant === 5) return null;
      const squareSize = [12, 22, 16, 30, 14, 24, 18, 28, 20][variant];
      return <div key={`${row}-${column}`} style={{ display: "flex", position: "absolute", left: column * 86 + ((row * 17 + column * 11) % 28) - 12, top: row * 86 + ((row * 13 + column * 19) % 30) - 10, width: squareSize, height: squareSize, border: variant % 3 === 0 ? "none" : "2px solid #1A3B70", borderRadius: 2, background: variant % 3 === 0 ? "#1A3B70" : "transparent", opacity: variant % 3 === 0 ? .055 : .04 }} />;
    }))}
    <div style={{ display: "flex", position: "absolute", flexDirection: "column", left: 76, top: 61, right: 76, gap: 9, color: "#1A3B70" }}>
      <span style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>{bibliography?.work_nature || "Trabalho acadêmico"}</span>
      {bibliography?.program && <span style={{ fontSize: 20, fontWeight: 500 }}>{bibliography.program}</span>}
    </div>
    <div style={{ display: "flex", position: "absolute", flexDirection: "column", justifyContent: "center", left: 76, right: 76, top: 166, height: 330, gap: 23 }}>
      <span style={{ fontSize: titleSize, fontWeight: 750, lineHeight: 1.12, overflow: "hidden", overflowWrap: "anywhere" }}>{title}</span>
      {bibliography?.author && <span style={{ fontSize: 25, fontWeight: 500, color: "#1A3B70" }}>{bibliography.author}</span>}
    </div>
    <div style={{ display: "flex", position: "absolute", left: 76, right: 76, bottom: 83, height: 1, background: "#0A0A0A", opacity: .22 }} />
    <div style={{ display: "flex", position: "absolute", left: 78, bottom: 24, width: 48, height: 49, opacity: .84 }}>
      {prontoSquares.map(([left, top, width, height], index) => <div key={index} style={{ display: "flex", position: "absolute", left: (left - 376) * .17, top: (top - 34) * .17, width: width * .17, height: height * .17, borderRadius: 1, background: "#0A0A0A" }} />)}
    </div>
    <div style={{ display: "flex", position: "absolute", right: 76, bottom: 38, color: "#0A0A0A", opacity: .72, fontSize: 17, fontWeight: 650, letterSpacing: .7 }}>UFBA · SIBI · FAUFBA</div>
  </div>, size);
}
