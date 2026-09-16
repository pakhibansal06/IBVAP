from typing import List, Dict, Any

class CrossCameraCorrelator:
    """
    Cross-Camera Correlation Engine:
    Tracks target paths as objects transition across simulated cameras.
    Produces path logs like: "CAM-01 → CAM-02 → CAM-04"
    """

    def __init__(self):
        self.target_paths = {}  # tracking_id -> list of dicts {camera_code, timestamp, lat, lng}

    def record_sighting(self, tracking_id: str, camera_code: str, lat: float, lng: float, timestamp: str) -> List[str]:
        """
        Records camera sighting and updates movement path.
        """
        if tracking_id not in self.target_paths:
            self.target_paths[tracking_id] = []
        
        path = self.target_paths[tracking_id]
        if not path or path[-1]["camera_code"] != camera_code:
            path.append({
                "camera_code": camera_code,
                "timestamp": timestamp,
                "lat": lat,
                "lng": lng
            })
        
        return [step["camera_code"] for step in path]

    def get_path_summary(self, tracking_id: str) -> str:
        if tracking_id not in self.target_paths:
            return "CAM-01"
        cams = [step["camera_code"] for step in self.target_paths[tracking_id]]
        return " → ".join(cams)

cross_camera = CrossCameraCorrelator()
