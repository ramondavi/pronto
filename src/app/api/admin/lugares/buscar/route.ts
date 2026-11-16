import { createClient } from "@/lib/supabase/server";
import { userHasPermission } from "@/lib/staff-permissions";

export const runtime = "nodejs";

type PlaceSuggestion = {
  id: string; label: string; latitude: number; longitude: number;
  sourceUrl: string; inBrazil: boolean; state: string; municipality: string;
};

const cache = new Map<string, { until: number; results: PlaceSuggestion[] }>();
let nextRequest = Promise.resolve();
let lastRequestAt = 0;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function schedule<T>(operation: () => Promise<T>): Promise<T> {
  const task = nextRequest.then(async () => {
    const pause = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (pause) await new Promise((resolve) => setTimeout(resolve, pause));
    lastRequestAt = Date.now();
    return operation();
  });
  nextRequest = task.then(() => undefined, () => undefined);
  return task;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ results: [] }, { status: 401, headers });
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active" || !await userHasPermission(supabase, "admin.subjects.manage", profile.role))
    return Response.json({ results: [] }, { status: 403, headers });

  const query = new URL(request.url).searchParams.get("q")?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
  if (query.length < 3 || /[\x00-\x1f]/.test(query)) return Response.json({ results: [] }, { status: 400, headers });
  const key = query.toLocaleLowerCase("pt-BR");
  const saved = cache.get(key);
  if (saved && saved.until > Date.now()) return Response.json({ results: saved.results }, { headers });

  try {
    const results = await schedule(async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("accept-language", "pt-BR");
      url.searchParams.set("limit", "6");
      const response = await fetch(url, {
        headers: { "User-Agent": "Pronto-BIB-FAUFBA/0.1 (https://prontobib.vercel.app)", Accept: "application/json" },
        signal: AbortSignal.timeout(8000), cache: "no-store",
      });
      if (!response.ok) throw new Error("provider_unavailable");
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) return [];
      return payload.flatMap((item): PlaceSuggestion[] => {
        if (!item || typeof item !== "object") return [];
        const place = item as Record<string, unknown>;
        const latitude = Number(place.lat);
        const longitude = Number(place.lon);
        const id = Number(place.osm_id);
        const kind = place.osm_type;
        if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isSafeInteger(id) || id <= 0 || !["node", "way", "relation"].includes(String(kind))) return [];
        const address = place.address && typeof place.address === "object" ? place.address as Record<string, unknown> : {};
        const label = String(place.display_name ?? "").slice(0, 250);
        if (!label) return [];
        return [{ id: `${kind}/${id}`, label, latitude, longitude,
          sourceUrl: `https://www.openstreetmap.org/${kind}/${id}`,
          inBrazil: address.country_code === "br",
          state: typeof address.state === "string" ? address.state.slice(0, 120) : "",
          municipality: String(address.city ?? address.town ?? address.municipality ?? address.village ?? "").slice(0, 120),
        }];
      });
    });
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { until: Date.now() + 24 * 60 * 60 * 1000, results });
    return Response.json({ results }, { headers });
  } catch {
    return Response.json({ results: [], error: "A busca de lugares está indisponível. Marque o ponto manualmente no mapa." }, { status: 503, headers });
  }
}
