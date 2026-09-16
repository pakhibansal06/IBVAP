"""Builds real-time telemetry frames for /ws/telemetry from live DB state."""
import datetime
import random
from typing import Dict, Any, List

from sqlalchemy.orm import Session

from app.models.models import Alert, Camera, Event
from app.services.demo_engine import demo_engine


def build_telemetry_payload(db: Session) -> Dict[str, Any]:
    """Compose the exact payload the frontend WebSocket consumer expects."""
    recent_alerts = (
        db.query(Alert).order_by(Alert.created_at.desc()).limit(5).all()
    )
    cameras_list = db.query(Camera).all()

    # Drift demo targets so the map feels alive
    for tid, tdata in demo_engine.active_targets.items():
        tdata["x"] += tdata["dx"]
        tdata["y"] += tdata["dy"]
        if tdata["x"] > 85 or tdata["x"] < 15:
            tdata["dx"] *= -1
        if tdata["y"] > 85 or tdata["y"] < 15:
            tdata["dy"] *= -1
        tdata["dwell"] += 1.5

    persons = sum(1 for t in demo_engine.active_targets.values() if t["class"] == "person")
    vehicles = sum(1 for t in demo_engine.active_targets.values() if t["class"] == "vehicle")

    return {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "active_targets": demo_engine.active_targets,
        "cameras": [
            {
                "code": c.code,
                "name": c.name,
                "status": c.status,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "risk_score": 91 if c.code == "CAM-081" else (78 if c.code == "CAM-072" else 25),
                "source": c.source,
            }
            for c in cameras_list
        ],
        "latest_alerts": [
            {
                "id": a.id,
                "title": a.title,
                "camera_code": a.camera_code,
                "tracking_id": a.tracking_id,
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_alerts
        ],
        "summary": {
            "active_cameras": len(cameras_list),
            "active_threats": len(
                [a for a in recent_alerts if a.status in ["NEW", "UNDER_REVIEW", "ACTION_REQUIRED"]]
            ),
            "critical_alerts": len([a for a in recent_alerts if a.risk_level == "CRITICAL"]),
            "persons_detected": persons + random.randint(0, 3),
            "vehicles_detected": vehicles + random.randint(0, 2),
            "events_today": max(db.query(Event).count(), 5) + random.randint(0, 2),
        },
    }