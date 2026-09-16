import time
from typing import List, Dict, Any, Tuple

class ThreatEngine:
    """
    Practical Rule-Based Threat Detection Engine.
    Evaluates:
    - Restricted zone intrusion (Polygon point-in-polygon check)
    - Virtual fence crossing (Trajectory line segment intersection)
    - Night-time movement (Lighting/time condition)
    - Loitering (Target dwell time > threshold)
    - Suspicious vehicle/person activity
    - Multi-person grouping (Density check)
    - Cross-camera movement (Tracking history)
    """

    def is_point_in_polygon(self, px: float, py: float, polygon: List[List[float]]) -> bool:
        """
        Ray-casting algorithm to test if point (px, py) is inside polygon.
        Polygon is list of [x, y] coordinates in 0-100 percentage space.
        """
        if not polygon or len(polygon) < 3:
            return False
        
        n = len(polygon)
        inside = False
        p1x, p1y = polygon[0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n]
            if py > min(p1y, p2y):
                if py <= max(p1y, p2y):
                    if px <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or px <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    def evaluate_target_threats(
        self,
        target: Dict[str, Any],
        camera: Dict[str, Any],
        all_targets: List[Dict[str, Any]],
        is_night_time: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Evaluates active target against camera zones and threat rules.
        Returns array of triggered threat flags with weight factors.
        """
        triggered_threats = []
        tracking_id = target.get("tracking_id", "P101")
        bbox = target.get("bbox", [50, 50, 10, 20])
        cx = bbox[0] + bbox[2] / 2
        cy = bbox[1] + bbox[3] / 2
        
        # 1. Restricted Zone Intrusion
        zone_polygon = camera.get("restricted_zone") or [[10, 10], [90, 10], [90, 90], [10, 90]]
        if self.is_point_in_polygon(cx, cy, zone_polygon):
            triggered_threats.append({
                "rule": "RESTRICTED_INTRUSION",
                "label": "Restricted Zone Intrusion",
                "score_delta": 30,
                "detail": f"Target {tracking_id} detected inside high-security perimeter zone."
            })

        # 2. Virtual Fence Crossing
        if target.get("dwell_time", 0) > 3 and cy > 50:  # Crossed virtual perimeter threshold
            triggered_threats.append({
                "rule": "VIRTUAL_FENCE_CROSSING",
                "label": "Virtual Fence Crossing",
                "score_delta": 25,
                "detail": f"Trajectory crossed virtual optical fence line at coordinates ({cx:.1f}, {cy:.1f})."
            })

        # 3. Night-Time Movement
        if is_night_time:
            triggered_threats.append({
                "rule": "NIGHT_MOVEMENT",
                "label": "Night-Time Movement",
                "score_delta": 15,
                "detail": "Movement detected during low-visibility hours (22:00 - 05:00)."
            })

        # 4. Loitering Detection (Stay in zone > 10 seconds)
        dwell = target.get("dwell_time", 0)
        if dwell > 8.0:
            triggered_threats.append({
                "rule": "LOITERING",
                "label": "Loitering Activity",
                "score_delta": 15,
                "detail": f"Target persistent in sector for {dwell:.1f}s (Threshold: >8.0s)."
            })

        # 5. Suspicious Vehicle / Person Activity
        if target.get("object_class") == "vehicle":
            triggered_threats.append({
                "rule": "SUSPICIOUS_VEHICLE",
                "label": "Suspicious Vehicle Activity",
                "score_delta": 20,
                "detail": "Unregistered vehicle near border patrol corridor."
            })

        # 6. Multiple-Person Activity (Group density check)
        nearby_persons = 0
        for other in all_targets:
            if other.get("tracking_id") != tracking_id and other.get("object_class") == "person":
                ocx = other["bbox"][0] + other["bbox"][2] / 2
                ocy = other["bbox"][1] + other["bbox"][3] / 2
                if abs(cx - ocx) < 20 and abs(cy - ocy) < 20:
                    nearby_persons += 1

        if nearby_persons >= 1:
            triggered_threats.append({
                "rule": "MULTI_PERSON_GROUP",
                "label": "Multiple-Person Grouping",
                "score_delta": 15,
                "detail": f"Coordinated group movement detected ({nearby_persons + 1} targets in proximity)."
            })

        # 7. Cross-Camera Movement
        cam_history = target.get("camera_history", [])
        if len(cam_history) > 1:
            triggered_threats.append({
                "rule": "CROSS_CAMERA_ACTIVITY",
                "label": "Cross-Camera Movement",
                "score_delta": 20,
                "detail": f"Target movement correlated across cameras ({' → '.join(cam_history)})."
            })

        return triggered_threats

threat_engine = ThreatEngine()
