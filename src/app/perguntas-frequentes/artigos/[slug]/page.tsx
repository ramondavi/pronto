import { redirect } from "next/navigation";
export default async function LegacyArticlePage({ params }: { params: Promise<{ slug: string }> }) { redirect(`/ajuda/artigos/${(await params).slug}`); }
