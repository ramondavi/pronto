import { authorityAsSkosJsonLd, getPublicAuthority } from "@/lib/public-subject-authority";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const record = await getPublicAuthority((await params).id);
  if (!record) return new Response("Autoridade não encontrada", { status: 404 });
  const origin = new URL(request.url).origin;
  return new Response(JSON.stringify(authorityAsSkosJsonLd(record, origin), null, 2), {
    headers: { "Content-Type": "application/ld+json; charset=utf-8", "Content-Disposition": `attachment; filename="autoridade-${record.id}.jsonld"`, "Cache-Control": "public, max-age=60" },
  });
}
