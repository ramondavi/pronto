import { FeedbackInviteCard } from "@/components/feedback-invite-card";
import { getInterfaceLanguage } from "@/lib/server-language";
import { createClient } from "@/lib/supabase/server";
import { uiText } from "@/lib/ui-text";

export async function StudentFeedbackInvite({ request = false }: { request?: boolean }) {
  const supabase = await createClient();
  const { data: invitation } = await supabase.from("feedback_invitations").select("invited_at").eq("responded", false).order("invited_at", { ascending: false }).limit(1).maybeSingle();
  if (!invitation || Date.now() >= new Date(invitation.invited_at).getTime() + 30 * 86_400_000) return null;
  const language = await getInterfaceLanguage();
  return <FeedbackInviteCard href="/painel/avaliacao" request={request} label={(source) => uiText(language, source)} />;
}
