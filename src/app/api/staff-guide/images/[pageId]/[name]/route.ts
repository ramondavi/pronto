import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ pageId: string; name: string }> }) {
  const { pageId, name } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(pageId) || !/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(name)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 404 });
  const { data: page } = await supabase.from("staff_guide_pages").select("id").eq("id", pageId).maybeSingle();
  if (!page) return new Response(null, { status: 404 });
  const { data, error } = await supabase.storage.from("staff-guide-images").download(`${pageId}/${name}`);
  if (error || !data) return new Response(null, { status: 404 });
  const type = name.endsWith(".png") ? "image/png" : name.endsWith(".jpg") ? "image/jpeg" : "image/webp";
  return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
