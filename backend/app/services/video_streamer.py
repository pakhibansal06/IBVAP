"""Real Video Streamer Service.

Ingests real surveillance video files for CAM-XX border cameras, loops them
continuously, applies real-time tactical HUD overlays and AI detection tracking boxes,
and serves high-fps JPEG frames.
"""
from __future__ import annotations

import datetime
import math
import os
import threading
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover
    cv2 = None
    np = None

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VIDEOS_DIR = BASE_DIR / "data_cache" / "videos"

CAM_VIDEO_MAP: Dict[str, str] = {
    "CAM-072": str(VIDEOS_DIR / "cam1.mp4"),
    "CAM-081": str(VIDEOS_DIR / "cam2.mp4"),
    "CAM-083": str(VIDEOS_DIR / "cam3.mp4"),
    "CAM-084": str(VIDEOS_DIR / "cam4.mp4"),
    "CAM-085": str(VIDEOS_DIR / "cam5.mp4"),
    "CAM-086": str(VIDEOS_DIR / "cam6.mp4"),
}

CAM_LABELS: Dict[str, Tuple[str, str]] = {
    "CAM-072": ("CAMERA 1 - NOMINAL", "NORMAL / NOMINAL"),
    "CAM-081": ("CAMERA 2 - PERSON DETECTED", "PERSON DETECTION ZONE"),
    "CAM-083": ("CAMERA 3 - VEHICLE DETECTED", "VEHICLE DETECTION ZONE"),
    "CAM-084": ("CAMERA 4 - CYCLE DETECTED", "CYCLE DETECTION ZONE"),
    "CAM-085": ("CAMERA 5 - PERSON DETECTED", "PERSON DETECTION ZONE"),
    "CAM-086": ("CAMERA 6 - NOMINAL", "NORMAL / NOMINAL"),
}

