import { getPublicAuthority, authorityAsMarcXml } from "@/lib/public-subject-authority";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const record = await getPublicAuthority((await params).id);
  if (!record) return new Response("Autoridade não encontrada", { status: 404 });
  return new Response(authorityAsMarcXml(record), {
    headers: { "Content-Type": "application/marcxml+xml; charset=utf-8", "Content-Disposition": `attachment; filename="autoridade-${record.id}.xml"`, "Cache-Control": "public, max-age=60" },
  });
}
