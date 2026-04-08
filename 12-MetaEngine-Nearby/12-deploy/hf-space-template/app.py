"""
MedOS Nearby Finder — HuggingFace Space (Docker SDK)

Find nearby pharmacies and doctors using OpenStreetMap.
Includes geocoding: type a place name → get GPS coordinates.

Endpoints:
  GET  /api/health              — Health check
  POST /api/search              — Search nearby pharmacies/doctors
  GET  /api/geocode?q=cityname  — Geocode a place name to lat/lon
  GET  /                        — Gradio UI
"""

import math
import json
import os
import requests
import gradio as gr
from fastapi import FastAPI, Request, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "medos-nearby-finder/1.0 (https://github.com/ruslanmv/ai-medical-chatbot)"


# ============================================================
# Core search logic
# ============================================================

def haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _fetch_entity(lat, lon, radius_m, amenity_tag, category):
    query = f'[out:json][timeout:25];(node["amenity"="{amenity_tag}"](around:{radius_m},{lat},{lon});way["amenity"="{amenity_tag}"](around:{radius_m},{lat},{lon}););out center tags;'
    resp = requests.post(OVERPASS_URL, data={"data": query}, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    rows = []
    for e in resp.json().get("elements", []):
        tags = e.get("tags", {})
        center = e.get("center", {})
        p_lat = e.get("lat", center.get("lat"))
        p_lon = e.get("lon", center.get("lon"))
        if p_lat is None or p_lon is None:
            continue
        rows.append({
            "id": f"osm_{e.get('type')}_{e.get('id')}",
            "name": tags.get("name", "Unknown"),
            "category": category,
            "phone": tags.get("phone") or tags.get("contact:phone") or None,
            "opening_hours": tags.get("opening_hours") or None,
            "address": tags.get("addr:full") or tags.get("addr:street") or None,
            "lat": p_lat, "lon": p_lon,
            "maps": f"https://www.openstreetmap.org/?mlat={p_lat}&mlon={p_lon}#map=17/{p_lat}/{p_lon}",
        })
    return rows


def meta_search(lat, lon, radius_m=3000, entity_type="all", limit=25):
    groups = []
    if entity_type in ("pharmacy", "all"):
        groups.extend(_fetch_entity(lat, lon, radius_m, "pharmacy", "pharmacy"))
    if entity_type in ("doctor", "all"):
        groups.extend(_fetch_entity(lat, lon, radius_m, "doctors", "doctor"))
    seen = set()
    unique = []
    for row in groups:
        key = (row["name"], round(row["lat"], 5), round(row["lon"], 5))
        if key not in seen:
            seen.add(key)
            unique.append(row)
    for row in unique:
        d = haversine_m(lat, lon, row["lat"], row["lon"])
        row["distance_m"] = round(d, 1)
        row["eta_walk_min"] = max(1, round(d / 80))
        row["eta_drive_min"] = max(1, round(d / 500))
        row["directions_url"] = f"https://www.google.com/maps/dir/{lat},{lon}/{row['lat']},{row['lon']}"
    unique.sort(key=lambda x: x["distance_m"])
    return unique[:limit]


def geocode(query_str):
    """Geocode a place name to lat/lon using Nominatim (OpenStreetMap)."""
    resp = requests.get(NOMINATIM_URL, params={
        "q": query_str, "format": "json", "limit": 5, "addressdetails": 1,
    }, headers={"User-Agent": USER_AGENT}, timeout=10)
    resp.raise_for_status()
    results = []
    for r in resp.json():
        results.append({
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "display_name": r.get("display_name", ""),
            "type": r.get("type", ""),
        })
    return results


# ============================================================
# Gradio UI handler
# ============================================================

def search_ui(location_or_lat, lon_str, radius_m, entity_type, limit):
    """Handle both place name search and direct lat/lon."""
    lat, lon = None, None

    # Try to parse as coordinates first
    try:
        lat = float(location_or_lat)
        lon = float(lon_str)
    except (ValueError, TypeError):
        pass

    # If not coordinates, try geocoding the location name
    if lat is None:
        try:
            place = str(location_or_lat).strip()
            if not place:
                return "Please enter a location or coordinates.", [], "{}"
            geo_results = geocode(place)
            if not geo_results:
                return f"Could not find location: {place}", [], "{}"
            lat = geo_results[0]["lat"]
            lon = geo_results[0]["lon"]
        except Exception as exc:
            return f"Geocoding error: {exc}", [], "{}"

    try:
        results = meta_search(lat, lon, int(radius_m), entity_type, int(limit))
    except Exception as exc:
        return f"Search error: {exc}", [], json.dumps({"error": str(exc)}, indent=2)

    if not results:
        return f"No results found near ({lat:.4f}, {lon:.4f}).", [], json.dumps({"count": 0}, indent=2)

    lines, table = [], []
    for r in results:
        dist = f"{r['distance_m']}m" if r["distance_m"] < 1000 else f"{r['distance_m']/1000:.1f}km"
        lines.append(f"[{r['category'].upper()}] {r['name']} — {dist} ({r['eta_walk_min']} min walk)")
        table.append([r["category"], r["name"], r.get("phone") or "N/A", dist, f"{r['eta_walk_min']} min", r["maps"]])
    return "\n".join(lines), table, json.dumps({"count": len(results), "location": {"lat": lat, "lon": lon}, "results": results}, indent=2, ensure_ascii=False)


# ============================================================
# FastAPI app with REST endpoints
# ============================================================

api_app = FastAPI(title="MedOS Nearby Finder")
api_app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@api_app.get("/api/health")
async def health():
    return {"status": "ok", "service": "nearby-finder", "version": "1.1.0"}


@api_app.post("/api/search")
async def api_search(request: Request):
    try:
        body = await request.json()
        lat = float(body.get("lat", 0))
        lon = float(body.get("lon", 0))
        radius_m = int(body.get("radius_m", 3000))
        entity_type = body.get("entity_type", "all")
        limit = int(body.get("limit", 25))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return JSONResponse({"error": "Invalid coordinates"}, status_code=400)
        results = meta_search(lat, lon, radius_m, entity_type, limit)
        return JSONResponse({"count": len(results), "query": {"lat": lat, "lon": lon, "radius_m": radius_m, "entity_type": entity_type}, "results": results})
    except Exception as e:
        return JSONResponse({"error": str(e), "count": 0, "results": []}, status_code=500)


@api_app.get("/api/geocode")
async def api_geocode(q: str = Query(..., min_length=1, description="Place name to geocode")):
    """Geocode a place name → lat/lon. Uses OpenStreetMap Nominatim."""
    try:
        results = geocode(q)
        return JSONResponse({"query": q, "count": len(results), "results": results})
    except Exception as e:
        return JSONResponse({"error": str(e), "query": q, "results": []}, status_code=500)


# ============================================================
# Gradio UI — mounted into FastAPI
# ============================================================

demo = gr.Interface(
    fn=search_ui,
    inputs=[
        gr.Textbox(label="Location (city name or latitude)", value="New York", placeholder="e.g. Rome, Tokyo, 40.7128"),
        gr.Textbox(label="Longitude (leave empty if using city name)", value="", placeholder="e.g. -74.006"),
        gr.Slider(label="Radius (meters)", minimum=200, maximum=50000, step=100, value=3000),
        gr.Radio(["all", "pharmacy", "doctor"], label="Type", value="all"),
        gr.Slider(label="Max results", minimum=5, maximum=100, step=5, value=25),
    ],
    outputs=[
        gr.Textbox(label="Results Summary", lines=10),
        gr.Dataframe(headers=["Type", "Name", "Phone", "Distance", "Walk ETA", "Map"], label="Nearby Places"),
        gr.Textbox(label="API Response (JSON)", lines=8),
    ],
    title="MedOS Nearby Finder",
    description="Find nearby pharmacies and doctors. Enter a city name or GPS coordinates. API: POST /api/search, GET /api/geocode?q=city",
    flagging_mode="never",
    cache_examples=False,
)

# Mount Gradio at /ui so /api/* routes are not intercepted
app = gr.mount_gradio_app(api_app, demo, path="/ui")


@api_app.get("/")
async def root():
    """Redirect root to Gradio UI."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse("/ui")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("GRADIO_SERVER_PORT", "7860")))
