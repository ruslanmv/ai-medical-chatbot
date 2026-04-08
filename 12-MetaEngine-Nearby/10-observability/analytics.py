import json
from datetime import datetime, timezone


def track(event_name: str, payload: dict) -> str:
    event = {
        "event": event_name,
        "ts": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    return json.dumps(event)
