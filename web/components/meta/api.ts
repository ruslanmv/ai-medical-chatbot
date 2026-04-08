export type EntityType = "pharmacy" | "doctor" | "all";

export interface MetaSearchRequest {
  lat: number;
  lon: number;
  radius_m: number;
  entity_type: EntityType;
  limit: number;
}

export interface MetaSearchResultItem {
  id?: string;
  name: string;
  category: string;
  phone?: string;
  opening_hours?: string;
  lat: number;
  lon: number;
  distance_m: number;
  source?: string;
  maps?: string;
}

export interface MetaSearchResponse {
  count: number;
  query: MetaSearchRequest;
  results: MetaSearchResultItem[];
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
}

const DEFAULT_METAENGINE_API = "http://127.0.0.1:8090/meta/search";

export async function runMetaSearch(payload: MetaSearchRequest): Promise<MetaSearchResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_METAENGINE_API_URL || DEFAULT_METAENGINE_API;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaEngine request failed (${res.status}): ${text}`);
  }

  return (await res.json()) as MetaSearchResponse;
}

export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({ q: query, format: "json", limit: "1" });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) throw new Error("No location found for this query");
  return { lat: Number(data[0].lat), lon: Number(data[0].lon), display_name: data[0].display_name };
}

export function distanceKm(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

export function googleDirectionsUrl(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  mode: "walking" | "driving",
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${fromLat},${fromLon}`,
    destination: `${toLat},${toLon}`,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function osmEmbedMapUrl(centerLat: number, centerLon: number, markerLat?: number, markerLon?: number): string {
  const delta = 0.04;
  const left = centerLon - delta;
  const right = centerLon + delta;
  const top = centerLat + delta;
  const bottom = centerLat - delta;
  const marker = markerLat != null && markerLon != null ? `&marker=${markerLat},${markerLon}` : "";
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik${marker}`;
}
