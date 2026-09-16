import math
import time
import random
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import (
    Camera,
    Event,
    Alert,
    RiskScore,
    Detection,
    TrackedObject,
    Plate,
    Vehicle,
    User,
    MovementHistory,
    Notification,
)
from app.core.security import get_password_hash
from app.ai.risk_engine import risk_engine
from app.ai.threat_engine import threat_engine

try:  # OpenCV is optional; frame synthesis degrades to a solid-color fallback
    import cv2
    import numpy as np
except Exception:  # pragma: no cover
    cv2 = None
    numpy = None

INITIAL_CAMERAS = [
    {
        "code": "CAM-072",
        "name": "Camera 1 - Nominal",
        "location_name": "Normal / Nominal",
        "latitude": 31.6210,
        "longitude": 74.8720,
        "status": "ONLINE",
        "fps": 30,
        "resolution": "1920x1080",
        "restricted_zone": [[15, 15], [85, 15], [85, 85], [15, 85]],
        "virtual_fence": [[10, 50], [90, 50]],
    },
    {
        "code": "CAM-081",
        "name": "Camera 2 - Person Detected",
        "location_name": "Person Detection Zone",
        "latitude": 31.6245,
        "longitude": 74.8785,
        "status": "ALERT",
        "fps": 30,
        "resolution": "1920x1080",
        "restricted_zone": [[20, 20], [80, 20], [80, 80], [20, 80]],
        "virtual_fence": [[15, 60], [85, 60]],
    },
    {
        "code": "CAM-083",
        "name": "Camera 3 - Vehicle Detected",
        "location_name": "Vehicle Detection Zone",
        "latitude": 31.6280,
        "longitude": 74.8840,
        "status": "ALERT",
        "fps": 30,
        "resolution": "1920x1080",
        "restricted_zone": [[10, 10], [90, 10], [90, 85], [10, 85]],
        "virtual_fence": [[10, 45], [90, 45]],
    },
    {
        "code": "CAM-084",
        "name": "Camera 4 - Cycle Detected",
        "location_name": "Cycle Detection Zone",
        "latitude": 31.6315,
        "longitude": 74.8895,
        "status": "ALERT",
        "fps": 30,
        "resolution": "1920x1080",
        "restricted_zone": [[25, 25], [75, 25], [75, 75], [25, 75]],
        "virtual_fence": [[20, 55], [80, 55]],
    },
    {
        "code": "CAM-085",
        "name": "Camera 5 - Person Detected",
        "location_name": "Person Detection Zone",
        "latitude": 31.6350,
        "longitude": 74.8950,
        "status": "ALERT",
        "fps": 30,
        "resolution": "1920x1080",
        "restricted_zone": [[15, 15], [85, 15], [85, 85], [15, 85]],
        "virtual_fence": [[10, 50], [90, 50]],
    },
    {
        "code": "CAM-086",
        "name": "Camera 6 - Nominal",
        "location_name": "Normal / Nominal",
        "latitude": 31.6385,
        "longitude": 74.9010,
        "status": "ONLINE",
        "fps": 30,
        "resolution": "1920x1080",
        "restricted_zone": [[20, 20], [80, 20], [80, 80], [20, 80]],
        "virtual_fence": [[15, 60], [85, 60]],
    },
]

SEED_PLATES = [
    {"plate_number": "UK-07-AZ", "camera_code": "CAM-072", "confidence": 0.97, "is_wanted": True, "vehicle_type": "SUV / Truck"},
    {"plate_number": "HR-26-BX", "camera_code": "CAM-072", "confidence": 0.93, "is_wanted": False, "vehicle_type": "Sedan"},
    {"plate_number": "PB-02-KR", "camera_code": "CAM-084", "confidence": 0.95, "is_wanted": True, "vehicle_type": "Pickup"},
    {"plate_number": "DL-3C-MQ-1111", "camera_code": "CAM-086", "confidence": 0.91, "is_wanted": False, "vehicle_type": "Container Truck"},
    {"plate_number": "RJ-14-TL", "camera_code": "CAM-085", "confidence": 0.88, "is_wanted": False, "vehicle_type": "Boat Trailer"},
]


