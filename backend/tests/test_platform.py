import os
import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_border_analytics.db")

from fastapi.testclient import TestClient
from app.ai.detector import detector
from app.ai.tracker import tracker
from app.ai.threat_engine import threat_engine
from app.ai.risk_engine import risk_engine
from app.core.database import SessionLocal, Base, engine
from app.models.models import Camera, Event, Alert, User
from app.services.demo_engine import demo_engine
from app.main import app


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    demo_engine.initialize_demo_db(session)
    yield session
    session.close()


# ---------------------------------------------------------------------------
# AI engine unit tests (unchanged behaviour)
# ---------------------------------------------------------------------------
def test_ai_detector_and_tracker():
    detections = [
        {"object_class": "person", "bbox": [30, 40, 10, 20]},
        {"object_class": "vehicle", "bbox": [50, 50, 20, 15]},
    ]
    updated = tracker.update(detections, "CAM-01")
    assert len(updated) >= 2
    assert any(obj["object_class"] == "person" for obj in updated)


def test_threat_and_risk_engine():
    target = {
        "tracking_id": "P101",
        "bbox": [30, 40, 10, 20],
        "dwell_time": 12.0,
        "camera_history": ["CAM-01", "CAM-04"],
    }
    camera = {"code": "CAM-04", "restricted_zone": [[10, 10], [90, 10], [90, 90], [10, 90]]}
    threats = threat_engine.evaluate_target_threats(target, camera, [target], is_night_time=True)
    assert len(threats) > 0
    score, level, reasons = risk_engine.calculate_risk(threats)
    assert score >= 30
    assert level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert len(reasons) > 0


# ---------------------------------------------------------------------------
# VIRAT / MOT17 parsers
# ---------------------------------------------------------------------------
def test_virat_parsers():
    from app.data.virat import ViratClient

    objects = ViratClient.parse_objects(
        "0 1 3676 710 454 224 228 1\n1 2 3800 100 200 50 60 2\n"
    )
    assert objects[0]["object_id"] == 0
    assert objects[0]["object_type"] == 1
    assert objects[1]["object_type"] == 2

    events = ViratClient.parse_events(
        "0 10 59 3676 3734 3676 710 454 224 228\n"
    )
    assert events[0]["event_type"] == 10
    assert events[0]["start_frame"] == 3676


def test_mot17_parser():
    from app.data.mot17 import MOT17Client

    rows = MOT17Client.parse_gt(
        "1,1,912,484,97,109,0,7,1\n5,1,912,484,97,109,1,1,0.9\n"
    )
    assert rows[0]["id"] == 1
    assert rows[0]["conf"] == 0  # ignored row
    assert rows[1]["class"] == 1  # pedestrian


# ---------------------------------------------------------------------------
# Database seeding
# ---------------------------------------------------------------------------
def test_database_initialization(db):
    assert db.query(User).filter(User.username == "admin").count() == 1
    assert db.query(Camera).count() >= 6
    assert db.query(Alert).count() >= 1


# ---------------------------------------------------------------------------
# API contract tests (frontend compatibility)
# ---------------------------------------------------------------------------
def test_root_endpoint(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ONLINE"


def test_health_endpoint(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "UP"


def test_auth_login(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["user"]["username"] == "admin"
    assert body["user"]["role"] == "ADMIN"


def test_auth_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert r.status_code == 401


def test_auth_register(client):
    r = client.post(
        "/api/auth/register",
        json={"username": "analyst1", "email": "a@borderguard.ai", "password": "pass123", "role": "ANALYST"},
    )
    assert r.status_code == 200
    assert r.json()["username"] == "analyst1"


def test_get_cameras(client):
    r = client.get("/api/cameras")
    assert r.status_code == 200
    cams = r.json()
    assert len(cams) >= 6
    assert all("code" in c for c in cams)


def test_get_camera_by_code(client):
    r = client.get("/api/cameras/CAM-081")
    assert r.status_code == 200
    assert r.json()["latitude"] > 0


def test_get_events(client):
    r = client.get("/api/events?limit=10")
    assert r.status_code == 200


def test_get_alerts(client):
    r = client.get("/api/alerts")
    assert r.status_code == 200
    alerts = r.json()
    assert len(alerts) >= 1
    # Frontend expects created_at ISO + risk fields
    a = alerts[0]
    assert "created_at" in a and "risk_score" in a and "risk_level" in a and "status" in a


def test_update_alert_status(client):
    r = client.get("/api/alerts")
    alert_id = r.json()[0]["id"]
    r = client.patch(f"/api/alerts/{alert_id}/status", json={"status": "VERIFIED", "notes": "test"})
    assert r.status_code == 200
    assert r.json()["status"] == "VERIFIED"


def test_incident_actions_crud(client):
    r = client.get("/api/alerts")
    alert_id = r.json()[0]["id"]
    r = client.post(
        f"/api/incidents/{alert_id}/actions",
        json={"action_type": "DISPATCH_PATROL", "notes": "Verify zone"},
    )
    assert r.status_code == 201
    action_id = r.json()["id"]
    r = client.get(f"/api/incidents/{alert_id}/actions")
    assert r.status_code == 200
    assert any(a["id"] == action_id for a in r.json())


def test_analytics_summary(client):
    r = client.get("/api/analytics/summary")
    assert r.status_code == 200
    body = r.json()
    assert "hourly_events" in body and "risk_distribution" in body
    assert "active_cameras" in body and "critical_alerts" in body
    assert body["risk_distribution"]["LOW"] >= 0


def test_tracked_objects(client):
    r = client.get("/api/tracked")
    assert r.status_code == 200


def test_plates(client):
    r = client.get("/api/plates")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_notifications(client):
    r = client.get("/api/notifications")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    r2 = client.get("/api/notifications?channel=IN_APP&limit=10")
    assert r2.status_code == 200


def test_demo_trigger(client):
    r = client.post("/api/demo/trigger?scenario=NIGHT_INTRUSION")
    assert r.status_code == 200
    assert r.json()["status"] == "triggered"


def test_demo_trigger_invalid(client):
    r = client.post("/api/demo/trigger?scenario=NOT_A_SCENARIO")
    assert r.status_code == 400


def test_demo_seed_endpoint(client):
    """POST /api/demo/seed is idempotent and returns the SeedingStatus shape."""
    r = client.post("/api/demo/seed")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "seeded"
    assert isinstance(body["cameras"], int)
    assert "virat" in body["motors"] and "mot17" in body["motors"]


def test_stream_single_frame(client):
    r = client.get("/api/stream/CAM-072/frame")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/jpeg")


def test_stream_mjpeg(client):
    """MJPEG streams are infinite; the /frame endpoint confirms the generator works."""
    r = client.get("/api/stream/CAM-083/frame")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"


def test_websocket_telemetry(client):
    with client.websocket_connect("/ws/telemetry") as ws:
        data = ws.receive_json()
        assert "cameras" in data
        assert "latest_alerts" in data
        assert "active_targets" in data
        assert "summary" in data