from dataclasses import dataclass
from pathlib import Path
import importlib.util


@dataclass
class FakePlace:
    id: str
    name: str
    category: str
    lat: float
    lon: float
    address: str | None = None
    phone: str | None = None
    opening_hours: str | None = None


class FakeProvider:
    @staticmethod
    def fetch_nearby_from_overpass(lat, lon, radius_m, entity_type):
        return [
            FakePlace("1", "A Clinic", entity_type, lat + 0.001, lon + 0.001),
            FakePlace("2", "A Clinic", entity_type, lat + 0.001, lon + 0.001),
        ]


def _load_service():
    path = Path(__file__).resolve().parents[1] / "05-services" / "nearby_service.py"
    spec = importlib.util.spec_from_file_location("nearby_service", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_meta_search_dedup_and_limit(monkeypatch):
    service = _load_service()
    monkeypatch.setattr(service, "_load_provider_module", lambda: FakeProvider)

    out = service.meta_search(40.0, -70.0, 1000, "pharmacy", limit=10)
    assert len(out) == 1
    assert out[0]["name"] == "A Clinic"
