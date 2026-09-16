"""VIRAT Ground Dataset Girder client and annotation parser.

Public Girder REST base: https://data.kitware.com/api/v1
Collection folder:      56f57e748d777f753209bed7
Annotations folder:     56f57e748d777f753209bed8
"""
from __future__ import annotations

import json
import re
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.models.models import (
    VIRAT_EVENT_TYPES,
    VIRAT_EVENT_LABELS,
    Camera,
    Detection,
    Event,
    TrackedObject,
    RiskScore,
    Alert,
    Notification,
)

GIRDER_BASE = "https://data.kitware.com/api/v1"
ANNOTATIONS_FOLDER_ID = "56f57e748d777f753209bed8"
# Official Kitware annotations-and-docs.zip (from VIRAT ground `zipfiles` folder)
ANNOTATIONS_ZIP_ITEM_ID = "67914e81f07d3010406a7d21"
ANNOTATIONS_ZIP_FILE_ID = "67914e81f07d3010406a7d22"

# VIRAT event-type risk weights (determines alert severity)
_EVENT_RISK = {
    8:  30,  # digging
    11: 28,  # entering facility
    12: 20,  # exiting facility
    10: 15,  # running
    9:  18,  # carrying object
    1:  22,  # loading vehicle
    2:  22,  # unloading vehicle
    3:  14,  # trunk open
    4:  14,  # trunk close
    5:  18,  # getting in vehicle
    6:  18,  # getting out vehicle
    7:   5,  # gesturing (low)
}

# Border-area coordinates for VIRAT camera placement
_BORDER_LAT = [31.620, 31.625, 31.630, 31.635, 31.640, 31.645, 31.650]
_BORDER_LNG = [74.872, 74.878, 74.884, 74.890, 74.896, 74.902, 74.908]

_SCENE_NAMES = [
    "Main Gate Corridor",
    "Perimeter Wall B4",
    "Rocky Outpost North",
    "HQ East Entry",
    "Ravi River Channel",
    "HQ Supply Hangar",
    "Fence Line Sector A",
    "Northern Ridge Path",
    "Road Barrier West",
    "Logistics Depot",
]