class DemoEngine:
    def __init__(self):
        self.active_targets = {
            "P101": {"class": "person", "camera": "CAM-072", "x": 65, "y": 35, "dx": 0.3, "dy": 0.2, "dwell": 12.0},
            "V201": {"class": "vehicle", "camera": "CAM-072", "x": 25, "y": 30, "dx": 0.1, "dy": 0.0, "dwell": 8.0},
            "V202": {"class": "vehicle", "camera": "CAM-072", "x": 48, "y": 42, "dx": 0.0, "dy": 0.1, "dwell": 15.0},
            "P102": {"class": "person", "camera": "CAM-081", "x": 58, "y": 45, "dx": -0.4, "dy": 0.2, "dwell": 25.0},
            "P103": {"class": "person", "camera": "CAM-084", "x": 45, "y": 50, "dx": 0.2, "dy": 0.0, "dwell": 5.0},
            "V203": {"class": "vehicle", "camera": "CAM-086", "x": 30, "y": 40, "dx": 0.2, "dy": 0.1, "dwell": 10.0},
        }

    def initialize_demo_db(self, db: Session):
        # --- Users ---
        if db.query(User).count() == 0:
            users = [
                User(
                    username="admin",
                    email="admin@borderguard.ai",
                    hashed_password=get_password_hash("admin123"),
                    role="ADMIN",
                ),
                User(
                    username="operator1",
                    email="operator@borderguard.ai",
                    hashed_password=get_password_hash("operator123"),
                    role="OPERATOR",
                ),
            ]
            db.add_all(users)
            db.commit()

        # --- Cameras ---
        existing_codes = {c.code for c in db.query(Camera).all()}
        for cam_data in INITIAL_CAMERAS:
            if cam_data["code"] not in existing_codes:
                db.add(Camera(**cam_data))
            else:
                db.query(Camera).filter(Camera.code == cam_data["code"]).update({
                    "name": cam_data["name"],
                    "location_name": cam_data["location_name"],
                    "status": cam_data["status"],
                })
        db.commit()

        # --- Plates (ANPR) ---
        if db.query(Plate).count() == 0:
            for p in SEED_PLATES:
                db.add(Plate(**p))
            db.commit()

        # --- Seed events + alerts if none exist ---
        if db.query(Alert).count() == 0 and db.query(Event).count() == 0:
            cam81 = db.query(Camera).filter(Camera.code == "CAM-081").first()
            cam72 = db.query(Camera).filter(Camera.code == "CAM-072").first()
            cam84 = db.query(Camera).filter(Camera.code == "CAM-084").first()
            if cam81:
                event = Event(
                    camera_id=cam81.id,
                    camera_code="CAM-081",
                    title="Alert: 2x Intruder - Sector B4",
                    event_type="RESTRICTED_INTRUSION",
                    tracking_id="P102",
                    object_type="person",
                    risk_score=91,
                    risk_level="CRITICAL",
                    details={
                        "reasons": [
                            "\u2022 Restricted zone intrusion (+30)",
                            "\u2022 Night-time movement (+15)",
                            "\u2022 Fence breach (+25)",
                            "\u2022 2x Intruder grouping (+21)",
                        ]
                    },
                )
                db.add(event)
                db.commit()
                db.add(
                    Alert(
                        event_id=event.id,
                        camera_id=cam81.id,
                        camera_code="CAM-081",
                        tracking_id="P102",
                        title="Alert: 2x Intruder - Sector B4",
                        risk_score=91,
                        risk_level="CRITICAL",
                        status="NEW",
                        assigned_operator="Sgt. M. Chen",
                    )
                )
            if cam72:
                wanted = db.query(Plate).filter(Plate.is_wanted == True).first()
                event2 = Event(
                    camera_id=cam72.id,
                    camera_code="CAM-072",
                    title="Wanted Vehicle Detected - UK-07-AZ",
                    event_type="SUSPICIOUS_VEHICLE",
                    tracking_id="V201",
                    object_type="vehicle",
                    risk_score=78,
                    risk_level="HIGH",
                    details={
                        "reasons": [
                            "\u2022 Wanted-plate ANPR match (+40)",
                            "\u2022 Unregistered border corridor presence (+20)",
                            "\u2022 Confirmed plate confidence 97% (+18)",
                        ]
                    },
                )
                db.add(event2)
                db.commit()
                db.add(
                    Alert(
                        event_id=event2.id,
                        camera_id=cam72.id,
                        camera_code="CAM-072",
                        tracking_id="V201",
                        title=wanted and "Wanted Vehicle Detected - UK-07-AZ" or "Suspicious Vehicle - CAM-072",
                        risk_score=78,
                        risk_level="HIGH",
                        status="NEW",
                        assigned_operator="Sgt. M. Chen",
                    )
                )
            if cam84:
                event3 = Event(
                    camera_id=cam84.id,
                    camera_code="CAM-084",
                    title="Loitering Near Gate East",
                    event_type="LOITERING",
                    tracking_id="P103",
                    object_type="person",
                    risk_score=64,
                    risk_level="HIGH",
                    details={
                        "reasons": [
                            "\u2022 Prolonged dwell near barrier (>30s) (+35)",
                            "\u2022 Night-time movement (+15)",
                            "\u2022 Restricted boundary proximity (+14)",
                        ]
                    },
                )
                db.add(event3)
                db.commit()
                db.add(
                    Alert(
                        event_id=event3.id,
                        camera_id=cam84.id,
                        camera_code="CAM-084",
                        tracking_id="P103",
                        title="Loitering Near Gate East",
                        risk_score=64,
                        risk_level="HIGH",
                        status="UNDER_REVIEW",
                        assigned_operator="Lt. P. Rao",
                    )
                )
            db.commit()

            # Notifications
            if db.query(Notification).count() == 0:
                db.add_all([
                    Notification(
                        channel="IN_APP",
                        recipient="SECURITY_OPERATORS_GROUP",
                        title="CRITICAL: 2x Intruder - Sector B4",
                        message="Camera CAM-081 detected P102 with Risk Score 91/100.",
                        status="SENT",
                    ),
                    Notification(
                        channel="EMAIL",
                        recipient="command-hq@border-defense.gov.in",
                        title="[CRITICAL ALERT] Perimeter Intrusion at CAM-081",
                        message="Automated Alert System Dispatch:\nLocation: CAM-081\nTarget: P102\nRisk Rating: 91/100\nReasons:\n\u2022 Restricted zone intrusion (+30)\n\u2022 Night-time movement (+15)\n\u2022 Fence breach (+25)\n\u2022 2x Intruder grouping (+21)",
                        status="SIMULATED",
                    ),
                    Notification(
                        channel="SMS",
                        recipient="+91-98765-01920 (Duty Officer)",
                        title="CRITICAL BORDER ALERT",
                        message="ALERT: CAM-081 Intrusion detected! Target P102, Risk 91. Immediate verification required.",
                        status="SIMULATED",
                    ),
                ])
                db.commit()

    # ------------------------------------------------------------------
    # Scenario trigger (used by POST /api/demo/trigger)
    # ------------------------------------------------------------------
    def trigger_scenario(self, scenario: str, db: Session):
        scenarios = {
            "NIGHT_INTRUSION": self._scenario_night_intrusion,
            "VIRTUAL_FENCE": self._scenario_virtual_fence,
            "ANPR_WANTED": self._scenario_anpr_wanted,
            "CROSS_CAMERA_PURSUIT": self._scenario_cross_camera,
        }
        handler = scenarios.get(scenario)
        if handler is None:
            return {"status": "error", "detail": f"Unknown scenario {scenario}"}
        return handler(db)

    def _create_event_with_alert(
        self, db: Session, camera_code: str, title: str, event_type: str,
        tracking_id: str, object_type: str, threats: List[Dict], alert_status: str = "NEW",
    ) -> Event:
        cam = db.query(Camera).filter(Camera.code == camera_code).first()
        if not cam:
            cam = db.query(Camera).first()
        if not cam:
            return None

        score, level, reasons = risk_engine.calculate_risk(threats)
        event = Event(
            camera_id=cam.id,
            camera_code=cam.code,
            title=title,
            event_type=event_type,
            tracking_id=tracking_id,
            object_type=object_type,
            risk_score=score,
            risk_level=level,
            details={"reasons": [f"• {r}" for r in reasons]},
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        db.add(RiskScore(event_id=event.id, total_score=score, risk_level=level, reasons=reasons))
        db.add(
            Alert(
                event_id=event.id,
                camera_id=cam.id,
                camera_code=cam.code,
                tracking_id=tracking_id,
                title=title,
                risk_score=score,
                risk_level=level,
                status=alert_status,
                assigned_operator="System-Auto",
            )
        )
        db.commit()
        return event

    def _scenario_night_intrusion(self, db: Session):
        cam = db.query(Camera).filter(Camera.code == "CAM-081").first()
        target = self.active_targets.get("P102", {})
        threats = threat_engine.evaluate_target_threats(
            {"tracking_id": "P102", "object_class": "person", "bbox": [55, 50, 12, 24], "dwell_time": target.get("dwell", 22)},
            {"restricted_zone": cam.restricted_zone if cam else None},
            [],
            is_night_time=True,
        )
        if not any(t["rule"] == "RESTRICTED_INTRUSION" for t in threats):
            threats.append({
                "rule": "RESTRICTED_INTRUSION",
                "label": "Restricted Zone Intrusion",
                "score_delta": 30,
                "detail": "Simulated night intruder crossing into restricted perimeter.",
            })
        event = self._create_event_with_alert(
            db, "CAM-081", "Simulated Night Intrusion - Sector B4",
            "NIGHT_MOVEMENT", "P102", "person", threats,
        )
        return {"status": "triggered", "scenario": "NIGHT_INTRUSION", "event_id": event.id if event else None,
                "risk_score": event.risk_score if event else None, "risk_level": event.risk_level if event else None}

    def _scenario_virtual_fence(self, db: Session):
        threats = [
            {"rule": "VIRTUAL_FENCE_CROSSING", "label": "Virtual Fence Crossing", "score_delta": 25,
             "detail": "Track crossed the virtual optical fence at Sector B4."},
            {"rule": "NIGHT_MOVEMENT", "label": "Night-Time Movement", "score_delta": 15,
             "detail": "Movement detected during low-visibility hours."},
        ]
        event = self._create_event_with_alert(
            db, "CAM-083", "Simulated Virtual Fence Crossing - Ridge Path",
            "VIRTUAL_FENCE_CROSSING", "P105", "person", threats,
        )
        return {"status": "triggered", "scenario": "VIRTUAL_FENCE", "event_id": event.id if event else None,
                "risk_score": event.risk_score if event else None, "risk_level": event.risk_level if event else None}

    def _scenario_anpr_wanted(self, db: Session):
        plate = db.query(Plate).filter(Plate.is_wanted == True).first()
        plate_number = plate.plate_number if plate else "UK-07-AZ"
        threats = [
            {"rule": "ANPR_WANTED_MATCH", "label": f"Wanted plate {plate_number} matched", "score_delta": 45,
             "detail": "ANPR matched against national wanted-vehicle database."},
            {"rule": "SUSPICIOUS_VEHICLE", "label": "Suspicious Vehicle Activity", "score_delta": 20,
             "detail": "Wanted vehicle near border checkpoint."},
        ]
        event = self._create_event_with_alert(
            db, "CAM-072", f"Wanted Vehicle Locked - {plate_number}",
            "SUSPICIOUS_VEHICLE", "V201", "vehicle", threats,
        )
        return {"status": "triggered", "scenario": "ANPR_WANTED", "event_id": event.id if event else None,
                "risk_score": event.risk_score if event else None, "risk_level": event.risk_level if event else None}

    def _scenario_cross_camera(self, db: Session):
        threats = [
            {"rule": "CROSS_CAMERA_ACTIVITY", "label": "Cross-Camera Movement", "score_delta": 20,
             "detail": "Target movement correlated CAM-081 → CAM-084 → CAM-085."},
            {"rule": "RESTRICTED_INTRUSION", "label": "Restricted Zone Intrusion", "score_delta": 30,
             "detail": "Deep penetration into protected corridor."},
        ]
        event = self._create_event_with_alert(
            db, "CAM-085", "Simulated Cross-Camera Pursuit - River Channel",
            "CROSS_CAMERA_MOVEMENT", "P106", "person", threats,
        )
        return {"status": "triggered", "scenario": "CROSS_CAMERA_PURSUIT", "event_id": event.id if event else None,
                "risk_score": event.risk_score if event else None, "risk_level": event.risk_level if event else None}

    # ------------------------------------------------------------------
    # Synthetic camera frames (OpenCV; graceful fallback)
    # ------------------------------------------------------------------
    def generate_demo_frame(self, camera_code: str):
        if cv2 is None:
            return self._blank_frame(camera_code)
        w, h = 1280, 720
        t = time.time()
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        time_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-4]

        if camera_code == "CAM-072":
            frame[:, :] = (175, 185, 190)
            cv2.rectangle(frame, (100, 260), (1180, 720), (55, 60, 65), -1)
            for lx in range(120, 1160, 80):
                cv2.rectangle(frame, (lx, 470), (lx + 45, 480), (220, 220, 220), -1)
            cv2.rectangle(frame, (80, 140), (320, 420), (100, 110, 120), -1)
            cv2.rectangle(frame, (960, 140), (1200, 420), (100, 110, 120), -1)
            cv2.rectangle(frame, (300, 160), (980, 210), (35, 45, 55), -1)
            barrier_lift = max(0.0, math.sin(t * 0.8))
            barrier_end_y = int(380 - barrier_lift * 120)
            cv2.line(frame, (350, 380), (620, barrier_end_y), (0, 0, 240), 8)
            v1_x = int((t * 90) % 1400) - 200
            if -100 <= v1_x <= 1300:
                cv2.rectangle(frame, (v1_x, 340), (v1_x + 190, 440), (80, 95, 110), -1)
                cv2.rectangle(frame, (v1_x + 30, 310), (v1_x + 160, 340), (45, 55, 65), -1)
                cv2.circle(frame, (v1_x + 40, 440), 22, (20, 20, 20), -1)
                cv2.circle(frame, (v1_x + 150, 440), 22, (20, 20, 20), -1)
                cv2.circle(frame, (v1_x + 155, 390), 5, (0, 255, 255), -1)
                cv2.putText(frame, "VEHICLE V201 [SUV] 98%", (v1_x - 40, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 230, 255), 2)
                cv2.rectangle(frame, (v1_x - 10, 300), (v1_x + 200, 460), (0, 230, 255), 2)
            p_x = int(760 + 50 * math.sin(t * 0.7))
            p_y = 350
            cv2.circle(frame, (p_x, p_y), 14, (60, 70, 80), -1)
            cv2.line(frame, (p_x, p_y + 14), (p_x, p_y + 65), (40, 50, 60), 6)
            cv2.rectangle(frame, (p_x - 22, p_y - 20), (p_x + 22, p_y + 115), (0, 255, 0), 2)
            cv2.putText(frame, "PERSON P101 94%", (p_x - 45, p_y - 28), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        elif camera_code == "CAM-081":
            frame[:, :] = (12, 18, 22)
            for fx in range(0, w, 40):
                cv2.line(frame, (fx, 150), (fx + 40, h), (40, 48, 55), 1)
                cv2.line(frame, (fx + 40, 150), (fx, h), (40, 48, 55), 1)
            for px in range(0, w, 200):
                cv2.line(frame, (px, 100), (px, h), (75, 85, 95), 5)
            cv2.line(frame, (0, 150), (w, 150), (120, 130, 140), 3)
            spot_center = int(640 + 380 * math.sin(t * 1.1))
            pts = np.array([[640, 0], [spot_center - 180, 720], [spot_center + 180, 720]], np.int32)
            overlay = frame.copy()
            cv2.fillPoly(overlay, [pts], (90, 120, 140))
            cv2.addWeighted(overlay, 0.35, frame, 0.65, 0, frame)
            int_x = int(620 + 80 * math.sin(t * 0.6))
            int_y = 480
            cv2.circle(frame, (int_x, int_y), 15, (30, 35, 40), -1)
            cv2.rectangle(frame, (int_x - 65, int_y - 25), (int_x + 35, int_y + 80), (0, 0, 210), 3)
            cv2.putText(frame, "! CRITICAL: INTRUDER P102 96%", (int_x - 110, int_y - 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        elif camera_code == "CAM-084":
            frame[:, :] = (130, 145, 150)
            cv2.rectangle(frame, (180, 300), (1100, 720), (70, 75, 80), -1)
            cv2.rectangle(frame, (160, 200), (340, 480), (60, 70, 80), -1)
            off_x = int(580 + 70 * math.sin(t * 1.2))
            cv2.circle(frame, (off_x, 380), 15, (40, 50, 60), -1)
            cv2.rectangle(frame, (off_x - 25, 360), (off_x + 25, 535), (0, 255, 0), 2)
            cv2.putText(frame, "OFFICER R. SINGH (#4) 99%", (off_x - 80, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        elif camera_code == "CAM-085":
            frame[:, :] = (35, 75, 95)
            for wy in range(260, h, 35):
                wave_shift = int(15 * math.sin(t * 3.5 + wy * 0.08))
                cv2.line(frame, (0, wy), (w, wy + wave_shift), (45, 95, 120), 2)
            cv2.rectangle(frame, (0, 0), (w, 240), (45, 55, 60), -1)
            boat_x = int((t * 70) % 1500) - 200
            boat_y = 440 + int(8 * math.sin(t * 2))
            if -150 <= boat_x <= 1350:
                cv2.ellipse(frame, (boat_x + 110, boat_y), (110, 35), 0, 0, 180, (200, 210, 220), -1)
                cv2.putText(frame, "PATROL BOAT #2 [VESSEL] 97%", (boat_x, boat_y - 70), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 240, 255), 2)
                cv2.rectangle(frame, (boat_x - 10, boat_y - 60), (boat_x + 230, boat_y + 45), (0, 240, 255), 2)

        else:  # CAM-083, CAM-086 and any dataset camera
            frame[:, :] = (90, 95, 100)
            cv2.rectangle(frame, (80, 80), (550, 640), (50, 55, 60), -1)
            fl_x = int(680 + 120 * math.sin(t * 0.9))
            fl_y = 420
            cv2.rectangle(frame, (fl_x, fl_y), (fl_x + 160, fl_y + 110), (0, 170, 255), -1)
            cv2.putText(frame, f"LOGISTICS {camera_code} 98%", (fl_x - 8, fl_y - 50), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 230, 255), 2)
            cv2.rectangle(frame, (fl_x - 10, fl_y - 40), (fl_x + 250, fl_y + 130), (0, 230, 255), 2)

        # HUD overlay
        cv2.rectangle(frame, (15, 15), (460, 60), (10, 15, 25), -1)
        cv2.putText(frame, "REC", (50, 43), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255), 2)
        cv2.putText(frame, f"// {camera_code} // LIVE", (95, 43), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.rectangle(frame, (15, h - 55), (440, h - 15), (10, 15, 25), -1)
        cv2.putText(frame, f"UTC {time_str}", (28, h - 28), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 230, 255), 1)
        return frame

    def _blank_frame(self, camera_code: str) -> bytes:
        """Fallback frame without OpenCV: a simple PNG rendered with Pillow."""
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (1280, 720), (10, 15, 25))
        draw = ImageDraw.Draw(img)
        draw.text((30, 30), f"IBVAP // {camera_code} // LIVE FEED", fill=(255, 255, 255))
        draw.text((30, 660), datetime.datetime.utcnow().isoformat(), fill=(100, 230, 255))
        return img

    def generate_jpeg_frame(self, camera_code: str) -> bytes:
        frame = self.generate_demo_frame(camera_code)
        if cv2 is not None:
            _, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            return jpeg.tobytes()
        import io
        buf = io.BytesIO()
        frame.save(buf, format="JPEG", quality=85)
        return buf.getvalue()


demo_engine = DemoEngine()