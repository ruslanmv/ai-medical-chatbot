from pathlib import Path
import importlib.util
from fastapi import Response


def _load_api_module():
    path = Path(__file__).resolve().parents[1] / "06-api" / "main.py"
    spec = importlib.util.spec_from_file_location("meta_api_main", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_meta_search_v1_and_v2_routes_are_wired(monkeypatch):
    api_module = _load_api_module()

    class ServiceStub:
        @staticmethod
        def meta_search(lat, lon, radius_m, entity_type, limit):
            return [{"name": "A", "lat": lat, "lon": lon, "distance_m": 120, "category": entity_type}]

    class V2ServiceStub:
        @staticmethod
        def search_v2(payload):
            return {
                "count": 1,
                "query": payload,
                "results": [
                    {
                        "name": "B",
                        "lat": payload["lat"],
                        "lon": payload["lon"],
                        "distance_m": 110,
                        "category": payload["entity_type"],
                        "eta_min": 2,
                        "routing": {"walk_url": "w", "drive_url": "d"},
                        "score": {"total": 0.9, "breakdown": {"distance": 0.8, "verified": 0.5}},
                        "verification": {"status": "unverified", "source": "stub", "last_updated": None},
                    }
                ],
            }

    monkeypatch.setattr(api_module, "service", ServiceStub)
    monkeypatch.setattr(api_module, "v2_service", V2ServiceStub)

    req_v1 = api_module.NearbyRequest(
        lat=40.0,
        lon=-70.0,
        radius_m=2000,
        entity_type="doctor",
        limit=10,
    )
    v1_json = api_module.meta_search(req_v1)
    assert v1_json["count"] == 1
    assert "results" in v1_json

    req_v2 = api_module.MetaSearchV2Request(
        lat=40.0,
        lon=-70.0,
        radius_m=2000,
        entity_type="all",
        limit=10,
        locale="en-US",
        transport_mode="walking",
        filters={"open_now": False, "verified_only": False, "specialty": None},
    )
    response = Response()
    v2_json = api_module.meta_search_v2(req_v2, response)
    assert response.headers.get("X-MetaEngine-Version") == "2"
    assert v2_json["count"] == 1
    assert "eta_min" in v2_json["results"][0]
