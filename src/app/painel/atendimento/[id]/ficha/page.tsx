import { redirect } from "next/navigation";

export default async function CatalogingCardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ origem?: string }> }) {
  const { id } = await params;
  const origin = (await searchParams).origem === "meus" ? "&origem=meus" : "";
  redirect(`/painel/atendimento/${id}?etapa=review${origin}`);
}
