---
title: MedOS Nearby Finder
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# MedOS Nearby Finder

Find nearby pharmacies and doctors using OpenStreetMap.
Used by MedOS to help users locate healthcare services.

**API:** `POST /api/search` with `{lat, lon, radius_m, entity_type, limit}`