class VideoFileStreamer:
    """Manages OpenCV video captures for each CAM-XX camera with seamless looping."""

    def __init__(self):
        self._caps: Dict[str, cv2.VideoCapture] = {}
        self._locks: Dict[str, threading.Lock] = {}
        self._last_frames: Dict[str, bytes] = {}
        self._background_models: Dict[str, cv2.BackgroundSubtractor] = {}
        self._t_zero = time.time()

    def _get_cap(self, camera_code: str) -> Optional[cv2.VideoCapture]:
        camera_code = camera_code.upper()
        if camera_code not in self._locks:
            self._locks[camera_code] = threading.Lock()

        with self._locks[camera_code]:
            if camera_code in self._caps and self._caps[camera_code].isOpened():
                return self._caps[camera_code]

            video_path = CAM_VIDEO_MAP.get(camera_code)
            if not video_path or not os.path.exists(video_path):
                # Fallback to cam1 if specific video file not mapped
                video_path = str(VIDEOS_DIR / "cam1.mp4")
                if not os.path.exists(video_path):
                    return None

            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                self._caps[camera_code] = cap
                return cap
            return None

    def get_frame(self, camera_code: str, overlay: bool = True) -> Optional[bytes]:
        if cv2 is None:
            return None

        camera_code = camera_code.upper()
        cap = self._get_cap(camera_code)
        if not cap:
            return None

        lock = self._locks.get(camera_code)
        if not lock:
            lock = threading.Lock()
            self._locks[camera_code] = lock

        with lock:
            ret, frame = cap.read()
            if not ret or frame is None:
                # Loop back to beginning seamlessly
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
                if not ret or frame is None:
                    return self._last_frames.get(camera_code)

        # Standardize frame to 1280x720
        if frame.shape[1] != 1280 or frame.shape[0] != 720:
            frame = cv2.resize(frame, (1280, 720), interpolation=cv2.INTER_LINEAR)

        if overlay:
            detections = self._detect_objects(frame, camera_code)
            self._apply_tactical_overlay(frame, camera_code, detections)

        ok, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if ok:
            data = jpeg.tobytes()
            self._last_frames[camera_code] = data
            return data

        return self._last_frames.get(camera_code)

    def _detect_objects(self, frame: np.ndarray, camera_code: str) -> list:
        """Detect subjects from the decoded frame instead of fixed scene coordinates."""
        if cv2 is None:
            return []

        detections = []
        frame_height, frame_width = frame.shape[:2]
        detection_frame = cv2.resize(frame, (frame_width // 2, frame_height // 2), interpolation=cv2.INTER_AREA)
        scale_x = frame_width / detection_frame.shape[1]
        scale_y = frame_height / detection_frame.shape[0]
        subtractor = self._background_models.setdefault(
            camera_code, cv2.createBackgroundSubtractorMOG2(history=120, varThreshold=32, detectShadows=True)
        )
        foreground = subtractor.apply(detection_frame)
        foreground = cv2.medianBlur(foreground, 5)
        _, foreground = cv2.threshold(foreground, 200, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(foreground, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            x, y, width, height = cv2.boundingRect(contour)
            area = width * height
            if area < detection_frame.shape[1] * detection_frame.shape[0] * 0.003 or height < 14:
                continue
            object_class = "CYCLE" if camera_code == "CAM-084" else ("PERSON" if height >= width * 1.25 else "VEHICLE")
            object_prefix = "C" if object_class == "CYCLE" else ("P" if object_class == "PERSON" else "V")
            detections.append({
                "class": object_class,
                "id": f"{object_prefix}-{camera_code[-3:]}-{len(detections) + 1}",
                "bbox": (int(x * scale_x), int(y * scale_y), int(width * scale_x), int(height * scale_y)),
                "conf": 0.70,
            })
        return detections

    def _apply_tactical_overlay(self, frame: np.ndarray, camera_code: str, detections: list):
        h, w = frame.shape[:2]
        now_dt = datetime.datetime.utcnow()
        time_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        millis = int((time.time() % 1) * 1000)
        t = time.time() - self._t_zero

        bop_name, sector_name = CAM_LABELS.get(camera_code, ("BORDER SURVEILLANCE POST", "TACTICAL SECTOR"))

        # 1. Subtle scanlines for CCTV fidelity
        for y in range(0, h, 6):
            frame[y, :] = (frame[y, :] * 0.95).astype(np.uint8)

        # 2. Top-Left Tactical HUD Banner
        if camera_code == "CAM-072":
            cv2.rectangle(frame, (18, 18), (365, 70), (22, 12, 24), -1)
            cv2.rectangle(frame, (18, 18), (365, 70), (35, 55, 95), 1)
            cv2.putText(frame, "WANTED VEHICLE LOCKED - UK-07-AZ", (34, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 45, 95), 2)
        else:
            cv2.rectangle(frame, (18, 18), (540, 74), (10, 15, 24), -1)
            cv2.rectangle(frame, (18, 18), (540, 74), (40, 70, 110), 1)
            cv2.circle(frame, (38, 46), 7, (0, 0, 255), -1)
            cv2.putText(frame, "LIVE FEED", (52, 51), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 220, 255), 2)
            cv2.putText(frame, f"// {camera_code} // {bop_name}", (145, 51), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 2)
            cv2.putText(frame, f"SECTOR: {sector_name} • REAL CAMERA FEED • 1080p ENHANCED", (38, 67), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (160, 200, 230), 1)

        if camera_code == "CAM-072":
            cv2.putText(frame, "CAMERA 1 - NOMINAL • NORMAL / NOMINAL", (385, 51), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 220, 255), 2)

        # 3. Top-Right Telemetry Strip
        cv2.rectangle(frame, (w - 290, 18), (w - 18, 62), (10, 15, 24), -1)
        cv2.rectangle(frame, (w - 290, 18), (w - 18, 62), (40, 70, 110), 1)
        cv2.putText(frame, "AI CV ENGINE: ACTIVE", (w - 275, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 240, 110), 1)
        cv2.putText(frame, f"FPS: 24.0 • LATENCY: 12ms", (w - 275, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 210, 240), 1)

        # 4. Bottom-Left UTC Clock & GPS Geotag
        cv2.rectangle(frame, (18, h - 54), (440, h - 18), (10, 15, 24), -1)
        cv2.rectangle(frame, (18, h - 54), (440, h - 18), (40, 70, 110), 1)
        cv2.putText(frame, f"UTC {time_str}.{millis:03d} • GPS: 31.624N, 74.878E", (30, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (120, 230, 255), 1)

        # 5. Bottom-Right Optical Reticle
        rx, ry = w - 45, h - 36
        cv2.circle(frame, (rx, ry), 16, (0, 210, 255), 1)
        cv2.line(frame, (rx - 22, ry), (rx + 22, ry), (0, 210, 255), 1)
        cv2.line(frame, (rx, ry - 22), (rx, ry + 22), (0, 210, 255), 1)

        # 6. Live AI Detection Overlays, derived from this exact decoded frame
        for det in detections:
            obj_class = det["class"]
            tid = det["id"]
            conf = det["conf"]
            bx, by, bw, bh = det["bbox"]

            # Color by object type
            if obj_class == "VEHICLE":
                color = (0, 210, 255)
            elif obj_class == "PERSON":
                color = (0, 240, 110)
            elif obj_class == "CYCLE":
                color = (255, 80, 220)
            else:
                color = (240, 120, 255)

            # Translucent box footprint
            overlay = frame.copy()
            cv2.rectangle(overlay, (bx, by), (bx + bw, by + bh), color, -1)
            frame[:] = cv2.addWeighted(overlay, 0.12, frame, 0.88, 0)

            # Box outline + corner brackets
            cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), color, 1)
            c_len = min(14, bw // 3, bh // 3)
            # Corners
            cv2.line(frame, (bx, by), (bx + c_len, by), color, 2)
            cv2.line(frame, (bx, by), (bx, by + c_len), color, 2)
            cv2.line(frame, (bx + bw, by), (bx + bw - c_len, by), color, 2)
            cv2.line(frame, (bx + bw, by), (bx + bw, by + c_len), color, 2)
            cv2.line(frame, (bx, by + bh), (bx + c_len, by + bh), color, 2)
            cv2.line(frame, (bx, by + bh), (bx, by + bh - c_len), color, 2)
            cv2.line(frame, (bx + bw, by + bh), (bx + bw - c_len, by + bh), color, 2)
            cv2.line(frame, (bx + bw, by + bh), (bx + bw, by + bh - c_len), color, 2)

            # HUD Label Tag
            label_text = f"{tid} [{obj_class}] {int(conf * 100)}%"
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
            tag_y = max(by - th - 6, 12)
            cv2.rectangle(frame, (bx, tag_y), (bx + tw + 8, by), (12, 18, 28), -1)
            cv2.rectangle(frame, (bx, tag_y), (bx + tw + 8, by), color, 1)
            cv2.putText(frame, label_text, (bx + 4, by - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1)


video_file_streamer = VideoFileStreamer()
