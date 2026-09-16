# IBVAP Backend — Supabase + Real Dataset Pipeline

FastAPI backend for the **Intelligent Border Video Analytics Platform**, wired to the
existing React frontend (unchanged). It serves real tracking data ingested from the
**VIRAT** (Kitware/Girder) and **MOT17** (MOTChallenge) datasets and stores everything
in a **Supabase PostgreSQL** database (with a zero-config SQLite fallback).

## Quick start (local, no Supabase needed)

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt

python scripts/download_datasets.py              # fetch VIRAT annotations + MOT17 labels
python -m app.data.seed                          # demo + VIRAT + MOT17 (live APIs)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then run the frontend (`cd ../frontend && npm install && npm run dev`) — the Vite dev
proxy already forwards `/api` and `/ws` to port 8000.

> `python -m app.data.seed --demo-only` seeds just the demo baseline (no datasets).
> MOT17 ingestion is best-effort — if the labels zip is missing it is skipped with a warning.

## Add Supabase

1. Create a Supabase project, paste `backend/scripts/init_supabase.sql` into the SQL editor and run.
2. Copy your DB connection string into `.env`:
   ```dotenv
   DATABASE_URL=postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   SUPABASE_JWT_SECRET=<Settings > API > JWT secret>
   USE_SUPABASE_AUTH=true
   ```
3. Seed the cloud database: `python -m app.data.seed`

## Dataset wiring

| Source | API | Ingested models |
|---|---|---|
| [VIRAT 2.0](https://data.kitware.com/#collection/56f56db28d777f753209ba9f) | `data.kitware.com/api/v1` (Girder REST) + offline cache | `cameras`, `events`, `alerts`, `detections`, `tracked_objects`, `risk_scores`, `notifications` |
| [MOT17](https://motchallenge.net/data/MOT17.zip) | `MOT17Labels.zip` (labels-only, ~140 MB) | `cameras`, `events`, `alerts`, `detections`, `tracked_objects` |

`scripts/download_datasets.py` pulls both sources into `./data_cache`:
`data_cache/virat/annotations/` (annotation .txt files) and
`data_cache/mot17/MOT17Labels.zip`. VIRAT ingestion is **local-first**: if the
extracted annotation files already exist it never touches the network.

Every VIRAT clip and MOT17 sequence becomes a real camera (`VIRAT-000001`,
`MOT17-02`, ...) whose MJPEG stream is rendered from the actual annotation
bounding boxes. Tune ingestion with `DATASET_VIRAT_MAX_CLIPS`,
`DATASET_MOT17_SEQUENCES`, `DATASET_FRAME_SAMPLE` (see `.env.example`). Seeding
is idempotent (skips already-imported VIRAT/MOT17 camera codes).

> To replay real video frames (not just annotation overlays), download the full
> `MOT17.zip` (~5.9 GB, images included) from https://motchallenge.net/data/MOT17.zip
> and extract it into `data_cache/mot17/`.

## API surface (frontend contract, unchanged)

```
POST /api/auth/login          → { access_token, user }
POST /api/auth/register
GET  /api/cameras             GET /api/cameras/{code}
GET  /api/events?limit&camera_code&risk_level&event_type&source
GET  /api/alerts?status&risk_level
PATCH /api/alerts/{id}/status
POST /api/incidents/{alertId}/actions
GET  /api/incidents/{alertId}/actions
GET  /api/analytics/summary
GET  /api/tracked?status&object_class&source
GET  /api/plates?wanted_only
POST /api/demo/trigger?scenario=...
POST /api/demo/seed                       # on-demand dataset seeding
GET  /api/stream/{cameraCode}             # MJPEG
GET  /api/stream/{cameraCode}/frame       # single JPEG
WS   /ws/telemetry                        # { cameras, latest_alerts, active_targets, summary }
```

## Tests

```bash
python -m pytest tests -v
```

## Demo credentials

`admin` / `admin123` (ADMIN) · `operator1` / `operator123` (OPERATOR)

## Security notes

- Passwords hashed with salted SHA-256; JWT access tokens (24 h) required server-side.
- Supabase tables ship with RLS enabled in `init_supabase.sql`; the backend talks to
  Postgres via the service-role/database connection and never exposes secrets to the client.
- Keep `SUPABASE_SERVICE_ROLE_KEY` out of the frontend/bundles.