from typing import Dict


def score_result(item: Dict, verified_only: bool = False) -> Dict:
    distance_m = float(item.get("distance_m", 0))
    verification = item.get("verification", {})
    verified = verification.get("status") == "verified"

    distance_score = max(0.0, 1.0 - min(distance_m / 10000.0, 1.0))
    verified_score = 1.0 if verified else 0.4

    total = (0.65 * distance_score) + (0.35 * verified_score)
    if verified_only and not verified:
        total = 0.0

    item["score"] = {
        "total": round(total, 4),
        "breakdown": {
            "distance": round(distance_score, 4),
            "verified": round(verified_score, 4),
        },
    }
    return item
