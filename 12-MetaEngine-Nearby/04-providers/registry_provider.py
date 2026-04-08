"""Registry provider abstraction (additive stub).

This is a compatibility-first interface for future national registry adapters.
"""

from typing import Dict


class RegistryProvider:
    def enrich(self, place: Dict) -> Dict:
        """Return additive verification metadata for a place."""
        return {
            **place,
            "verification": {
                "status": "unverified",
                "source": "registry_stub",
                "last_updated": None,
            },
        }
