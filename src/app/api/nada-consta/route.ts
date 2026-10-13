import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entre novamente para enviar o documento." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const requestId = String(form.get("requestId") ?? "");
  if (!(file instanceof File) || !requestId) return NextResponse.json({ error: "Selecione o PDF do Nada Consta." }, { status: 400 });
  if (!file.name.toLocaleLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "O arquivo precisa ter a extensão .pdf." }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "O tipo do arquivo não foi reconhecido como PDF." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "O PDF deve ter no máximo 5 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder("ascii").decode(bytes.slice(0, 5)) !== "%PDF-") return NextResponse.json({ error: "O conteúdo do arquivo não possui a assinatura válida de um PDF." }, { status: 400 });
  const path = `${requestId}/nada-consta.pdf`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const { error: storageError } = await supabase.storage.from("nada-consta").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (storageError) return NextResponse.json({ error: "Não foi possível armazenar o documento no espaço privado." }, { status: 400 });
  const { error: registerError } = await supabase.rpc("register_nada_consta_upload", { target_request_id: requestId, target_path: path, target_name: file.name, target_size: file.size, target_mime: file.type, target_sha256: sha256 });
  if (registerError) { await supabase.storage.from("nada-consta").remove([path]); return NextResponse.json({ error: "O protocolo não está pronto para receber este documento." }, { status: 400 }); }
  return NextResponse.json({ ok: true });
}
