import asyncio
import random
import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, init_db, is_sqlite
from app.api import auth, cameras, events, alerts, incidents, analytics, demo, stream, tracked, plates, notifications
from app.services.demo_engine import demo_engine
from app.services.telemetry import build_telemetry_payload

# Initialize database tables (Supabase uses scripts/init_supabase.sql)
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Border Video Analytics & Threat Detection Command Center Platform API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(cameras.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(tracked.router, prefix=settings.API_V1_STR)
app.include_router(plates.router, prefix=settings.API_V1_STR)
app.include_router(demo.router, prefix=settings.API_V1_STR)
app.include_router(stream.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup():
    """Seed demo baseline on first run (users, cameras, alerts, plates)."""
    db = SessionLocal()
    try:
        demo_engine.initialize_demo_db(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "status": "ONLINE",
        "system": settings.PROJECT_NAME,
        "demo_mode": settings.DEMO_MODE,
        "version": "2.0.0",
        "database": "supabase-postgres" if "supabase" in settings.DATABASE_URL.lower() else "sqlite-local",
    }


@app.get("/health")
def health():
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "UP"
    except Exception:
        db_status = "DOWN"
    finally:
        db.close()
    return {"status": db_status, "uptime": datetime.datetime.utcnow().isoformat()}


# --------------------------------------------------------------------------
# WebSocket connection manager + telemetry stream
# --------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    db = SessionLocal()
    try:
        while True:
            telemetry_payload = build_telemetry_payload(db)
            await websocket.send_json(telemetry_payload)
            await asyncio.sleep(settings.SIMULATION_INTERVAL_SEC)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        db.close()