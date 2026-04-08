from dataclasses import dataclass
from typing import Optional


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
