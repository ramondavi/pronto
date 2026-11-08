import { redirect } from "next/navigation";

export default async function FormerStaffGuideArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/guia-equipe/${encodeURIComponent(slug)}`);
}
