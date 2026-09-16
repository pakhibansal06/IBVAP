# Intelligent Border Video Analytics Platform (IBVAP)

A demo-ready **Intelligent Border Video Analytics Platform** for real-time perimeter
surveillance, automated threat evaluation, risk scoring, ANPR (Automatic Number Plate
Recognition), synthetic face identity matching, cross-camera correlation, and an
interactive command center.

The backend is powered by **real datasets** when available and a self-contained
**demo mode** otherwise:

- **VIRAT Ground Dataset 2.0** (Kitware/Girder) — object tracks, activity events
  (digging, loading, running, entering facilities, ...), framewise bounding boxes.
- **MOT17** (MOTChallenge) — multi-object tracking ground truth: pedestrians and
  vehicles across street/plaza/highway scenes.

Each VIRAT clip and MOT17 sequence is imported as a real camera (`VIRAT-000001`,
`MOT17-02`, ...) with its annotations replayed as live MJPEG streams rendered from
the actual bounding boxes.

---

## Key Capabilities

1. **Multi-Camera AI Surveillance Grid**
   - 6 seeded border cameras (`CAM-072` ... `CAM-086`) plus dynamically registered
     VIRAT / MOT17 dataset cameras.
   - Frame preprocessing (Gaussian noise reduction, CLAHE contrast enhancement).
   - Real-time object detection with bounding-box overlays and tracking IDs
     (`P101`, `V201`, dataset track IDs).

2. **ANPR & Face Identity Engine**
   - Vehicle bounding box → plate region → OCR text parsing.
   - Wanted-vehicle watchlist verification (`UK-07-AZ`, `PB-02-KR`, ...).

3. **Rule-Based Threat & 0-100 Risk Engine**
   - Restricted-zone intrusion (+30), virtual fence crossing (+25), night movement
     (+15), loitering (+15), suspicious vehicle (+20), cross-camera pursuit (+20).
   - Score bands: `LOW` 0-30 · `MEDIUM` 31-60 · `HIGH` 61-80 · `CRITICAL` 81-100.
   - Itemized audit explanations per alert.

4. **Geospatial Tactical Map & Cross-Camera Correlation**
   - Leaflet dark-mode map with camera markers, restricted zones, virtual fences,
     and animated target pursuit trails.

5. **Security Command Center Dashboard**
   - Live stats bar, alert feed with verify/dismiss, Recharts analytics
     (24 h timeline, risk distribution), incident-response modal with dispatch
     actions, notification drawer (In-App / Email / SMS).

6. **Datasets + Demo**
   - `python scripts/download_datasets.py` fetches VIRAT annotations + MOT17 labels.
   - `python -m app.data.seed` imports them idempotently into the database.
   - Demo scenarios (`NIGHT_INTRUSION`, `VIRTUAL_FENCE`, `ANPR_WANTED`,
     `CROSS_CAMERA_PURSUIT`) are triggerable from the UI or `/api/demo/trigger`.

---

## Quick Start

### 1. Backend (FastAPI + AI Engine)

```bash
cd backend
python -m venv .venv
# Windows PowerShell:  .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

python scripts/download_datasets.py      # optional: fetch VIRAT + MOT17 sources
python -m app.data.seed                  # optional: import real dataset data
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

API docs (Swagger UI): http://localhost:8000/docs

### 2. Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:5173  (Vite proxies `/api` and `/ws` to :8000)

Demo credentials: `admin` / `admin123` (ADMIN) · `operator1` / `operator123` (OPERATOR)

### 3. Supabase (optional)

1. Create a project and run `backend/scripts/init_supabase.sql` in the SQL editor.
2. Set `DATABASE_URL` (+ Supabase keys) in `.env` — see `.env.example`.
3. `python -m app.data.seed` to populate the cloud database.

Without Supabase the app runs locally on SQLite with zero configuration.

---

## Project Layout

- `frontend/` — React + Vite + Tailwind command center (unchanged by the backend work)
- `backend/app/api/` — FastAPI routers: `auth`, `cameras`, `events`, `alerts`,
  `incidents`, `analytics`, `tracked`, `plates`, `demo`, `stream`
- `backend/app/data/` — dataset ingestion: `virat.py`, `mot17.py`, `seed.py`, `frames.py`
- `backend/app/ai/` — detector, tracker, threat engine, risk engine, ANPR, face engine
- `backend/app/services/` — demo engine, telemetry
- `backend/data_cache/` — downloaded datasets (git-ignored)

## Tech Stack

- **Frontend:** React + Vite + Tailwind + Leaflet + Recharts
- **Backend:** Python + FastAPI + WebSockets + Uvicorn
- **AI/CV:** OpenCV + YOLO-style detector, centroid tracking, rule-based threat/risk
- **Database:** SQLAlchemy — SQLite (local) or PostgreSQL (Supabase)
- **Real-Time:** WebSockets (`/ws/telemetry`)
- **Datasets:** VIRAT 2.0 (Kitware Girder) · MOT17 (MOTChallenge)

## Tests

```bash
cd backend
python -m pytest tests -v
```