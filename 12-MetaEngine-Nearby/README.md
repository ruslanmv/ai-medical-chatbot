# 12-MetaEngine-Nearby

This module is a clean **12-folder stack** for building a Nearby Finder MetaEngine that supports:

- DrugStores / Pharmacies near current location
- Doctor finder near current location
- Phone extraction when available
- Open/closed-now evaluation from `opening_hours`

> Important: this scaffold is intentionally built from original project structure and public standards,
> not by blindly copying third-party source code. You can plug in open-source providers safely by license.

## Stack Layout

1. `01-contracts` - API request/response schemas.
2. `02-config` - Environment/configuration loading.
3. `03-domain` - Core entities and business constants.
4. `04-providers` - External providers (Overpass, Nominatim, optional paid APIs).
5. `05-services` - Orchestration logic (distance, open status, dedup, ranking).
6. `06-api` - FastAPI entrypoint and routes.
7. `07-ui-space` - Hugging Face Space frontend (Gradio prototype).
8. `08-shared` - Common utilities used across layers.
9. `09-tests` - Unit/integration tests.
10. `10-observability` - Logging and metrics helpers.
11. `11-data-seeds` - Seed samples and fixtures.
12. `12-deploy` - Container/deploy artifacts.

## Quick Start

```bash
cd 12-MetaEngine-Nearby
python -m venv .venv
source .venv/bin/activate
pip install -r 12-deploy/requirements.txt
uvicorn 06-api.main:app --reload --port 8090
```

In a second terminal:

```bash
python 07-ui-space/app.py
```

## Makefile Commands

From `12-MetaEngine-Nearby/`:

```bash
make install
make run
make build
make run-space
make test
```

- `make run` starts the FastAPI service on port `8090`.
- `make run-space` starts local Gradio UI.
- `make build` builds local Docker image `metaengine-nearby:latest`.

## Why this refactor helps

- Clean separation between UI, API, providers, and domain logic.
- Easy to swap data providers later (OSM now, Google/Yelp later).
- Easier integration into your Medical OS main app as a microservice.


## MedOS MetaEngine Compatibility

The API now supports a MedOS-style meta endpoint:

- `POST /meta/search` with `entity_type` = `pharmacy`, `doctor`, or `all`
- `limit` parameter for bounded response size
- deterministic JSON envelope: `count`, `query`, `results`
- fast repeated calls via in-memory TTL cache in service layer

## Hugging Face Space Deployment

1. Install deploy dependency:

```bash
pip install -r 12-deploy/deploy-requirements.txt
```

2. Export token and deploy:

```bash
export HF_TOKEN=<your_token>
python 12-deploy/deploy_hf_space.py --space-id <your_username>/metaengine-nearby
```

3. Open deployed Space:

```text
https://huggingface.co/spaces/<your_username>/metaengine-nearby
```

## New MedOS-style Web UI Page (independent)

A new page is available at:

- `web/app/meta-search/page.tsx`
- `web/components/meta/MetaSearchPage.tsx`

Use `NEXT_PUBLIC_METAENGINE_API_URL` to point the UI to your MetaEngine backend endpoint (default: `http://127.0.0.1:8090/meta/search`).

## Enterprise Meta Search UI (React/TypeScript)

The independent page `web/app/meta-search/page.tsx` now supports:

- typed location search (geocoding via Nominatim)
- "Use my location" browser geolocation
- map rendering with embedded OpenStreetMap
- distance display in **kilometers**
- quick route links for **walking** and **driving**
- closest destination panel for rapid navigation

See also: `TOP1_WORLDWIDE_STRATEGY.md` for the global product + API roadmap.

## Additive Priority Implementation (non-destructive)

Implemented first critical tickets in additive mode:

- New `POST /meta/search/v2` endpoint (keeps v1 untouched)
- v2 response includes `eta_min`, `routing`, `score`, and `verification` placeholder
- Added provider abstraction stub: `04-providers/registry_provider.py`
- Added scoring module: `05-services/ranking.py`
- Added route ETA module: `05-services/routing.py`
- Added orchestration layer: `05-services/meta_v2_service.py`
