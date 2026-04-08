from pathlib import Path
import importlib.util


def _load_space_app():
    path = Path(__file__).resolve().parents[1] / "12-deploy" / "hf-space-template" / "app.py"
    spec = importlib.util.spec_from_file_location("hf_space_app", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_space_meta_search_all_returns_categories(monkeypatch):
    app = _load_space_app()

    def fake_fetch(lat, lon, radius_m, amenity_tag, category):
        return [
            {
                "id": f"osm_{category}_1",
                "name": f"{category} place",
                "category": category,
                "phone": "N/A",
                "opening_hours": "N/A",
                "lat": lat + 0.001,
                "lon": lon + 0.001,
                "maps": "https://example.com",
            }
        ]

    monkeypatch.setattr(app, "_fetch_entity", fake_fetch)

    results = app.meta_search(40.0, -70.0, 1000, "all", 10)
    categories = {r["category"] for r in results}
    assert categories == {"pharmacy", "doctor"}
