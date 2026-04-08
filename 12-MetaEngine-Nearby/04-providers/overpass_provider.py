"""Overpass provider helper.

Kept standalone so this folder can be copied into any service without package-name constraints.
"""

from dataclasses import dataclass
from typing import List, Optional
import requests


@dataclass
class Place:
    id: str
    name: str
    category: str
    lat: float
    lon: float
    address: Optional[str] = None
    phone: Optional[str] = None
    opening_hours: Optional[str] = None


def fetch_nearby_from_overpass(
    lat: float,
    lon: float,
    radius_m: int,
    entity_type: str,
    overpass_url: str = "https://overpass-api.de/api/interpreter",
    user_agent: str = "medos-metaengine-nearby/1.0",
) -> List[Place]:
    tag = "pharmacy" if entity_type == "pharmacy" else "doctors"
    query = f"""
[out:json][timeout:25];
(
  node[\"amenity\"=\"{tag}\"](around:{radius_m},{lat},{lon});
  way[\"amenity\"=\"{tag}\"](around:{radius_m},{lat},{lon});
  relation[\"amenity\"=\"{tag}\"](around:{radius_m},{lat},{lon});
);
out center tags;
""".strip()

    response = requests.post(
        overpass_url,
        data={"data": query},
        headers={"User-Agent": user_agent},
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()

    places: List[Place] = []
    for e in data.get("elements", []):
        tags = e.get("tags", {})
        center = e.get("center", {})
        p_lat = e.get("lat", center.get("lat"))
        p_lon = e.get("lon", center.get("lon"))
        if p_lat is None or p_lon is None:
            continue
        places.append(
            Place(
                id=f"osm_{e.get('type')}_{e.get('id')}",
                name=tags.get("name", "Unknown"),
                category=entity_type,
                lat=p_lat,
                lon=p_lon,
                address=tags.get("addr:full"),
                phone=tags.get("phone") or tags.get("contact:phone"),
                opening_hours=tags.get("opening_hours"),
            )
        )
    return places
