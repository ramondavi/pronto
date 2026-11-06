import { createClient } from "@/lib/supabase/server";

export type AuthorityMapPoint = {
  authority_id: string;
  term_label: string;
  place_label: string;
  latitude: number;
  longitude: number;
  in_brazil: boolean;
  kind: "heading" | "subdivision" | "associated";
  geography: { continent?: string; country?: string; macroregion?: string; state?: string; municipality?: string };
};

export async function getPublicAuthorityMapPoints(): Promise<AuthorityMapPoint[]> {
  const { data, error } = await (await createClient()).rpc("list_public_authority_map_points");
  if (error || !Array.isArray(data)) return [];
  return data.filter((point): point is AuthorityMapPoint =>
    point && typeof point.authority_id === "string" && typeof point.term_label === "string"
    && typeof point.place_label === "string" && Number.isFinite(point.latitude)
    && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90
    && Math.abs(point.longitude) <= 180 && typeof point.in_brazil === "boolean"
    && (point.kind === "heading" || point.kind === "subdivision" || point.kind === "associated"))
    .map((point) => ({ ...point, geography: point.geography && typeof point.geography === "object" ? point.geography : {} }));
}
