import { authorityAsIso2709, getPublicAuthority } from "@/lib/public-subject-authority";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const record = await getPublicAuthority((await params).id);
  if (!record) return new Response("Autoridade não encontrada", { status: 404 });
  const bytes = authorityAsIso2709(record);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/marc; charset=utf-8", "Content-Disposition": `attachment; filename="autoridade-${record.id}.mrc"`, "Cache-Control": "public, max-age=60" },
  });
}
