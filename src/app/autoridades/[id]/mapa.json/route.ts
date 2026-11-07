import { authorityAsMarcText, getPublicAuthority } from "@/lib/public-subject-authority";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const record = await getPublicAuthority((await params).id);
  return record
    ? Response.json({ ...record, marc_text: authorityAsMarcText(record) }, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
