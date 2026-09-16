import time
import math
from typing import List, Dict, Any, Optional

class CentroidTracker:
    """
    Persistent Multi-Target Tracker (ByteTrack / IoU / Centroid logic).
    Maintains target trajectories, dwell times, and persistent IDs across frames.
    """
    def __init__(self, max_disappeared: int = 30):
        self.next_person_id = 101
        self.next_vehicle_id = 201
        self.objects = {}  # tracking_id -> dict
        self.disappeared = {}  # tracking_id -> frame_count
        self.max_disappeared = max_disappeared

    def register(self, object_class: str, bbox: List[float], camera_code: str) -> str:
        if object_class == "vehicle":
            tracking_id = f"V{self.next_vehicle_id}"
            self.next_vehicle_id += 1
        else:
            tracking_id = f"P{self.next_person_id}"
            self.next_person_id += 1

        cx = bbox[0] + bbox[2] / 2
        cy = bbox[1] + bbox[3] / 2

        now = time.time()
        self.objects[tracking_id] = {
            "tracking_id": tracking_id,
            "object_class": object_class,
            "bbox": bbox,
            "centroid": (cx, cy),
            "first_seen": now,
            "last_seen": now,
            "camera_history": [camera_code],
            "current_camera": camera_code,
            "positions_history": [(cx, cy, now)],
            "dwell_time": 0.0
        }
        self.disappeared[tracking_id] = 0
        return tracking_id

    def update(self, detections: List[Dict[str, Any]], camera_code: str) -> List[Dict[str, Any]]:
        """
        Updates target states with new frame detections.
        """
        now = time.time()
        
        # If no objects currently tracked, register all incoming detections
        if len(self.objects) == 0:
            for det in detections:
                tid = self.register(det["object_class"], det["bbox"], camera_code)
                det["tracking_id"] = tid
            return list(self.objects.values())

        # Match existing objects using centroid distance
        updated_objects = []
        for det in detections:
            bbox = det["bbox"]
            cx = bbox[0] + bbox[2] / 2
            cy = bbox[1] + bbox[3] / 2
            
            best_match_id = None
            min_dist = float("inf")

            for tid, obj in self.objects.items():
                if obj["object_class"] == det["object_class"]:
                    ocx, ocy = obj["centroid"]
                    dist = math.hypot(cx - ocx, cy - ocy)
                    if dist < min_dist and dist < 25.0:  # Distance threshold %
                        min_dist = dist
                        best_match_id = tid

            if best_match_id is not None:
                # Update matched object
                obj = self.objects[best_match_id]
                obj["bbox"] = bbox
                obj["centroid"] = (cx, cy)
                obj["last_seen"] = now
                obj["dwell_time"] = now - obj["first_seen"]
                obj["positions_history"].append((cx, cy, now))
                if len(obj["positions_history"]) > 20:
                    obj["positions_history"].pop(0)
                
                if camera_code not in obj["camera_history"]:
                    obj["camera_history"].append(camera_code)
                obj["current_camera"] = camera_code
                
                det["tracking_id"] = best_match_id
                self.disappeared[best_match_id] = 0
            else:
                # Register new object
                tid = self.register(det["object_class"], bbox, camera_code)
                det["tracking_id"] = tid

        return list(self.objects.values())

tracker = CentroidTracker()
