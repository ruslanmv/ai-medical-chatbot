"""
MedOS Nearby Finder — HuggingFace Space (Docker SDK)

Find nearby pharmacies and doctors using OpenStreetMap.
Gradio UI at / + REST API at /api/*.

Key: ssr_mode=False prevents 307 redirect loops in HF iframe.
     root_path="" ensures correct HTTPS URL generation.
"""

import math
import json
import os
import requests
import gradio as gr

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "medos-nearby-finder/1.0"


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
    resp = requests.get(NOMINATIM_URL, params={"q": query_str, "format": "json", "limit": 5}, headers={"User-Agent": USER_AGENT}, timeout=10)
    resp.raise_for_status()
    return [{"lat": float(r["lat"]), "lon": float(r["lon"]), "display_name": r.get("display_name", "")} for r in resp.json()]


def search_ui(location_or_lat, lon_str, radius_m, entity_type, limit):
    lat, lon = None, None
    try:
        lat, lon = float(location_or_lat), float(lon_str)
    except (ValueError, TypeError):
        pass
    if lat is None:
        place = str(location_or_lat).strip()
        if not place:
            return "Please enter a location.", [], "{}"
        try:
            geo = geocode(place)
            if not geo:
                return f"Could not find: {place}", [], "{}"
            lat, lon = geo[0]["lat"], geo[0]["lon"]
        except Exception as e:
            return f"Geocoding error: {e}", [], "{}"
    try:
        results = meta_search(lat, lon, int(radius_m), entity_type, int(limit))
    except Exception as e:
        return f"Search error: {e}", [], json.dumps({"error": str(e)}, indent=2)
    if not results:
        return f"No results near ({lat:.4f}, {lon:.4f}).", [], json.dumps({"count": 0}, indent=2)
    lines, table = [], []
    for r in results:
        dist = f"{r['distance_m']}m" if r["distance_m"] < 1000 else f"{r['distance_m']/1000:.1f}km"
        lines.append(f"[{r['category'].upper()}] {r['name']} - {dist} ({r['eta_walk_min']} min walk)")
        table.append([r["category"], r["name"], r.get("phone") or "N/A", dist, f"{r['eta_walk_min']} min", r["maps"]])
    return "\n".join(lines), table, json.dumps({"count": len(results), "results": results}, indent=2, ensure_ascii=False)


# ============================================================
# Gradio app — simple Blocks, no SSR, no mount_gradio_app
# ============================================================

with gr.Blocks(
    title="MedOS Nearby Finder",
    theme=gr.themes.Soft(primary_hue="blue", secondary_hue="teal"),
    css="footer { display: none !important; }",
) as demo:
    gr.Markdown("# MedOS Nearby Finder\nFind nearby **pharmacies** and **doctors** using OpenStreetMap data.\n\n**API:** `POST /api/search` with `{lat, lon, radius_m, entity_type, limit}`")

    with gr.Row():
        with gr.Column(scale=1):
            loc = gr.Textbox(label="Location (city name or latitude)", value="New York", placeholder="e.g. Rome, Tokyo, 40.7128")
            lon_input = gr.Textbox(label="Longitude (leave empty for city name)", value="", placeholder="e.g. -74.006")
            radius = gr.Slider(label="Radius (meters)", minimum=200, maximum=50000, step=100, value=3000)
            etype = gr.Radio(["all", "pharmacy", "doctor"], label="Search type", value="all")
            lim = gr.Slider(label="Max results", minimum=5, maximum=100, step=5, value=25)
            btn = gr.Button("Search Nearby", variant="primary", size="lg")

        with gr.Column(scale=1):
            summary = gr.Textbox(label="Results Summary", lines=10, interactive=False)
            tbl = gr.Dataframe(
                headers=["Type", "Name", "Phone", "Distance", "Walk ETA", "Map Link"],
                label="Nearby Places",
            )
            raw = gr.Textbox(label="API Response (JSON)", lines=6, interactive=False)

    btn.click(search_ui, inputs=[loc, lon_input, radius, etype, lim], outputs=[summary, tbl, raw])

    gr.Markdown("**Privacy:** Location data is processed server-side and not stored. Uses OpenStreetMap Overpass API.")


# ============================================================
# REST API routes — MUST be registered at module level for
# Gradio SDK mode (HF Spaces doesn't run __main__)
# ============================================================

from fastapi import Request
from fastapi.responses import JSONResponse

# Force app creation by calling queue()
demo.queue()

@demo.app.get("/api/health")
async def health():
    return {"status": "ok", "service": "nearby-finder", "version": "1.3.0"}


@demo.app.post("/api/search")
async def api_search(request: Request):
    try:
        body = await request.json()
        lat = float(body.get("lat", 0))
        lon = float(body.get("lon", 0))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return JSONResponse({"error": "Invalid coordinates"}, status_code=400)
        results = meta_search(lat, lon, int(body.get("radius_m", 3000)), body.get("entity_type", "all"), int(body.get("limit", 25)))
        return JSONResponse({"count": len(results), "query": {"lat": lat, "lon": lon}, "results": results})
    except Exception as e:
        return JSONResponse({"error": str(e), "count": 0, "results": []}, status_code=500)


@demo.app.get("/api/geocode")
async def api_geocode(q: str = ""):
    if not q.strip():
        return JSONResponse({"error": "q parameter required"}, status_code=400)
    try:
        results = geocode(q.strip())
        return JSONResponse({"query": q, "count": len(results), "results": results})
    except Exception as e:
        return JSONResponse({"error": str(e), "results": []}, status_code=500)


if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=int(os.environ.get("GRADIO_SERVER_PORT", "7860")),
        ssr_mode=False,
        share=False,
    )
