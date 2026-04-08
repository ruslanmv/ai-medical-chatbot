"""Additive v2 orchestration layer.

Builds on existing v1 meta_search and enriches results with:
- verification placeholder
- ETA estimates
- routing links
- score breakdown
"""

from pathlib import Path
import importlib.util
from typing import Dict, List


def _load(module_name: str, relative_path: str):
    path = Path(__file__).resolve().parents[1] / relative_path
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def _routing_links(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Dict:
    return {
        "walk_url": f"https://www.google.com/maps/dir/?api=1&origin={origin_lat},{origin_lon}&destination={dest_lat},{dest_lon}&travelmode=walking",
        "drive_url": f"https://www.google.com/maps/dir/?api=1&origin={origin_lat},{origin_lon}&destination={dest_lat},{dest_lon}&travelmode=driving",
    }


def search_v2(payload: Dict) -> Dict:
    nearby_service = _load("nearby_service", "05-services/nearby_service.py")
    routing = _load("routing", "05-services/routing.py")
    ranking = _load("ranking", "05-services/ranking.py")
    registry = _load("registry_provider", "04-providers/registry_provider.py")

    base = nearby_service.meta_search(
        lat=payload["lat"],
        lon=payload["lon"],
        radius_m=payload["radius_m"],
        entity_type=payload["entity_type"],
        limit=payload["limit"],
    )

    provider = registry.RegistryProvider()
    enriched: List[Dict] = []

    for item in base:
        row = provider.enrich(item)
        row["is_open_now"] = None
        row["eta_min"] = routing.estimate_eta_min(row.get("distance_m", 0.0), payload.get("transport_mode", "walking"))
        row["routing"] = _routing_links(payload["lat"], payload["lon"], row["lat"], row["lon"])
        row = ranking.score_result(row, verified_only=payload.get("filters", {}).get("verified_only", False))
        enriched.append(row)

    if payload.get("filters", {}).get("verified_only", False):
        enriched = [r for r in enriched if r.get("verification", {}).get("status") == "verified"]

    enriched.sort(key=lambda x: x.get("score", {}).get("total", 0), reverse=True)

    return {
        "count": len(enriched),
        "query": payload,
        "results": enriched,
    }