class ViratClient:
    """Fetches and parses VIRAT annotations from Kitware Girder."""

    def __init__(self, cache_dir: Path, max_clips: int = 3, frame_sample: int = 15):
        self.cache_dir = cache_dir
        self.max_clips = max_clips
        self.frame_sample = frame_sample
        self.client = httpx.Client(
            base_url=GIRDER_BASE,
            timeout=60.0,
            follow_redirects=True,
        )
        self._item_cache: Dict[str, dict] = {}

    # ------------------------------------------------------------------
    # Girder API helpers
    # ------------------------------------------------------------------
    def _list_items(self, folder_id: str, limit: int = 100, offset: int = 0) -> List[dict]:
        resp = self.client.get(
            "/item",
            params={"folderId": folder_id, "limit": limit, "offset": offset},
        )
        resp.raise_for_status()
        return resp.json()

    def _download_item(self, item_id: str, dest: Path) -> str:
        if dest.exists():
            return dest.read_text(errors="replace")
        resp = self.client.get(f"/item/{item_id}/download", timeout=120)
        resp.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.content)
        return resp.content.decode(errors="replace")

    # ------------------------------------------------------------------
    # Parse VIRAT annotation formats
    # ------------------------------------------------------------------
    @staticmethod
    def parse_events(text: str) -> List[dict]:
        """Parse events.txt → list of {event_id, event_type, start_frame, end_frame, frame, x, y, w, h}"""
        events = []
        for line in text.strip().splitlines():
            parts = line.split()
            if len(parts) < 10:
                continue
            try:
                events.append({
                    "event_id": int(parts[0]),
                    "event_type": int(parts[1]),
                    "duration": int(parts[2]),
                    "start_frame": int(parts[3]),
                    "end_frame": int(parts[4]),
                    "frame": int(parts[5]),
                    "x": float(parts[6]),
                    "y": float(parts[7]),
                    "w": float(parts[8]),
                    "h": float(parts[9]),
                })
            except (ValueError, IndexError):
                continue
        return events

    @staticmethod
    def parse_objects(text: str) -> List[dict]:
        """Parse objects.txt → list of {object_id, track_duration, frame, x, y, w, h, object_type}"""
        objects = []
        for line in text.strip().splitlines():
            parts = line.split()
            if len(parts) < 8:
                continue
            try:
                objects.append({
                    "object_id": int(parts[0]),
                    "track_duration": int(parts[1]),
                    "frame": int(parts[2]),
                    "x": float(parts[3]),
                    "y": float(parts[4]),
                    "w": float(parts[5]),
                    "h": float(parts[6]),
                    "object_type": int(parts[7]),
                })
            except (ValueError, IndexError):
                continue
        return objects

    @staticmethod
    def parse_mapping(text: str) -> List[dict]:
        """Parse mapping.txt → list of {event_id, object_ids, start_frame, end_frame}"""
        mappings = []
        for line in text.strip().splitlines():
            parts = line.split()
            if len(parts) < 7:
                continue
            try:
                event_id = int(parts[0])
                object_id = int(parts[1])
                duration = int(parts[2])
                start_frame = int(parts[3])
                end_frame = int(parts[4])
                # Column 5 is object count, columns 6+ are bit-fields
                mappings.append({
                    "event_id": event_id,
                    "object_id": object_id,
                    "duration": duration,
                    "start_frame": start_frame,
                    "end_frame": end_frame,
                })
            except (ValueError, IndexError):
                continue
        return mappings

    # ------------------------------------------------------------------
    # Discover clips from local cache OR Girder
    # ------------------------------------------------------------------
    def discover_local(self) -> List[dict]:
        """Discover clips from already-extracted local annotation files.

        Layout (either is valid):
          <cache_dir>/annotations/VIRAT_S_000001.viratdata.{events,objects,mapping}.txt
          <cache_dir>/virat/annotations/VIRAT_S_000001.viratdata.{events,objects,mapping}.txt
        Returns the same shape as discover_clips() so ingest() is code-path agnostic.
        """
        ann_dir = self.cache_dir / "annotations"
        if not ann_dir.is_dir():
            ann_dir = self.cache_dir / "virat" / "annotations"
        if not ann_dir.is_dir():
            return []
        clip_groups: Dict[str, Dict[str, dict]] = defaultdict(dict)
        for text_file in sorted(ann_dir.glob("VIRAT_S_*.viratdata.*.txt")):
            name = text_file.name
            match = re.match(r"^(VIRAT_S_\d+)(\.viratdata)\.(events|objects|mapping)\.txt$", name)
            if not match:
                continue
            clip_key = match.group(1)
            file_kind = match.group(3)
            clip_groups[clip_key][file_kind] = {
                "_id": f"local:{clip_key}:{file_kind}",
                "path": str(text_file),
            }
        return [{"key": k, "local": True, **v} for k, v in sorted(clip_groups.items())][: self.max_clips]

    def discover_clips(self) -> List[dict]:
        """Return list of clip info dicts with event/object/mapping item IDs."""
        local = self.discover_local()
        if local:
            print(f"[virat] Using {len(local)} locally-extracted annotation clips.")
            return local

        print("[virat] Listing annotation items...")
        all_items = []
        offset = 0
        while True:
            batch = self._list_items(ANNOTATIONS_FOLDER_ID, limit=200, offset=offset)
            if not batch:
                break
            all_items.extend(batch)
            if len(batch) < 200:
                break
            offset += 200
            time.sleep(0.2)

        # Group by clip name: e.g. VIRAT_S_000001.viratdata.events.txt
        clip_groups: Dict[str, Dict[str, dict]] = defaultdict(dict)
        for item in all_items:
            name = item["name"]
            match = re.match(r"^(VIRAT_S_\d+)(\.viratdata)\.(events|objects|mapping)\.txt$", name)
            if match:
                clip_key = match.group(1)
                file_kind = match.group(3)
                clip_groups[clip_key][file_kind] = item
        return [{"key": k, **v} for k, v in sorted(clip_groups.items())][: self.max_clips]

    def _read_annotation_file(self, clip: dict, kind: str) -> Optional[str]:
        """Read an annotation file from the local cache, downloading it if needed."""
        cache_sub = self.cache_dir / clip["key"]
        cached = cache_sub / f"{kind}.txt"
        if cached.exists():
            return cached.read_text(errors="replace")
        if clip.get("local"):
            src = Path(clip[kind]["path"])
            return src.read_text(errors="replace")
        if kind in clip:
            return self._download_item(clip[kind]["_id"], cached)
        return None

    @staticmethod
    def download_annotations(cache_dir: Path, force: bool = False) -> Path:
        """Download + extract the official Kitware annotations-and-docs.zip.

        Mirrors the ZIP-83 / release-2.0 layout used by the UMBC VIRAT ground
        dataset. Files land in <cache_dir>/virat/annotations/.
        """
        base = cache_dir / "virat"
        zip_path = base / "annotations-and-docs.zip"
        ann_dir = base / "annotations"
        if not force and zip_path.exists() and any(ann_dir.glob("*.txt")):
            return ann_dir

        import zipfile

        base.mkdir(parents=True, exist_ok=True)
        if not (zip_path.exists() and zip_path.stat().st_size > 1_000_000):
            print("[virat] Downloading Kitware annotations-and-docs.zip ...")
            with httpx.Client(timeout=300, follow_redirects=True) as client:
                resp = client.get(f"{GIRDER_BASE}/file/{ANNOTATIONS_ZIP_FILE_ID}/download")
                resp.raise_for_status()
            zip_path.write_bytes(resp.content)

        ann_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path) as zf:
            for member in zf.namelist():
                name = Path(member).name
                target = None
                if name.startswith("VIRAT_S_") and name.endswith(".txt"):
                    target = ann_dir / name
                elif name in ("README_format_release2.txt", "list_release2.0.txt"):
                    target = ann_dir / name
                if target and zf.getinfo(member).file_size < 100_000_000:
                    target.write_bytes(zf.read(member))
        print(f"[virat] Extracted to {ann_dir} ({len(list(ann_dir.glob('*.txt')))} files).")
        return ann_dir

    # ------------------------------------------------------------------
    # Full ingestion pipeline
    # ------------------------------------------------------------------
    def ingest(self, db_session) -> dict:
        """Download, parse, and insert VIRAT data into the database. Returns counts."""
        counts = {"cameras": 0, "detections": 0, "tracked_objects": 0, "events": 0, "alerts": 0}
        clips = self.discover_clips()
        print(f"[virat] Found {len(clips)} clips; ingesting up to {self.max_clips}")

        # Resolve existing camera codes to avoid duplicates
        existing_codes = {c.code for c in db_session.query(Camera.code).all()}
        clip_idx = 0

        for clip in clips:
            clip_name = clip["key"]  # e.g. VIRAT_S_000001
            camera_code = f"VIRAT-{clip_name[-6:]}"  # VIRAT-000001

            if camera_code in existing_codes:
                clip_idx += 1
                continue

            events_text = objects_text = None

            if "events" in clip:
                events_text = self._read_annotation_file(clip, "events")
            if "objects" in clip:
                objects_text = self._read_annotation_file(clip, "objects")
            time.sleep(0.3)

            # Create Camera record
            lat = _BORDER_LAT[clip_idx % len(_BORDER_LAT)]
            lng = _BORDER_LNG[clip_idx % len(_BORDER_LNG)]
            cam = Camera(
                code=camera_code,
                name=f"VIRAT Scene {clip_name}",
                location_name=_SCENE_NAMES[clip_idx % len(_SCENE_NAMES)],
                latitude=lat,
                longitude=lng,
                status="ONLINE",
                fps=30,
                resolution="1920x1080",
                restricted_zone=[[10, 10], [90, 10], [90, 90], [10, 90]],
                virtual_fence=[[10, 50], [90, 50]],
                source="VIRAT",
                source_id=clip_name,
            )
            db_session.add(cam)
            db_session.flush()  # get cam.id
            counts["cameras"] += 1

            # --- Events from events.txt ---
            if events_text:
                raw_events = self.parse_events(events_text)
                # Deduplicate: group by (event_id, event_type) and take first sample
                seen_events: Dict[Tuple[int, int], dict] = {}
                for ev in raw_events:
                    key = (ev["event_id"], ev["event_type"])
                    if key not in seen_events:
                        seen_events[key] = ev

                for ev_id, ev in seen_events.items():
                    event_type_num = ev["event_type"]
                    event_type_label = VIRAT_EVENT_TYPES.get(event_type_num, f"UNKNOWN_{event_type_num}")
                    title_label = VIRAT_EVENT_LABELS.get(event_type_num, f"Activity #{event_type_num}")
                    track_id = f"{camera_code}-E{ev['event_id']}"

                    # Risk assessment
                    score_delta = _EVENT_RISK.get(event_type_num, 10)
                    night_bonus = 15  # VIRAT has mostly nighttime clips
                    total_score = min(100, score_delta + night_bonus)
                    if total_score >= 81:
                        risk_level = "CRITICAL"
                    elif total_score >= 61:
                        risk_level = "HIGH"
                    elif total_score >= 31:
                        risk_level = "MEDIUM"
                    else:
                        risk_level = "LOW"

                    reasons = [
                        f"VIRAT annotation: {title_label} (+{score_delta})",
                        "Night-time activity (+15)",
                    ]

                    db_event = Event(
                        camera_id=cam.id,
                        camera_code=camera_code,
                        title=f"[VIRAT] {title_label} - {clip_name}",
                        event_type=event_type_label,
                        tracking_id=track_id,
                        object_type="person",
                        risk_score=total_score,
                        risk_level=risk_level,
                        details={"reasons": reasons, "virat_event_id": ev_id, "frame_range": [ev["start_frame"], ev["end_frame"]]},
                        source="VIRAT",
                        source_event_id=str(ev_id),
                    )
                    db_session.add(db_event)
                    db_session.flush()
                    counts["events"] += 1

                    # Risk score audit trail
                    rs = RiskScore(
                        event_id=db_event.id,
                        total_score=total_score,
                        risk_level=risk_level,
                        reasons=reasons,
                    )
                    db_session.add(rs)

                    # Alert for HIGH or CRITICAL events
                    if total_score >= 61:
                        alert = Alert(
                            event_id=db_event.id,
                            camera_id=cam.id,
                            camera_code=camera_code,
                            tracking_id=track_id,
                            title=f"ALERT: {title_label} - {clip_name}",
                            risk_score=total_score,
                            risk_level=risk_level,
                            status="NEW",
                            assigned_operator="System-Auto",
                        )
                        db_session.add(alert)
                        db_session.flush()
                        counts["alerts"] += 1

                        # Simulated notification
                        notif = Notification(
                            event_id=db_event.id,
                            channel="IN_APP",
                            recipient="SECURITY_OPERATORS_GROUP",
                            title=f"[VIRAT] {risk_level}: {title_label}",
                            message=f"Camera {camera_code} detected activity at frame {ev['frame']}: {title_label} ({risk_level}, score={total_score})",
                            status="SIMULATED",
                        )
                        db_session.add(notif)

            # --- Objects (detections + tracked objects) from objects.txt ---
            if objects_text:
                raw_objects = self.parse_objects(objects_text)
                seen_tracks: Dict[int, dict] = {}
                for obj in raw_objects:
                    oid = obj["object_id"]
                    if oid not in seen_tracks:
                        seen_tracks[oid] = {
                            "object_id": oid,
                            "object_type": obj["object_type"],
                            "first_frame": obj["frame"],
                            "last_frame": obj["frame"],
                            "sample_frames": [],
                        }
                    track = seen_tracks[oid]
                    track["last_frame"] = max(track["last_frame"], obj["frame"])
                    if len(track["sample_frames"]) < 50:
                        track["sample_frames"].append(obj)

                # Create TrackedObject for each unique object
                obj_type_map = {1: "person", 2: "vehicle", 3: "vehicle", 4: "object", 5: "vehicle"}
                obj_type_names = {1: "person", 2: "car", 3: "vehicle", 4: "unknown_object", 5: "bicycle"}

                for oid, track in seen_tracks.items():
                    tid = f"{camera_code}-O{oid}"
                    obj_class = obj_type_map.get(track["object_type"], "object")
                    track_code = camera_code
                    to = TrackedObject(
                        tracking_id=tid,
                        object_class=obj_class,
                        camera_history=[track_code],
                        current_camera_code=track_code,
                        risk_level="LOW",
                        status="ACTIVE",
                        source="VIRAT",
                    )
                    db_session.add(to)
                    counts["tracked_objects"] += 1

                    # Sample detection frames
                    for sample in track["sample_frames"]:
                        det = Detection(
                            camera_id=cam.id,
                            tracking_id=tid,
                            object_class=obj_class,
                            confidence=0.85,
                            bbox=[
                                sample["x"] / 19.2,
                                sample["y"] / 10.8,
                                sample["w"] / 19.2,
                                sample["h"] / 10.8,
                            ],
                            frame=sample["frame"],
                            source="VIRAT",
                        )
                        db_session.add(det)
                        counts["detections"] += 1

            db_session.flush()
            clip_idx += 1
            time.sleep(0.2)

        db_session.commit()
        print(f"[virat] Ingestion complete: {counts}")
        return counts


def ingest_virat(db_session, cache_dir: Path, max_clips: int = 3, frame_sample: int = 15) -> dict:
    """Convenience wrapper."""
    client = ViratClient(cache_dir=cache_dir, max_clips=max_clips, frame_sample=frame_sample)
    return client.ingest(db_session)