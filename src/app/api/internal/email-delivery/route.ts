import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import nodemailer from "nodemailer";
import { transactionalEmailHtml, transactionalEmailText } from "@/lib/email-html";

export const runtime = "nodejs";
export const maxDuration = 60;

type QueuedEmail = {
  email_id: string;
  recipient: string;
  subject: string;
  text_body: string;
  claim_attempt: number;
  queue_name: "request" | "account";
};

function authorized(request: Request, secret: string): boolean {
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const actualBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const workerSecret = process.env.EMAIL_WORKER_SECRET;
  if (!workerSecret || !authorized(request, workerSecret)) return new Response(null, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url || !serviceKey || !smtpPassword || !siteUrl) {
    return Response.json({ error: "email_delivery_not_configured" }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("claim_production_email_outbox", { batch_limit: 5 });
  if (error) return Response.json({ error: "outbox_claim_failed" }, { status: 503 });

  const transporter = nodemailer.createTransport({
    host: "smtps.ufba.br",
    port: 465,
    secure: true,
    auth: { user: "bibarq@ufba.br", pass: smtpPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  let delivered = 0;
  let failed = 0;
  for (const email of (data ?? []) as QueuedEmail[]) {
    let succeeded = false;
    let errorCode: string | null = null;
    try {
      const result = await transporter.sendMail({
        from: "BIB/FAUFBA | Pronto! <bibarq@ufba.br>",
        to: email.recipient,
        messageId: `<${email.email_id}@prontobib.vercel.app>`,
        subject: email.subject,
        text: transactionalEmailText(email.subject, email.text_body, siteUrl),
        html: transactionalEmailHtml(email.subject, email.text_body, siteUrl),
        attachments: [{ filename: "email-header-pronto.png", path: path.join(process.cwd(), "public", "email-header-pronto.png"), cid: "pronto-header" }],
      });
      succeeded = result.accepted.some((recipient) => (typeof recipient === "string" ? recipient : recipient.address).toLowerCase() === email.recipient.toLowerCase());
      if (!succeeded) errorCode = "recipient_rejected";
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "delivery_failed";
      errorCode = /^[A-Z0-9_]{1,30}$/.test(code) ? code : "delivery_failed";
    }
    const { error: completionError } = await supabase.rpc("complete_production_email_delivery", {
      target_email_id: email.email_id,
      target_queue_name: email.queue_name,
      target_claim_attempt: email.claim_attempt,
      succeeded,
      error_code: errorCode,
    });
    if (completionError) return Response.json({ error: "outbox_completion_failed" }, { status: 503 });
    if (succeeded) delivered += 1;
    else failed += 1;
  }
  return Response.json({ delivered, failed });
}
