from typing import Literal, Optional
from pydantic import BaseModel, Field


class MetaFilters(BaseModel):
    open_now: bool = False
    verified_only: bool = False
    specialty: Optional[str] = None


class MetaSearchV2Request(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_m: int = Field(3000, ge=100, le=50000)
    entity_type: Literal["pharmacy", "doctor", "all"] = "all"
    limit: int = Field(25, ge=1, le=100)
    locale: str = "en-US"
    transport_mode: Literal["walking", "driving"] = "walking"
    filters: MetaFilters = MetaFilters()
