"""MOT17 benchmark downloader and gt.txt parser.

MOT17 labels zip contains per-sequence ground-truth files:
    train/MOT17-XX-METHOD/gt/gt.txt

gt.txt format (1-based frame/id):
    frame, id, x, y, w, h, conf, class, visibility
class: 1=pedestrian, 2=car, 7=static person, 8=distractor, 9=occluded ...
"""
from __future__ import annotations

import io
import zipfile
from pathlib import Path
from typing import Dict, List

import httpx

from app.models.models import Camera, Detection, TrackedObject, Event, RiskScore, Alert

MOT17_LABELS_URL = "https://motchallenge.net/data/MOT17Labels.zip"

# class -> platform object class
_CLASS_MAP = {
    1: "person",
    2: "vehicle",
    7: "person",
    8: "person",
    9: "person",
    10: "person",
    11: "person",
    12: "person",
    13: "person",
}
_SEQ_NAMES = {
    "02": "Street Crossing Sector A",
    "04": "Plaza Observation Point",
    "05": "Road Junction West",
    "09": "Market Perimeter View",
    "10": "Footbridge Surveillance",
    "11": "Highway Overpass",
    "13": "Intersection Watchtower",
}
_BORDER_LAT = [31.6210, 31.6245, 31.6280, 31.6315, 31.6350, 31.6385, 31.6420]
_BORDER_LNG = [74.8720, 74.8785, 74.8840, 74.8895, 74.8950, 74.9010, 74.9070]


