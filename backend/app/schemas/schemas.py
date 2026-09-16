from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr
from datetime import datetime


# --- Auth Schemas ---
class UserLogin(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "OPERATOR"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# --- Camera Schemas ---
class CameraOut(BaseModel):
    id: int
    code: str
    name: str
    location_name: str
    latitude: float
    longitude: float
    status: str
    stream_url: Optional[str] = None
    fps: int
    resolution: str
    restricted_zone: Optional[List[List[float]]] = None
    virtual_fence: Optional[List[List[float]]] = None
    source: str = "SEEDED"

    class Config:
        from_attributes = True


class CameraCreate(BaseModel):
    code: str
    name: str
    location_name: str
    latitude: float
    longitude: float
    status: str = "ONLINE"
    fps: int = 30
    resolution: str = "1920x1080"
    restricted_zone: Optional[List[List[float]]] = None
    virtual_fence: Optional[List[List[float]]] = None


# --- Detection & Tracking Schemas ---
class DetectionOut(BaseModel):
    id: int
    camera_id: int
    tracking_id: str
    object_class: str
    confidence: float
    bbox: List[float]
    frame: int = 0
    timestamp: datetime

    class Config:
        from_attributes = True


class TrackedObjectOut(BaseModel):
    id: int
    tracking_id: str
    object_class: str
    first_seen: datetime
    last_seen: datetime
    camera_history: List[str]
    current_camera_code: Optional[str]
    risk_level: str
    status: str
    source: str = "SEEDED"

    class Config:
        from_attributes = True


# --- Vehicle & ANPR Schemas ---
class PlateOut(BaseModel):
    id: int
    plate_number: str
    camera_code: str
    confidence: float
    is_wanted: bool
    vehicle_type: str
    crop_image_url: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class VehicleOut(BaseModel):
    id: int
    tracking_id: str
    make_model: Optional[str]
    color: Optional[str]
    plate_number: Optional[str]
    confidence: float
    detected_at: datetime

    class Config:
        from_attributes = True


# --- Event & Risk Schemas ---
class EventOut(BaseModel):
    id: int
    camera_id: int
    camera_code: str
    title: str
    event_type: str
    tracking_id: Optional[str]
    object_type: str
    risk_score: int
    risk_level: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
    source: str = "SEEDED"

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    event_id: int
    camera_id: int
    camera_code: str
    tracking_id: Optional[str]
    title: str
    risk_score: int
    risk_level: str
    status: str
    created_at: datetime
    updated_at: datetime
    assigned_operator: Optional[str]
    event: Optional[EventOut] = None

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    status: str  # UNDER_REVIEW, VERIFIED, FALSE_POSITIVE, ACTION_REQUIRED, RESOLVED
    notes: Optional[str] = None


class NotificationOut(BaseModel):
    id: int
    event_id: Optional[int] = None
    channel: str
    recipient: str
    title: str
    message: str
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


class IncidentActionCreate(BaseModel):
    action_type: str  # DISPATCH_PATROL, MONITOR_CAMERA, ESCALATE, MARK_AREA
    notes: Optional[str] = None


class IncidentActionOut(BaseModel):
    id: int
    alert_id: int
    action_type: str
    performed_by: str
    notes: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class AnalyticsSummaryOut(BaseModel):
    active_cameras: int
    active_threats: int
    critical_alerts: int
    persons_detected: int
    vehicles_detected: int
    events_today: int
    threats_by_type: Dict[str, int]
    hourly_events: List[Dict[str, Any]]
    risk_distribution: Dict[str, int]

    class Config:
        from_attributes = True


class SeedingStatus(BaseModel):
    status: str
    cameras: int
    detections: int
    tracked_objects: int
    events: int
    alerts: int
    motors: Dict[str, Dict[str, int]] = {}