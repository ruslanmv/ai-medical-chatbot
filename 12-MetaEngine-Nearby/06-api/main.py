from pathlib import Path
import importlib.util

from fastapi import FastAPI, Response, HTTPException
from pydantic import BaseModel, Field


class NearbyRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_m: int = Field(3000, ge=100, le=50000)
    entity_type: str = Field("pharmacy", pattern="^(pharmacy|doctor|all)$")
    limit: int = Field(25, ge=1, le=100)


class MetaFilters(BaseModel):
    open_now: bool = False
    verified_only: bool = False
    specialty: str | None = None


class MetaSearchV2Request(NearbyRequest):
    locale: str = "en-US"
    transport_mode: str = Field("walking", pattern="^(walking|driving)$")
    filters: MetaFilters = MetaFilters()


def _load_service_module():
    service_path = Path(__file__).resolve().parents[1] / "05-services" / "nearby_service.py"
    spec = importlib.util.spec_from_file_location("nearby_service", service_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def _load_v2_module():
    service_path = Path(__file__).resolve().parents[1] / "05-services" / "meta_v2_service.py"
    spec = importlib.util.spec_from_file_location("meta_v2_service", service_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


app = FastAPI(title="MetaEngine Nearby API", version="0.3.0")
service = _load_service_module()
v2_service = _load_v2_module()


@app.get("/health")
def health():
    return {"status": "ok", "service": "metaengine-nearby", "version": "0.3.0"}


@app.post("/meta/search")
def meta_search(req: NearbyRequest):
    try:
        results = service.meta_search(
        lat=req.lat,
        lon=req.lon,
        radius_m=req.radius_m,
        entity_type=req.entity_type,
        limit=req.limit,
    )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Provider error: {exc}")

    req_dict = req.model_dump() if hasattr(req, "model_dump") else req.dict()
    return {
        "count": len(results),
        "query": req_dict,
        "results": results,
    }


@app.post("/meta/search/v2")
def meta_search_v2(req: MetaSearchV2Request, response: Response):
    payload = req.model_dump() if hasattr(req, "model_dump") else req.dict()
    try:
        data = v2_service.search_v2(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Provider error: {exc}")
    response.headers["X-MetaEngine-Version"] = "2"
    return data


@app.post("/nearby")
def nearby(req: NearbyRequest):
    return meta_search(req)
