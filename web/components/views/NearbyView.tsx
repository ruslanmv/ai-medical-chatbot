"use client";

import { useState, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Search,
  Pill,
  Stethoscope,
  Phone,
  Clock,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Map,
  LocateFixed,
  UserPlus,
  Check,
} from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";
import type { MedContact, ContactType } from "@/lib/health-store";

interface NearbyViewProps {
  language: SupportedLanguage;
  onSaveContact?: (contact: Omit<MedContact, "id" | "createdAt">) => void;
}

type EntityType = "all" | "pharmacy" | "doctor";

interface NearbyResult {
  id: string;
  name: string;
  category: string;
  phone?: string | null;
  opening_hours?: string | null;
  address?: string | null;
  lat: number;
  lon: number;
  distance_m: number;
  eta_walk_min?: number;
  eta_drive_min?: number;
  directions_url?: string;
  maps?: string;
}

const NEARBY_API = "/api/proxy/nearby";
const GEOCODE_API = "https://nominatim.openstreetmap.org/search";

export function NearbyView({ language, onSaveContact }: NearbyViewProps) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [entityType, setEntityType] = useState<EntityType>("all");
  const [results, setResults] = useState<NearbyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  /** Geocode a place name or postal code to coordinates */
  const geocodeLocation = useCallback(async (query: string) => {
    setGeoLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${GEOCODE_API}?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
        { headers: { "User-Agent": "MedOS/1.0" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setUserLat(lat);
        setUserLon(lon);
        setLocationName(data[0].display_name?.split(",").slice(0, 2).join(",") || query);
        return { lat, lon };
      } else {
        setError("Location not found. Try a different city name or postal code.");
        return null;
      }
    } catch {
      setError("Could not search for location. Check your connection.");
      return null;
    } finally {
      setGeoLoading(false);
    }
  }, []);

  /** Get user's GPS location */
  const getGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLon(pos.coords.longitude);
        setLocationName("Current location");
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied. Type a city name or postal code instead."
            : "Could not get location. Type a city name instead."
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /** Handle location search (text input) */
  const handleLocationSearch = useCallback(async () => {
    const query = locationName.trim();
    if (!query) return;
    const result = await geocodeLocation(query);
    if (result) {
      // Auto-search after geocoding
      await doSearch(result.lat, result.lon);
    }
  }, [locationName, geocodeLocation]);

  /** Core search function */
  const doSearch = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    setResults([]);
    setSelectedId(null);
    setSearched(true);

    // Wake check
    try {
      const h = await fetch(NEARBY_API, { signal: AbortSignal.timeout(5000) });
      if (!h.ok) {
        setWaking(true);
        for (let i = 0; i < 18; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const r = await fetch(NEARBY_API, { signal: AbortSignal.timeout(5000) }).catch(() => null);
          if (r?.ok) break;
        }
        setWaking(false);
      }
    } catch { setWaking(false); }

    try {
      const res = await fetch(NEARBY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, radius_m: 5000, entity_type: entityType, limit: 20 }),
      });
      const data = await res.json();
      if (data.results?.length > 0) {
        setResults(data.results);
      } else {
        setError("No pharmacies or doctors found nearby. Try a larger area or different location.");
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  /** Search with current coordinates */
  const searchNearby = useCallback(() => {
    if (userLat !== null && userLon !== null) {
      doSearch(userLat, userLon);
    }
  }, [userLat, userLon, doSearch]);

  const formatDistance = (m: number) =>
    m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

  const mapUrl = userLat && userLon
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${userLon - 0.02},${userLat - 0.015},${userLon + 0.02},${userLat + 0.015}&layer=mapnik&marker=${userLat},${userLon}`
    : null;

  return (
    <div className="flex-1 overflow-y-auto pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-ink-base tracking-tight flex items-center gap-2">
            <MapPin size={22} className="text-brand-500" />
            {t("nearby_title", language)}
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            {t("nearby_subtitle", language)}
          </p>
        </div>

        {/* Location input — city name, postal code, or GPS */}
        <div className="bg-surface-1 rounded-2xl border border-line/40 shadow-soft p-4 mb-4 space-y-3">
          {/* Text search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                placeholder={t("nearby_placeholder", language)}
                className="w-full bg-surface-0 border border-line/60 text-ink-base rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <button
              onClick={handleLocationSearch}
              disabled={geoLoading || !locationName.trim()}
              className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex-shrink-0"
            >
              {geoLoading ? <Loader2 size={16} className="animate-spin" /> : t("nearby_find", language)}
            </button>
          </div>

          {/* GPS button */}
          <button
            onClick={getGPSLocation}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-line/60 text-ink-base rounded-xl font-semibold text-sm hover:bg-surface-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <LocateFixed size={15} className="text-brand-500" />
            {loading && !waking ? t("nearby_detecting", language) : t("nearby_use_gps", language)}
          </button>

          {/* Location status */}
          {userLat !== null && userLon !== null && (
            <div className="flex items-center gap-2 px-1 pt-1">
              <div className="w-2 h-2 rounded-full bg-success-500 flex-shrink-0" />
              <span className="text-xs text-ink-muted truncate">
                {locationName || `${userLat.toFixed(4)}, ${userLon.toFixed(4)}`}
              </span>
            </div>
          )}
        </div>

        {/* Entity type selector */}
        <div className="flex gap-2 mb-4">
          {(["all", "pharmacy", "doctor"] as EntityType[]).map((type) => (
            <button
              key={type}
              onClick={() => setEntityType(type)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                entityType === type
                  ? "bg-brand-500 text-white shadow-soft"
                  : "bg-surface-1 border border-line/60 text-ink-muted hover:text-ink-base"
              }`}
            >
              {type === "pharmacy" ? <Pill size={14} /> : type === "doctor" ? <Stethoscope size={14} /> : <Search size={14} />}
              {type === "all" ? t("nearby_type_all", language) : type === "pharmacy" ? t("nearby_type_pharmacy", language) : t("nearby_type_doctor", language)}
            </button>
          ))}
        </div>

        {/* Search button */}
        {userLat !== null && userLon !== null && (
          <button
            onClick={searchNearby}
            disabled={loading}
            className="w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-5"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {waking ? t("nearby_waking", language) : t("nearby_searching", language)}
              </>
            ) : (
              <>
                <Search size={16} /> {t("nearby_search", language)}
              </>
            )}
          </button>
        )}

        {/* Map */}
        {mapUrl && searched && (
          <div className="mb-5 rounded-2xl overflow-hidden border border-line/40 shadow-soft">
            <iframe src={mapUrl} width="100%" height="200" style={{ border: 0 }} loading="lazy" title="Map" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 bg-warning-500/5 border border-warning-500/20 rounded-xl">
            <AlertTriangle size={16} className="text-warning-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-warning-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider px-1">
              {results.length} places found
            </p>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedId === r.id
                    ? "bg-brand-500/5 border-brand-500/40 shadow-soft"
                    : "bg-surface-1 border-line/40 hover:border-brand-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    r.category === "pharmacy" ? "bg-success-500/10 text-success-500" : "bg-brand-500/10 text-brand-500"
                  }`}>
                    {r.category === "pharmacy" ? <Pill size={18} /> : <Stethoscope size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-ink-base block truncate">{r.name}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-ink-muted">{formatDistance(r.distance_m)}</span>
                      {r.eta_walk_min && (
                        <span className="text-xs text-ink-subtle flex items-center gap-0.5">
                          <Clock size={10} /> {r.eta_walk_min} min walk
                        </span>
                      )}
                    </div>
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="text-xs text-brand-500 flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                        <Phone size={10} /> {r.phone}
                      </a>
                    )}
                  </div>
                  <ChevronRight size={16} className={`text-ink-subtle flex-shrink-0 transition-transform ${selectedId === r.id ? "rotate-90" : ""}`} />
                </div>

                {/* Expanded */}
                {selectedId === r.id && (
                  <div className="mt-3 pt-3 border-t border-line/30 space-y-2">
                    {r.address && <p className="text-xs text-ink-muted">{r.address}</p>}
                    {r.opening_hours && (
                      <p className="text-xs text-ink-muted flex items-center gap-1">
                        <Clock size={10} /> {r.opening_hours}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      {r.directions_url && (
                        <a href={r.directions_url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                          onClick={(e) => e.stopPropagation()}>
                          <Navigation size={12} /> {t("nearby_directions", language)}
                        </a>
                      )}
                      {r.maps && (
                        <a href={r.maps} target="_blank" rel="noopener noreferrer"
                          className="py-2.5 px-4 bg-surface-2 text-ink-muted rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-3 transition-all"
                          onClick={(e) => e.stopPropagation()}>
                          <Map size={12} /> {t("common_map", language)}
                        </a>
                      )}
                      {onSaveContact && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (savedIds.has(r.id)) return;
                            onSaveContact({
                              name: r.name,
                              type: r.category as ContactType,
                              phone: r.phone || undefined,
                              address: r.address || undefined,
                              openingHours: r.opening_hours || undefined,
                              lat: r.lat,
                              lon: r.lon,
                              directionsUrl: r.directions_url,
                              mapsUrl: r.maps,
                              source: "nearby_search",
                            });
                            setSavedIds((prev) => new Set(prev).add(r.id));
                          }}
                          disabled={savedIds.has(r.id)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            savedIds.has(r.id)
                              ? "bg-success-500/10 text-success-500"
                              : "bg-surface-2 text-ink-muted hover:text-brand-500 hover:bg-brand-500/10"
                          }`}>
                          {savedIds.has(r.id) ? <Check size={12} /> : <UserPlus size={12} />}
                          {savedIds.has(r.id) ? "Saved" : "Save"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!searched && !loading && userLat === null && (
          <div className="text-center py-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-500/10 flex items-center justify-center">
              <MapPin size={28} className="text-brand-500" />
            </div>
            <h3 className="font-bold text-ink-base text-lg mb-2">{t("nearby_find_healthcare", language)}</h3>
            <p className="text-sm text-ink-muted leading-relaxed max-w-[280px] mx-auto">
              {t("nearby_find_desc", language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
