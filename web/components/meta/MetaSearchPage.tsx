"use client";

import { useMemo, useState } from "react";
import {
  MapPin,
  Phone,
  Stethoscope,
  Pill,
  Loader2,
  Navigation,
  Car,
  LocateFixed,
  Search,
} from "lucide-react";
import {
  runMetaSearch,
  geocodeLocation,
  distanceKm,
  googleDirectionsUrl,
  osmEmbedMapUrl,
  type EntityType,
  type MetaSearchResponse,
} from "./api";

export function MetaSearchPage() {
  const [lat, setLat] = useState(40.7128);
  const [lon, setLon] = useState(-74.0060);
  const [locationQuery, setLocationQuery] = useState("New York, NY");
  const [locationLabel, setLocationLabel] = useState("New York, NY");
  const [radius, setRadius] = useState(3000);
  const [entity, setEntity] = useState<EntityType>("all");
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetaSearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const closest = data?.results?.[selectedIndex] || null;

  const mapSrc = useMemo(() => {
    return osmEmbedMapUrl(lat, lon, closest?.lat, closest?.lon);
  }, [lat, lon, closest?.lat, closest?.lon]);

  const titleIcon = useMemo(() => {
    if (entity === "doctor") return <Stethoscope className="h-5 w-5 text-brand-500" />;
    if (entity === "pharmacy") return <Pill className="h-5 w-5 text-brand-500" />;
    return <MapPin className="h-5 w-5 text-brand-500" />;
  }, [entity]);

  const onUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Number(pos.coords.latitude.toFixed(6));
        const nextLon = Number(pos.coords.longitude.toFixed(6));
        setLat(nextLat);
        setLon(nextLon);
        setLocationLabel(`My location (${nextLat}, ${nextLon})`);
        setLocating(false);
      },
      (geoError) => {
        setError(`Unable to get current location: ${geoError.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSearchLocation = async () => {
    if (!locationQuery.trim()) return;
    setLocating(true);
    setError(null);
    try {
      const g = await geocodeLocation(locationQuery.trim());
      setLat(Number(g.lat.toFixed(6)));
      setLon(Number(g.lon.toFixed(6)));
      setLocationLabel(g.display_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search location");
    } finally {
      setLocating(false);
    }
  };

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await runMetaSearch({
        lat,
        lon,
        radius_m: radius,
        entity_type: entity,
        limit,
      });
      setData(response);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected MetaEngine error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-0 text-ink-base px-4 py-6 md:px-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="glass-strong rounded-2xl p-6 md:p-8 border border-line/70 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            {titleIcon}
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">MetaEngine Enterprise Search</h1>
          </div>
          <p className="text-ink-muted mb-6">
            The Google-style finder for nearby doctors and drug stores, with typed location search,
            distance in kilometers, and walking/driving route links.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <label className="lg:col-span-2 flex flex-col gap-2">
              <span className="text-sm text-ink-muted">Type a location</span>
              <div className="flex gap-2">
                <input
                  className="glass-card rounded-xl px-3 py-2 border border-line/60 flex-1"
                  placeholder="City, address, or place"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
                <button
                  onClick={onSearchLocation}
                  disabled={locating}
                  className="rounded-xl px-4 py-2 bg-surface-2 border border-line/70 hover:bg-surface-3 disabled:opacity-70 flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Find
                </button>
              </div>
            </label>

            <div className="flex items-end">
              <button
                onClick={onUseMyLocation}
                disabled={locating}
                className="w-full rounded-xl px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <LocateFixed className="h-4 w-4" />
                {locating ? "Locating..." : "Use my location"}
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-ink-muted">Current center: {locationLabel} • {lat}, {lon}</p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-ink-muted">Radius (meters)</span>
              <input className="glass-card rounded-xl px-3 py-2 border border-line/60" type="number" min={100} max={50000} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-ink-muted">Max results</span>
              <input className="glass-card rounded-xl px-3 py-2 border border-line/60" type="number" min={1} max={100} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-ink-muted">Search type</span>
              <div className="flex gap-2 flex-wrap">
                {(["all", "pharmacy", "doctor"] as EntityType[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setEntity(item)}
                    className={`rounded-full px-4 py-2 text-sm border transition ${
                      entity === item
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-surface-1 text-ink-base border-line hover:bg-surface-2"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={onSearch}
              disabled={loading}
              className="rounded-xl px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium disabled:opacity-70 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Searching..." : "Run Meta Search"}
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 glass-card rounded-2xl p-5 border border-line/60">
            <h2 className="font-semibold text-lg mb-3">Nearby results {data ? `(${data.count})` : ""}</h2>
            {!data ? (
              <p className="text-ink-muted text-sm">Run a search to view nearby places.</p>
            ) : data.results.length === 0 ? (
              <p className="text-ink-muted text-sm">No nearby places found.</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {data.results.map((item, idx) => (
                  <article
                    key={`${item.id || item.name}-${idx}`}
                    className={`rounded-xl border p-4 cursor-pointer transition ${
                      idx === selectedIndex
                        ? "border-brand-500 bg-brand-500/5"
                        : "border-line/60 bg-surface-1 hover:bg-surface-2"
                    }`}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-base">{item.name}</h3>
                        <p className="text-xs text-ink-muted">
                          {item.category} • {distanceKm(item.distance_m)}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-surface-2 border border-line/60">
                        {item.source || "osm_overpass"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <p className="flex items-center gap-2 text-ink-muted"><Phone className="h-4 w-4" />{item.phone || "N/A"}</p>
                      <a
                        href={googleDirectionsUrl(lat, lon, item.lat, item.lon, "walking")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-500 hover:underline"
                      >
                        <Navigation className="h-4 w-4" /> Walk route
                      </a>
                      <a
                        href={googleDirectionsUrl(lat, lon, item.lat, item.lon, "driving")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-500 hover:underline"
                      >
                        <Car className="h-4 w-4" /> Drive route
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="xl:col-span-2 glass-card rounded-2xl p-5 border border-line/60">
            <h2 className="font-semibold text-lg mb-3">Map & closest path</h2>
            <iframe
              title="Meta Search Map"
              src={mapSrc}
              className="w-full h-72 rounded-xl border border-line/60"
              loading="lazy"
            />
            {closest ? (
              <div className="mt-4 rounded-xl border border-line/60 bg-surface-1 p-3">
                <p className="text-sm font-medium">Closest: {closest.name}</p>
                <p className="text-xs text-ink-muted mb-2">
                  {closest.category} • {distanceKm(closest.distance_m)}
                </p>
                <div className="flex gap-2">
                  <a
                    href={googleDirectionsUrl(lat, lon, closest.lat, closest.lon, "walking")}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center rounded-lg px-3 py-2 bg-brand-500 text-white text-sm hover:bg-brand-600"
                  >
                    Walk
                  </a>
                  <a
                    href={googleDirectionsUrl(lat, lon, closest.lat, closest.lon, "driving")}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center rounded-lg px-3 py-2 bg-surface-2 border border-line/60 text-sm hover:bg-surface-3"
                  >
                    Drive
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Select a result to preview best path options.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default MetaSearchPage;