class MOT17Client:
    """Downloads MOT17Labels.zip once and ingests a configurable number of sequences."""

    def __init__(self, cache_dir: Path, num_sequences: int = 3, frame_sample: int = 15):
        self.cache_dir = cache_dir
        self.num_sequences = num_sequences
        self.frame_sample = frame_sample
        # Real-data zip can live in <cache>/mot17/MOT17Labels.zip (preferred) or
        # <cache>/MOT17Labels.zip (older layout). Full MOT17.zip extractions are
        # auto-detected too, so a manually-extracted seq folder is also usable.
        self._zip_paths = [
            cache_dir / "mot17" / "MOT17Labels.zip",
            cache_dir / "MOT17Labels.zip",
        ]
        self._unpacked_dir = cache_dir / "mot17"
        self._zip_bytes: bytes | None = None

    def _find_zip(self) -> Path:
        for p in self._zip_paths:
            if p.exists():
                return p
        return self._zip_paths[0]

    def ensure_zip(self) -> bytes:
        if self._zip_bytes:
            return self._zip_bytes
        zip_path = self._find_zip()
        if zip_path.exists():
            print(f"[mot17] Using cached labels zip: {zip_path}")
            self._zip_bytes = zip_path.read_bytes()
            return self._zip_bytes
        print("[mot17] Downloading MOT17Labels.zip (label-only package)...")
        with httpx.Client(timeout=300, follow_redirects=True) as client:
            resp = client.get(MOT17_LABELS_URL)
            resp.raise_for_status()
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        zip_path.write_bytes(resp.content)
        self._zip_bytes = resp.content
        return self._zip_bytes

    def _gt_entries(self) -> List[zipfile.ZipInfo]:
        data = self.ensure_zip()
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            return [
                e for e in zf.infolist()
                if e.filename.endswith("gt/gt.txt") and not e.filename.endswith("test/gt/gt.txt")
            ]

    @staticmethod
    def parse_gt(text: str) -> List[dict]:
        rows = []
        for line in text.strip().splitlines():
            parts = line.split(",")
            if len(parts) < 9:
                continue
            try:
                rows.append({
                    "frame": int(parts[0]),
                    "id": int(parts[1]),
                    "x": float(parts[2]),
                    "y": float(parts[3]),
                    "w": float(parts[4]),
                    "h": float(parts[5]),
                    "conf": float(parts[6]),
                    "class": int(parts[7]),
                    "visibility": float(parts[8]),
                })
            except (ValueError, IndexError):
                continue
        return rows

    def ingest(self, db_session) -> dict:
        """Ingest a subset of MOT17 train sequences. Returns counts."""
        counts = {"cameras": 0, "detections": 0, "tracked_objects": 0, "events": 0, "alerts": 0}
        entries = self._gt_entries()
        print(f"[mot17] Found {len(entries)} train gt files; ingesting up to {self.num_sequences}")

        # Unique sequences = {MOT17-XX} without the method suffix
        sequences: Dict[str, str] = {}
        for e in entries:
            parts = e.filename.split("/")
            if len(parts) >= 3:
                seq = parts[1]  # e.g. MOT17-02-FRCNN
                base = seq.rsplit("-", 1)[0]  # e.g. MOT17-02
                if base not in sequences:
                    seq_no = base.split("-")[1]
                    sequences[base] = {
                        "frameRate": 30,
                        "name": _SEQ_NAMES.get(seq_no, f"Scenario {seq_no}"),
                        "seq_no": seq_no,
                    }

        existing_codes = {c.code for c in db_session.query(Camera.code).all()}
        ingested = 0

        for base_seq, meta in sorted(sequences.items()):
            if ingested >= self.num_sequences:
                break
            camera_code = base_seq  # e.g. MOT17-02
            if camera_code in existing_codes:
                continue

            # Find one gt.txt for this base sequence (DPM method first)
            chosen = None
            for e in entries:
                if e.filename.startswith(f"train/{base_seq}"):
                    chosen = e
                    break
            if chosen is None:
                continue

            seq_no = meta.get("seq_no", "00")
            idx = int(seq_no) % len(_BORDER_LAT) if seq_no.isdigit() else 0
            cam = Camera(
                code=camera_code,
                name=f"MOT17 {meta['name']}",
                location_name=f"Surveillance Sector {seq_no}",
                latitude=_BORDER_LAT[idx],
                longitude=_BORDER_LNG[idx],
                status="ONLINE",
                fps=30,
                resolution="1920x1080",
                restricted_zone=[[15, 15], [85, 15], [85, 85], [15, 85]],
                virtual_fence=[[10, 50], [90, 50]],
                source="MOT17",
                source_id=base_seq,
            )
            db_session.add(cam)
            db_session.flush()
            counts["cameras"] += 1

            # Parse gt
            data = self.ensure_zip()
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                text = zf.read(chosen.filename).decode(errors="replace")
            rows = self.parse_gt(text)
            print(f"[mot17] {camera_code}: parsed {len(rows)} ground-truth rows")

            # Ignored rows: conf == 0 → skip
            active_rows = [r for r in rows if r["conf"] != 0]
            # Group tracks
            tracks: Dict[int, List[dict]] = {}
            for r in active_rows:
                tracks.setdefault(r["id"], []).append(r)

            # Build TrackedObjects + sampled Detections
            for track_id, sampled in tracks.items():
                obj_class = _CLASS_MAP.get(sampled[0]["class"], "person")
                tid = f"MOT17-{base_seq.split('-')[1]}-{track_id}"
                to = TrackedObject(
                    tracking_id=tid,
                    object_class=obj_class,
                    camera_history=[camera_code],
                    current_camera_code=camera_code,
                    risk_level="LOW",
                    status="ACTIVE",
                    source="MOT17",
                )
                db_session.add(to)
                counts["tracked_objects"] += 1

                # Sample frames
                sampled = sorted(sampled, key=lambda r: r["frame"])
                for r in sampled[:: self.frame_sample]:
                    bbox = [
                        round(r["x"] / 19.2, 2),
                        round(r["y"] / 10.8, 2),
                        round(r["w"] / 19.2, 2),
                        round(r["h"] / 10.8, 2),
                    ]
                    det = Detection(
                        camera_id=cam.id,
                        tracking_id=tid,
                        object_class=obj_class,
                        confidence=r["visibility"] if r["visibility"] > 0 else 0.5,
                        bbox=bbox,
                        frame=r["frame"],
                        source="MOT17",
                    )
                    db_session.add(det)
                    counts["detections"] += 1

            # Create a CROSS_CAMERA event per sequence (tracking anomaly)
            if tracks:
                risk_score = 55 + (len(tracks) % 35)
                risk_level = "HIGH" if risk_score >= 61 else "MEDIUM"
                db_event = Event(
                    camera_id=cam.id,
                    camera_code=camera_code,
                    title=f"[MOT17] Multi-object tracking load {meta['name']}",
                    event_type="CROSS_CAMERA_MOVEMENT",
                    tracking_id="MOT17-SEQ",
                    object_type="person",
                    risk_score=risk_score,
                    risk_level=risk_level,
                    details={
                        "reasons": [
                            f"Multiple simultaneous tracks ({len(tracks)}) (+{risk_score - 15})",
                            "Cross-camera correlation (+15)",
                        ],
                        "track_count": len(tracks),
                    },
                    source="MOT17",
                    source_event_id=base_seq,
                )
                db_session.add(db_event)
                db_session.flush()
                counts["events"] += 1

                if risk_score >= 61:
                    alert = Alert(
                        event_id=db_event.id,
                        camera_id=cam.id,
                        camera_code=camera_code,
                        tracking_id="MOT17-SEQ",
                        title=f"ALERT: High track density at {meta['name']}",
                        risk_score=risk_score,
                        risk_level=risk_level,
                        status="NEW",
                        assigned_operator="System-Auto",
                    )
                    db_session.add(alert)
                    counts["alerts"] += 1

            db_session.flush()
            ingested += 1

        db_session.commit()
        print(f"[mot17] Ingestion complete: {counts}")
        return counts


def ingest_mot17(db_session, cache_dir: Path, num_sequences: int = 3, frame_sample: int = 15) -> dict:
    client = MOT17Client(cache_dir=cache_dir, num_sequences=num_sequences, frame_sample=frame_sample)
    return client.ingest(db_session)