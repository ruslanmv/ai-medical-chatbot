"""Service layer for MedOS-compatible meta search.

Features:
- unified entity search: pharmacy | doctor | all
- in-memory TTL cache for faster repeated lookups
- dedup + sorting by distance
"""

from __future__ import annotations

from dataclasses import asdict
from math import radians, sin, cos, sqrt, atan2
from pathlib import Path
import importlib.util
import time
from typing import Dict, List, Tuple


_CACHE: Dict[Tuple[float, float, int, str, int], Tuple[float, List[dict]]] = {}
_CACHE_TTL_SECONDS = 120


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * atan2(sqrt(a), sqrt(1 - a))


def _load_provider_module():
    provider_path = Path(__file__).resolve().parents[1] / "04-providers" / "overpass_provider.py"
    spec = importlib.util.spec_from_file_location("overpass_provider", provider_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def _normalize_and_rank(items: List[dict], lat: float, lon: float, limit: int) -> List[dict]:
    seen = set()
    normalized: List[dict] = []

    for item in items:
        name = (item.get("name") or "Unknown").strip()
        p_lat = item.get("lat")
        p_lon = item.get("lon")
        if p_lat is None or p_lon is None:
            continue
        dedup_key = (name.lower(), round(float(p_lat), 5), round(float(p_lon), 5), item.get("category"))
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        item["distance_m"] = round(_haversine_m(lat, lon, float(p_lat), float(p_lon)), 1)
        item["source"] = item.get("source") or "osm_overpass"
        normalized.append(item)

    normalized.sort(key=lambda x: x["distance_m"])
    return normalized[:limit]


def meta_search(lat: float, lon: float, radius_m: int, entity_type: str, limit: int = 25) -> List[dict]:
    cache_key = (round(lat, 4), round(lon, 4), radius_m, entity_type, limit)
    now = time.time()
    if cache_key in _CACHE:
        ts, payload = _CACHE[cache_key]
        if now - ts <= _CACHE_TTL_SECONDS:
            return payload

    provider = _load_provider_module()
    query_entities = ["pharmacy", "doctor"] if entity_type == "all" else [entity_type]
    raw: List[dict] = []

    for entity in query_entities:
        places = provider.fetch_nearby_from_overpass(lat, lon, radius_m, entity)
        for p in places:
            row = asdict(p)
            raw.append(row)

    ranked = _normalize_and_rank(raw, lat, lon, limit=limit)
    _CACHE[cache_key] = (now, ranked)
    return ranked
