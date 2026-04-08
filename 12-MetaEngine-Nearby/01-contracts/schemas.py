from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class NearbyRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_m: int = Field(3000, ge=100, le=50000)
    entity_type: Literal["pharmacy", "doctor"] = "pharmacy"


class NearbyItem(BaseModel):
    id: str
    name: str
    category: str
    lat: float
    lon: float
    address: Optional[str] = None
    phone: Optional[str] = None
    distance_m: Optional[float] = None
    is_open_now: Optional[bool] = None
    source: str = "osm_overpass"


class NearbyResponse(BaseModel):
    count: int
    results: List[NearbyItem]
