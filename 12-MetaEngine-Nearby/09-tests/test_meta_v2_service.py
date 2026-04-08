from pathlib import Path
import importlib.util


def _load_v2():
    path = Path(__file__).resolve().parents[1] / "05-services" / "meta_v2_service.py"
    spec = importlib.util.spec_from_file_location("meta_v2_service", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_search_v2_adds_eta_routing_and_score(monkeypatch):
    v2 = _load_v2()

    class NearbyStub:
        @staticmethod
        def meta_search(**kwargs):
            return [
                {
                    "id": "x",
                    "name": "Test Pharmacy",
                    "category": "pharmacy",
                    "lat": 40.713,
                    "lon": -74.0,
                    "distance_m": 200,
                }
            ]

    class RoutingStub:
        @staticmethod
        def estimate_eta_min(distance_m, mode):
            return 3

    class RankingStub:
        @staticmethod
        def score_result(item, verified_only=False):
            item["score"] = {"total": 0.88, "breakdown": {"distance": 0.7, "verified": 0.4}}
            return item

    class RegistryStubProvider:
        class RegistryProvider:
            @staticmethod
            def enrich(place):
                place["verification"] = {"status": "unverified", "source": "stub", "last_updated": None}
                return place

    def fake_load(name, rel):
        if rel.endswith("nearby_service.py"):
            return NearbyStub
        if rel.endswith("routing.py"):
            return RoutingStub
        if rel.endswith("ranking.py"):
            return RankingStub
        if rel.endswith("registry_provider.py"):
            return RegistryStubProvider
        raise AssertionError(rel)

    monkeypatch.setattr(v2, "_load", fake_load)

    out = v2.search_v2(
        {
            "lat": 40.7128,
            "lon": -74.006,
            "radius_m": 3000,
            "entity_type": "pharmacy",
            "limit": 10,
            "transport_mode": "walking",
            "filters": {"verified_only": False},
        }
    )

    assert out["count"] == 1
    row = out["results"][0]
    assert row["eta_min"] == 3
    assert "routing" in row and "walk_url" in row["routing"]
    assert "score" in row and row["score"]["total"] == 0.88
