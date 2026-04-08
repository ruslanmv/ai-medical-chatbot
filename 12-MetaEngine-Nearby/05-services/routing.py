from typing import Literal


def estimate_eta_min(distance_m: float, mode: Literal["walking", "driving"] = "walking") -> int:
    speed_m_per_min = 80 if mode == "walking" else 500
    return max(1, int(round(distance_m / speed_m_per_min)))
