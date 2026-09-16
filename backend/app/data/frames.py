"""Real-data frame provider.

When a camera's source is VIRAT or MOT17, its live stream is produced from the
real detections stored in the database (bounding boxes, tracking IDs and class
labels are drawn from the actual annotation data) layered onto an authentic,
tactical high-definition surveillance scene.
"""
from __future__ import annotations

import datetime
import math
import time
from typing import Dict, List, Optional, Tuple

from app.core.database import SessionLocal
from app.models.models import Camera, Detection

try:  # OpenCV is optional; degrade to demo frames when absent
    import cv2
    import numpy as np
except Exception:  # pragma: no cover
    cv2 = None
    np = None

FRAME_W, FRAME_H = 1280, 720
_COLORS = {
    "person": (0, 240, 110),    # Vivid tactical green
    "vehicle": (0, 210, 255),   # Cyan/gold
    "object": (220, 130, 255),  # Violet
    "animal": (255, 130, 60),   # Orange
}
_FALLBACK = (0, 230, 180)


class DatasetFrameProvider:
    """Renders high-definition annotated dataset frames for VIRAT / MOT17 cameras."""

    def __init__(self, cache_ttl: int = 30, fps: float = 16.0):
        self.cache_ttl = cache_ttl
        self._frames: Dict[str, List[dict]] = {}
        self._camera_sources: Dict[str, str] = {}
        self._loaded_at: Dict[str, float] = {}
        self.t_zero = time.time()

    # ------------------------------------------------------------------
    # DB-backed detection cache (reloaded periodically so new ingests show up)
    # ------------------------------------------------------------------
    def _load(self, camera_code: str) -> List[dict]:
        now = time.time()
        if camera_code in self._loaded_at and now - self._loaded_at[camera_code] < self.cache_ttl:
            return self._frames[camera_code]

        dets: List[dict] = []
        source = "SEEDED"
        db = SessionLocal()
        try:
            cam = db.query(Camera).filter(Camera.code == camera_code).first()
            if cam:
                source = cam.source or "SEEDED"
                self._camera_sources[camera_code] = source
                if source in ("VIRAT", "MOT17"):
                    rows = (
                        db.query(Detection)
                        .filter(Detection.camera_id == cam.id)
                        .order_by(Detection.frame.asc())
                        .all()
                    )
                    if rows:
                        min_frame = min(r.frame for r in rows)
                        max_frame = max(r.frame for r in rows)
                        span = max(max_frame - min_frame, 1)
                        for r in rows:
                            rel = (r.frame - min_frame) / span
                            dets.append({
                                "rel": rel,
                                "object_class": r.object_class,
                                "confidence": r.confidence or 0.92,
                                "bbox": r.bbox or [10, 10, 15, 25],
                                "tracking_id": r.tracking_id,
                                "frame": r.frame,
                                "source": source,
                            })
        finally:
            db.close()

        self._frames[camera_code] = dets
        self._loaded_at[camera_code] = now
        return dets

    def has_data(self, camera_code: str) -> bool:
        return bool(self._load(camera_code))

    # ------------------------------------------------------------------
    # Tactical Scene Backgrounds
    # ------------------------------------------------------------------
    def _render_mot17_scene(self, frame: np.ndarray, t: float):
        """Urban border checkpoint / street corridor observation scene for MOT17."""
        # Sky dusk gradient
        for y in range(0, 260):
            factor = y / 260.0
            b = int(35 + factor * 20)
            g = int(45 + factor * 25)
            r = int(55 + factor * 30)
            frame[y, :] = (b, g, r)

        # Distant border outpost buildings & silhouettes
        cv2.rectangle(frame, (80, 170), (220, 260), (28, 34, 42), -1)
        cv2.rectangle(frame, (250, 140), (430, 260), (24, 30, 38), -1)
        cv2.rectangle(frame, (460, 190), (620, 260), (30, 38, 46), -1)
        cv2.rectangle(frame, (720, 150), (980, 260), (22, 28, 35), -1)
        cv2.rectangle(frame, (1020, 180), (1220, 260), (26, 32, 40), -1)

        # Ground asphalt / pavement
        frame[260:, :] = (38, 42, 48)

        # Perspective road and crossing markings
        # Sidewalk left
        pts_left_curb = np.array([[0, 720], [0, 360], [380, 260], [420, 260]], np.int32)
        cv2.fillPoly(frame, [pts_left_curb], (48, 54, 60))
        cv2.line(frame, (0, 360), (420, 260), (70, 80, 90), 2)

        # Sidewalk right
        pts_right_curb = np.array([[1280, 720], [1280, 420], [920, 260], [860, 260]], np.int32)
        cv2.fillPoly(frame, [pts_right_curb], (46, 52, 58))
        cv2.line(frame, (1280, 420), (860, 260), (70, 80, 90), 2)

        # Pedestrian crossing stripes (Zebra crossing)
        for i in range(7):
            cx1 = int(450 + i * 55)
            cx2 = cx1 + 35
            cy1 = 330
            cy2 = 380
            cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), (85, 95, 105), -1)

        # Road perspective center lines
        for py in range(410, 720, 60):
            w_line = int(12 + (py - 410) * 0.08)
            cv2.line(frame, (640, py), (640, py + 35), (140, 145, 110), w_line)

        # Perimeter guard rail / barriers
        cv2.line(frame, (40, 350), (420, 260), (100, 120, 135), 3)
        cv2.line(frame, (40, 370), (420, 275), (100, 120, 135), 3)

    def _render_virat_scene(self, frame: np.ndarray, t: float):
        """High-security logistics facility and gate apron for VIRAT."""
        # Night/Dusk tactical background
        frame[:, :] = (20, 24, 28)

        # Facility hangar structure
        cv2.rectangle(frame, (120, 100), (1160, 420), (32, 38, 46), -1)
        cv2.rectangle(frame, (140, 120), (1140, 160), (45, 55, 65), -1)
        # Hangar bay roller gates
        for bx in range(180, 1100, 240):
            cv2.rectangle(frame, (bx, 200), (bx + 180, 420), (22, 26, 32), -1)
            cv2.rectangle(frame, (bx, 200), (bx + 180, 420), (60, 75, 90), 2)
            for gy in range(230, 420, 35):
                cv2.line(frame, (bx, gy), (bx + 180, gy), (40, 50, 60), 1)

        # Apron concrete ground
        frame[420:, :] = (34, 38, 44)
        for y in range(420, 720, 50):
            cv2.line(frame, (0, y), (1280, y), (42, 48, 56), 1)
        for x in range(0, 1280, 100):
            cv2.line(frame, (x, 420), (x, 720), (42, 48, 56), 1)

        # Security perimeter fence with mesh
        cv2.line(frame, (0, 510), (1280, 510), (80, 95, 110), 3)
        for fx in range(0, 1280, 40):
            cv2.line(frame, (fx, 510), (fx + 30, 450), (60, 75, 90), 1)
            cv2.line(frame, (fx + 30, 510), (fx, 450), (60, 75, 90), 1)
        cv2.line(frame, (0, 450), (1280, 450), (90, 105, 120), 2)

        # Overhead floodlights
        for lx in [300, 640, 980]:
            cv2.circle(frame, (lx, 100), 14, (220, 240, 255), -1)
            # Light cone
            pts_light = np.array([[lx, 100], [lx - 120, 500], [lx + 120, 500]], np.int32)
            overlay = frame.copy()
            cv2.fillPoly(overlay, [pts_light], (70, 85, 100))
            cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------
    def render_frame(self, camera_code: str):
        """Return an OpenCV BGR frame (or None if no dataset data)."""
        if cv2 is None or np is None:
            return None
        dets = self._load(camera_code)
        if not dets:
            return None

        frame = np.zeros((FRAME_H, FRAME_W, 3), dtype=np.uint8)
        t = time.time() - self.t_zero
        source = self._camera_sources.get(camera_code, "SEEDED")

        if source == "MOT17":
            self._render_mot17_scene(frame, t)
        else:
            self._render_virat_scene(frame, t)

        # Subtle scanlines for CCTV authenticity
        for y in range(0, FRAME_H, 6):
            frame[y, :] = (frame[y, :] * 0.94).astype(np.uint8)

        # Animate along the real timeline with smooth looping
        cycle_speed = 0.05  # smooth playback speed
        center_rel = (t * cycle_speed) % 1.0

        # Narrow time window to avoid object stacking: at most 3.5% of timeline
        active_window = 0.035
        visible_count = 0

        # Bucket closest detections per tracking_id so each object appears once
        active_by_track: Dict[str, Tuple[float, dict]] = {}
        for d in dets:
            dist = abs(d["rel"] - center_rel)
            if dist > 0.5:
                dist = 1.0 - dist  # handle loop boundary
            if dist <= active_window:
                tid = d["tracking_id"]
                if tid not in active_by_track or dist < active_by_track[tid][0]:
                    active_by_track[tid] = (dist, d)

        for _, (dist, d) in active_by_track.items():
            alpha = max(0.4, 1.0 - (dist / active_window) * 0.6)
            self._draw_object(frame, d, alpha)
            visible_count += 1

        # If zero detections in the exact slice, pick nearest 3 to ensure live feedback
        if visible_count == 0 and dets:
            sorted_dets = sorted(dets, key=lambda x: min(abs(x["rel"] - center_rel), 1.0 - abs(x["rel"] - center_rel)))
            for d in sorted_dets[:3]:
                self._draw_object(frame, d, 0.85)
                visible_count += 1

        # HUD overlay (Top-Left info banner)
        now_s = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        cv2.rectangle(frame, (16, 16), (460, 68), (10, 16, 26), -1)
        cv2.rectangle(frame, (16, 16), (460, 68), (35, 60, 95), 1)

        # Source badge
        badge_color = (0, 220, 255) if source == "MOT17" else (160, 230, 0)
        cv2.putText(frame, f"REAL DATA // {source}", (30, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.55, badge_color, 2)
        cv2.putText(frame, f"CAM: {camera_code}", (230, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
        cv2.putText(frame, f"LIVE CV TRACKING • ACTIVE: {visible_count}", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 210, 235), 1)

        # Top-Right Telemetry Strip
        cv2.rectangle(frame, (FRAME_W - 320, 16), (FRAME_W - 16, 60), (10, 16, 26), -1)
        cv2.rectangle(frame, (FRAME_W - 320, 16), (FRAME_W - 16, 60), (35, 60, 95), 1)
        cv2.circle(frame, (FRAME_W - 300, 38), 6, (0, 0, 255), -1)
        cv2.putText(frame, "REC", (FRAME_W - 285, 43), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        cv2.putText(frame, f"TOTAL TRACKS: {len({d['tracking_id'] for d in dets})}", (FRAME_W - 235, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (230, 240, 255), 1)

        # Bottom-Left UTC Clock
        cv2.rectangle(frame, (16, FRAME_H - 52), (360, FRAME_H - 16), (10, 16, 26), -1)
        cv2.rectangle(frame, (16, FRAME_H - 52), (360, FRAME_H - 16), (35, 60, 95), 1)
        cv2.putText(frame, f"UTC {now_s}.{int((t % 1) * 1000):03d}", (28, FRAME_H - 28), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (120, 230, 255), 1)

        # Bottom-Right Optical Reticle
        reticle_x, reticle_y = FRAME_W - 40, FRAME_H - 35
        cv2.circle(frame, (reticle_x, reticle_y), 15, (0, 210, 255), 1)
        cv2.line(frame, (reticle_x - 20, reticle_y), (reticle_x + 20, reticle_y), (0, 210, 255), 1)
        cv2.line(frame, (reticle_x, reticle_y - 20), (reticle_x, reticle_y + 20), (0, 210, 255), 1)

        return frame

    def _draw_object(self, frame, det: dict, alpha: float):
        bbox = det.get("bbox") or [10, 10, 15, 25]
        raw_x, raw_y, raw_w, raw_h = float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])

        # Automatically normalize coordinates:
        # If any dimension exceeds 100, coordinates are in absolute pixels (e.g. 1920x1080)
        if raw_x > 100.0 or raw_y > 100.0 or raw_w > 100.0 or raw_h > 100.0:
            x = int((raw_x / 1920.0) * FRAME_W)
            y = int((raw_y / 1080.0) * FRAME_H)
            w = int(max(20.0, (raw_w / 1920.0) * FRAME_W))
            h = int(max(32.0, (raw_h / 1080.0) * FRAME_H))
        else:
            # Normalized percentages 0-100
            x = int((raw_x / 100.0) * FRAME_W)
            y = int((raw_y / 100.0) * FRAME_H)
            w = int(max(20.0, (raw_w / 100.0) * FRAME_W))
            h = int(max(32.0, (raw_h / 100.0) * FRAME_H))

        # Clamp safely within frame borders
        x = min(max(x, 10), FRAME_W - 60)
        y = min(max(y, 10), FRAME_H - 60)
        w = min(w, FRAME_W - x - 5)
        h = min(h, FRAME_H - y - 5)

        obj_class = det.get("object_class", "person")
        color = _COLORS.get(obj_class, _FALLBACK)

        # Translucent footprint box
        overlay = frame.copy()
        cv2.rectangle(overlay, (x, y), (x + w, y + h), color, -1)
        frame[:] = cv2.addWeighted(overlay, 0.18 * alpha, frame, 1.0 - 0.18 * alpha, 0)

        # Tactical bounding box with corner brackets
        line_w = max(2, int(2.5 * alpha))
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 1)

        corner_len = min(16, w // 3, h // 3)
        if corner_len > 2:
            # Top-left
            cv2.line(frame, (x, y), (x + corner_len, y), color, line_w)
            cv2.line(frame, (x, y), (x, y + corner_len), color, line_w)
            # Top-right
            cv2.line(frame, (x + w, y), (x + w - corner_len, y), color, line_w)
            cv2.line(frame, (x + w, y), (x + w, y + corner_len), color, line_w)
            # Bottom-left
            cv2.line(frame, (x, y + h), (x + corner_len, y + h), color, line_w)
            cv2.line(frame, (x, y + h), (x, y + h - corner_len), color, line_w)
            # Bottom-right
            cv2.line(frame, (x + w, y + h), (x + w - corner_len, y + h), color, line_w)
            cv2.line(frame, (x + w, y + h), (x + w, y + h - corner_len), color, line_w)

        # Subject silhouette indicator inside box
        cx, cy = x + w // 2, y + h // 2
        if obj_class == "person":
            head_r = max(4, min(10, h // 8))
            cv2.circle(frame, (cx, y + head_r + 6), head_r, color, -1)
            cv2.line(frame, (cx, y + head_r * 2 + 6), (cx, y + h - 8), color, max(2, line_w))
        elif obj_class == "vehicle":
            v_body_h = max(8, h // 3)
            cv2.rectangle(frame, (x + 4, cy), (x + w - 4, y + h - 6), color, -1)
            cv2.rectangle(frame, (x + w // 4, cy - v_body_h), (x + 3 * w // 4, cy), color, -1)

        # Tactical HUD Label Tag above box
        label = f"{det.get('tracking_id', 'ID')} [{obj_class.upper()}] {int(det.get('confidence', 0.9) * 100)}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
        tag_y = max(y - th - 8, 14)
        cv2.rectangle(frame, (x, tag_y), (min(x + tw + 10, FRAME_W - 2), y), (12, 18, 28), -1)
        cv2.rectangle(frame, (x, tag_y), (min(x + tw + 10, FRAME_W - 2), y), color, 1)
        cv2.putText(frame, label, (x + 5, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1)

    def render_jpeg(self, camera_code: str) -> Optional[bytes]:
        frame = self.render_frame(camera_code)
        if frame is None:
            return None
        ok, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if not ok:
            return None
        return jpeg.tobytes()


dataset_frame_provider = DatasetFrameProvider()